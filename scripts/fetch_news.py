#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
定时抓取热点动态，生成 data/news.json 供网站直接读取（同源、无跨域问题）。
由 GitHub Actions 定时调用；也可本地 python fetch_news.py 生成种子文件。
数据源：
- uapis.cn/api/v1/misc/hotboard（免费，微博/知乎/抖音/小红书/B站等 40+ 平台热榜）
- xxapi.cn（免费备用：微博/抖音/百度/B站热搜）
- 60s.viki.moe/v2/60s（每日 60 秒权威早报，需带 /v2）
本地新闻：默认免 Key —— Bing 新闻 RSS（真实实时）；可选 JUHE_KEY 增强。
"""
import json
import os
import datetime
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE = "https://60s.viki.moe/v2"
UAPIS = "https://uapis.cn/api/v1/misc/hotboard"
XXAPI = "https://v2.xxapi.cn/api"


def get(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def fmt_hot(v):
    try:
        n = float(v)
        if n >= 10000:
            s = "%.1f" % (n / 10000)
            return s.rstrip("0").rstrip(".") + "万"
        return str(int(n))
    except Exception:
        return str(v) if v else ""


def uapis_social(platform, label):
    """uapis.cn 全网热榜（免费，主源）：微博/知乎/抖音/小红书/B站等。"""
    try:
        j = get(UAPIS + "?type=" + platform)
        items = []
        for it in (j.get("list") or [])[:15]:
            title = it.get("title", "")
            if not title:
                continue
            url = it.get("url") or ("https://www.baidu.com/s?wd=" + urllib.parse.quote(title))
            items.append({"title": title, "url": url, "hot": fmt_hot(it.get("hot_value") or it.get("hot") or "")})
        return {"label": label, "items": items}
    except Exception as e:
        return {"label": label, "items": [], "error": str(e)}


def xxapi_social(ep, label):
    """xxapi 免费热搜（备用源）：weibohot/douyinhot/baiduhot/bilibilihot。"""
    try:
        j = get(XXAPI + "/" + ep)
        data = j.get("data") or []
        items = []
        for it in data[:15]:
            if isinstance(it, str):
                items.append({"title": it, "url": "https://www.baidu.com/s?wd=" + urllib.parse.quote(it), "hot": ""})
            else:
                title = it.get("title", "")
                if not title:
                    continue
                url = it.get("url") or ("https://www.baidu.com/s?wd=" + urllib.parse.quote(title))
                items.append({"title": title, "url": url, "hot": fmt_hot(it.get("hot") or "")})
        return {"label": label, "items": items}
    except Exception as e:
        return {"label": label, "items": [], "error": str(e)}


def social_fallback(platform, label, uapis_platform, xxapi_ep):
    """主源 uapis → 备用 xxapi → 空。"""
    r = uapis_social(uapis_platform, label)
    if r["items"]:
        return r
    r2 = xxapi_social(xxapi_ep, label)
    if r2["items"]:
        return r2
    return {"label": label, "items": [], "error": "both sources down"}


def auth():
    try:
        j = get(BASE + "/60s")
        d = j.get("data", {})
        items = [{"title": t,
                  "url": "https://www.baidu.com/s?wd=" + urllib.parse.quote(t),
                  "hot": ""} for t in (d.get("news") or [])]
        return {"label": "新华社早报", "date": d.get("date", ""), "tip": d.get("tip", ""), "items": items}
    except Exception as e:
        return {"label": "新华社早报", "items": [], "error": str(e)}


def bing_local(city, label):
    """免 Key 本地新闻：Bing 新闻 RSS（服务端抓取，跨域友好，已验证可用）。"""
    try:
        u = "https://www.bing.com/news/search?q=" + urllib.parse.quote(city) + "&format=rss"
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/rss+xml"})
        d = urllib.request.urlopen(req, timeout=15).read()
        rss = ET.fromstring(d)
        out = []
        for it in rss.findall(".//item")[:15]:
            t = (it.findtext("title") or "").strip()
            l = (it.findtext("link") or it.findtext("url") or "").strip()
            if t:
                out.append({"title": t,
                             "url": l or ("https://www.baidu.com/s?wd=" + urllib.parse.quote(t)),
                             "hot": "", "source": "本地新闻"})
        return out
    except Exception as e:
        return []


def local_news(city, label, key, pool):
    """本地新闻：默认免 Key（Bing 新闻 RSS，真实、实时）；可选 JUHE_KEY 增强为地方媒体新闻。"""
    items = []
    # 1) 可选增强：聚合数据「地区新闻」（需 JUHE_KEY），真实地方媒体，置顶展示
    if key:
        try:
            url = ("https://apis.juhe.cn/fapigx/areanews/query?key=" +
                   urllib.parse.quote(key) + "&areaname=" + urllib.parse.quote(city))
            j = get(url)
            if not j.get("error_code"):
                box = j.get("result") or j.get("data") or {}
                arr = box.get("news") or box.get("data") or box.get("list") or []
                for it in arr[:15]:
                    t = it.get("title") or it.get("name") or ""
                    u = it.get("url") or it.get("link") or ("https://www.baidu.com/s?wd=" + urllib.parse.quote(t))
                    items.append({"title": t, "url": u, "hot": "", "source": "本地媒体"})
        except Exception:
            pass
    # 2) 免 Key 主方案：Bing 新闻 RSS（已验证，实时、无需密钥）
    items += bing_local(city, label)
    # 3) 兜底：多平台热榜里含城市名的动态
    for it in pool:
        if city in it.get("title", ""):
            items.append({"title": it.get("title", ""), "url": it.get("url", ""),
                          "hot": it.get("hot", ""), "source": it.get("source", "")})
    # 去重保序
    seen, uniq = set(), []
    for it in items:
        if it["title"] in seen:
            continue
        seen.add(it["title"]); uniq.append(it)
    return {"label": label, "items": uniq[:15], "keyfree": not bool(key)}


def main():
    sources = {}
    sources["auth"] = auth()
    sources["weibo"] = social_fallback("微博热搜", "微博热搜", "weibo", "weibohot")
    sources["douyin"] = social_fallback("抖音热榜", "抖音热榜", "douyin", "douyinhot")
    sources["zhihu"] = social_fallback("知乎热榜", "知乎热榜", "zhihu", "zhihuhot")
    sources["xhs"] = uapis_social("xiaohongshu", "小红书")

    # 汇总多平台热榜，供本地新闻按城市名筛选（免 Key）
    pool = []
    for sid in ["auth", "weibo", "douyin", "zhihu", "xhs"]:
        s = sources.get(sid) or {}
        for it in s.get("items", []):
            pool.append({"title": it.get("title", ""), "url": it.get("url", ""),
                         "hot": it.get("hot", ""), "source": s.get("label", "")})

    key = os.environ.get("JUHE_KEY", "").strip()
    sources["shenzhen"] = local_news("深圳", "深圳本地", key, pool)
    sources["chengdu"] = local_news("成都", "成都本地", key, pool)

    out = {"updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "sources": sources}
    os.makedirs("data", exist_ok=True)
    with open("data/news.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("written data/news.json:", {k: len(v.get("items", [])) for k, v in sources.items()})


if __name__ == "__main__":
    main()
