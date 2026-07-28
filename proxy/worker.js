// Cloudflare Worker：代理聚合数据「地区新闻」
// 作用：① 把 Juhe Key 藏在服务端环境变量，不暴露给前端；② 补 Access-Control-Allow-Origin，浏览器才能跨域拿到数据
//
// 部署步骤（免费，无需绑卡）：
//   1. 安装 wrangler：  npm i -g wrangler
//   2. 登录：            wrangler login
//   3. 设置密钥：        wrangler secret put JUHE_KEY        （粘贴你的聚合数据 Key）
//   4. 部署：            wrangler deploy
//   5. 把返回的地址（https://local-news-proxy.<你>.workers.dev）填到网站 config.js 的 news.local.proxy
//
// 前端调用：  https://<你的worker>.workers.dev/?city=深圳

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const city = (url.searchParams.get("city") || "深圳").slice(0, 20);

    // 预检请求（CORS preflight）
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const juhe =
      "https://apis.juhe.cn/fapigx/areanews/query?key=" +
      encodeURIComponent(env.JUHE_KEY || "") +
      "&areaname=" +
      encodeURIComponent(city);

    try {
      const resp = await fetch(juhe, { headers: { "User-Agent": "Mozilla/5.0" } });
      const text = await resp.text();
      return new Response(text, {
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=600" // 缓存 10 分钟，省额度
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "proxy_failed", msg: String(e) }), {
        status: 502,
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }

    function corsHeaders() {
      return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin"
      };
    }
  }
};
