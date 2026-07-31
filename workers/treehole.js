// ============================================================
// 树洞 AI 转发代理（Cloudflare Worker）
// 用途：把「前端页面 → 大模型 API」的请求经这层转发，
//       避免 API Key 暴露在静态网页里。
// ============================================================
// 部署方法（5 分钟，免费）：
//   1. 注册 Cloudflare 账号 → 打开 https://dash.cloudflare.com
//   2. 左侧 Workers 和 Pages → 创建应用程序 → 创建 Worker → 取个名字（如 treehole）
//   3. 把本文件内容整个粘贴进 Worker 编辑器，点「保存并部署」
//   4. 设置环境变量：Worker 设置 → 变量 → 添加
//        AI_KEY   = 你的智谱/DeepSeek API Key
//        AI_BASE  = https://open.bigmodel.cn/api/paas/v4/chat/completions
//                   （DeepSeek 用 https://api.deepseek.com/chat/completions）
//        AI_MODEL = glm-4-flash （DeepSeek 用 deepseek-chat）
//   5. 部署后得到 https://treehole.你的子域.workers.dev
//   6. 把该地址填到 config.js 的 treeHole.aiEndpoint，末尾记得加 /chat
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 只允许 /chat 路径的 POST
    if (url.pathname !== "/chat" || request.method !== "POST") {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    // 读取前端发来的内容
    let body;
    try { body = await request.json(); } catch (e) {
      return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const msg = (body.message || "").toString().slice(0, 2000);
    if (!msg) {
      return new Response(JSON.stringify({ error: "empty message" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const sysPrompt = "你是一个温柔体贴的树洞精灵。用户会把烦恼、心事、吐槽告诉你，请用温暖、俏皮、简短的语气回应（50字以内），像一个很懂她的姐姐。可以带一两个网络梗，但不要油腻。不要反问太多，先接住她的情绪。";

    try {
      const resp = await fetch(env.AI_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + env.AI_KEY
        },
        body: JSON.stringify({
          model: env.AI_MODEL,
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: msg }
          ],
          max_tokens: 300
        })
      });
      const data = await resp.json();
      const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "树洞听见啦，乖，都会好起来的 ♡";
      return new Response(JSON.stringify({ reply: reply }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "upstream error", reply: "树洞这会儿信号不太好，下次再回你 ♡" }), {
        status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
