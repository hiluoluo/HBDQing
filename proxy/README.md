# 本地新闻代理（Cloudflare Worker）

让网站的「深圳 / 成都本地新闻」能在浏览器里正常加载。

## 为什么要它
聚合数据的地区新闻接口不允许浏览器跨域直连（没有 CORS 头），而且 Key 写在前端会被人盗刷额度。
这个 Worker 把 Key 藏在服务端、补上 CORS 头再回传，问题就解决了。

## 部署（免费，无需绑卡）
1. 安装 wrangler：`npm i -g wrangler`
2. 登录：`wrangler login`
3. 设密钥：`wrangler secret put JUHE_KEY`（粘贴你在 juhe.cn 申请的 Key）
4. 部署：`wrangler deploy`
5. 把返回的 `https://xxx.workers.dev` 地址填进网站 `config.js` 的 `news.local.proxy`

## 调用
前端请求：`https://<你的worker>.workers.dev/?city=深圳`
