#!/usr/bin/env python3
# 每天 0 点（北京）由 GitHub Actions 调用：抓取一篇大学生水平以上的英文短文（~200 词），
# 写入 data/english.json（网页端直接读缓存，关站也照常更新，无需任何密钥）。
import json, re, sys, urllib.request, xml.etree.ElementTree as ET
from datetime import date

FEEDS = [
    ("BBC World",        "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("NPR",              "https://feeds.npr.org/1001/rss.xml"),
    ("The Guardian",     "https://www.theguardian.com/world/rss"),
    ("Al Jazeera",       "https://www.aljazeera.com/xml/rss/all.xml"),
]

UA = {"User-Agent": "Mozilla/5.0 (compatible; DailyEnglishBot/1.0)"}

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")

def clean(html):
    if not html:
        return ""
    t = TAG_RE.sub(" ", html)
    t = t.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " ")
    t = WS_RE.sub(" ", t).strip()
    return t

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "ignore")

def collect():
    items = []
    for name, url in FEEDS:
        try:
            raw = fetch(url)
        except Exception as e:
            print("feed failed:", name, e, file=sys.stderr)
            continue
        try:
            root = ET.fromstring(raw)
        except Exception as e:
            print("parse failed:", name, e, file=sys.stderr)
            continue
        for it in root.iter("item"):
            title = (it.findtext("title") or "").strip()
            link = (it.findtext("link") or "").strip()
            desc = it.findtext("description") or ""
            # 有些源把正文放在 content:encoded
            eng = it.find("{http://purl.org/rss/1.0/modules/content/}encoded")
            body = clean(eng.text) if eng is not None and eng.text else clean(desc)
            if not title or len(body.split()) < 120:
                continue
            items.append({"source": name, "title": title, "en": body, "url": link})
    return items

def main():
    items = collect()
    if not items:
        print("no items collected, keep existing file", file=sys.stderr)
        return
    # 按日期稳定挑选（同一天结果一致，跨天不同）
    d = date.today()
    seed = d.toordinal()
    chosen = items[seed % len(items)]
    words = chosen["en"].split()
    # 截断到约 200 词，必要时在句尾截断
    if len(words) > 210:
        words = words[:210]
        tail = " ".join(words)
        cut = tail.rfind(".")
        if cut and cut > 80:
            tail = tail[:cut + 1]
        chosen["en"] = tail + " …"
    else:
        chosen["en"] = " ".join(words)
    chosen["date"] = d.isoformat()
    with open("data/english.json", "w", encoding="utf-8") as f:
        json.dump(chosen, f, ensure_ascii=False, indent=2)
    print("saved:", chosen["source"], "|", chosen["title"][:60], "| words:", len(chosen["en"].split()))

if __name__ == "__main__":
    main()
