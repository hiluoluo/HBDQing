// jsdom 冒烟测试：验证本轮所有改动
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const dir = __dirname;
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");

const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "outside-only",
  pretendToBeVisual: true
});
const { window } = dom;
window.fetch = function () { return Promise.reject(new Error("offline")); };
window.SpeechSynthesisUtterance = function (t) { this.text = t; };
window.speechSynthesis = { cancel(){}, speak(){}, pause(){}, resume(){} };
window.Audio = function () { return { cloneNode(){ return { play(){ return { catch(){} }; } }; }, preload: "" }; };
window.HTMLCanvasElement.prototype.getContext = function(){ return { drawImage(){} }; };

let fail = 0;
function ok(cond, msg) {
  if (cond) console.log("  PASS " + msg);
  else { console.log("  FAIL " + msg); fail++; }
}

console.error("EVAL START");
["config.js", "data/quotes.js", "data/life.js", "app.js"].forEach(function (f) {
  window.eval(fs.readFileSync(path.join(dir, f), "utf8"));
});
console.error("EVAL DONE");
const doc = window.document;

// 看门狗：若 10s 仍未结束，说明卡住（jsdom 计时器保持事件循环存活 / 同步死循环）
setTimeout(function () {
  console.error("WATCHDOG: process still alive after 10s — tests likely done but loop kept alive, or hang");
  process.exit(2);
}, 10000);

console.log("== 1 顶栏待办小方块：点击直接跳转待办 ==");
ok(!doc.getElementById("weather"), "天气元素已移除");
const tab = doc.getElementById("todoTab");
ok(tab, "todoTab 存在");
ok(/待办/.test(doc.getElementById("todoTabText").textContent), "小方块显示待办统计");
ok(!doc.getElementById("todoPop"), "旧弹层已移除（不再被遮挡）");
// 先切走再点 tab，应跳回首页
const newsBtn0 = [...doc.querySelectorAll(".nav-item")].find(b => b.textContent.includes("热点"));
if (newsBtn0) newsBtn0.click();
tab.dispatchEvent(new window.Event("click", { bubbles: true }));
ok(doc.getElementById("panel-home").classList.contains("active"), "点击 tab 跳转到首页待办");
ok(doc.getElementById("homeTodoCard"), "待办卡片有跳转锚点");
ok(/姐姐今天也要开心/.test(doc.getElementById("gift").textContent), "寄语已改为「姐姐今天也要开心」");

console.log("== 2 首页待办 DDL/优先级/超时 ==");
doc.getElementById("homeTodoInput").value = "超时任务";
doc.getElementById("homeTodoDdl").value = "2020-01-01";
doc.getElementById("homeTodoPrio").value = "重要";
doc.getElementById("homeTodoAdd").click();
const li = doc.querySelector("#homeTodoList li");
ok(li && li.classList.contains("overdue"), "超时待办整条标红");
ok(/已超时/.test(li.textContent), "显示已超时文案");
ok(/重要/.test(li.textContent), "显示优先级");
ok(/1.*待办/.test(doc.getElementById("todoTabText").textContent.replace(/\s/g,"")), "顶栏计数同步");

console.log("== 3 侧边栏：生活管理可折叠 + 二级标题 ==");
const lifeHead = [...doc.querySelectorAll(".nav-head")].find(h => h.textContent.includes("生活管理"));
ok(lifeHead && !lifeHead.classList.contains("static"), "生活管理不再是固定分组(可折叠)");
ok(lifeHead && lifeHead.querySelector(".nav-arrow"), "生活管理有三角箭头");
const lifeSub = lifeHead.nextElementSibling;
ok(lifeSub.classList.contains("open") && lifeSub.classList.contains("fixed") === false, "生活管理默认展开但不是固定组");
lifeHead.click();
ok(!lifeSub.classList.contains("open"), "点生活管理标题可收起");

// 三餐饮食：无下拉，直接进入面板
const mealsLeaf = [...lifeSub.querySelectorAll(".nav-sub-item")].find(b => b.textContent.includes("三餐饮食"));
ok(mealsLeaf, "三餐饮食为无下拉的二级标题(页)");
mealsLeaf.click();
ok(doc.getElementById("panel-meals").classList.contains("active"), "点三餐饮食进入 panel-meals");
ok(!doc.querySelector("#panel-meals #hExInput"), "三餐饮食面板无运动打卡项");

// 健康记录：改为单页（无下拉），直接进入健康面板
const healthLeaf = [...lifeSub.querySelectorAll(".nav-sub-item")].find(b => b.textContent.includes("健康记录"));
ok(healthLeaf, "健康记录为无下拉的二级标题(页)");
ok(![...lifeSub.querySelectorAll(".nav-sub-group")].some(g => g.textContent.includes("健康记录")), "健康记录不再是带下拉的分组");
healthLeaf.click();
ok(doc.getElementById("panel-health").classList.contains("active"), "点健康记录进入 panel-health");
ok(!!doc.getElementById("sec-exercise") && !!doc.getElementById("exCustom"), "panel-health 有运动健身打卡区块 + 自定义输入");
ok(!!doc.getElementById("sec-period"), "panel-health 有经期区块");
ok(!!doc.getElementById("sec-exam"), "panel-health 有体检区块");
// 作息已搬到 panel-health
ok(doc.getElementById("panel-health") && doc.getElementById("panel-health").contains(doc.getElementById("sec-sleep")), "作息 section 在 panel-health 内");

// 日常规划：带下拉组，含 记账/旅游计划
const recordGroup = [...lifeSub.querySelectorAll(".nav-sub-group")].find(g => g.textContent.includes("日常规划"));
ok(recordGroup, "日常规划为带下拉的二级标题");
const rChildren = [...recordGroup.nextElementSibling.querySelectorAll(".nav-sub-item")].map(b => b.textContent);
ok(rChildren.some(t => t.includes("记账")) && rChildren.some(t => t.includes("旅游计划")), "日常规划下拉含 记账/旅游计划");

// 学习中心/每日一问 默认展开、手风琴互斥且不影响生活管理
const studyHead = [...doc.querySelectorAll(".nav-head")].find(h => h.textContent.includes("学习中心"));
const dailyHead = [...doc.querySelectorAll(".nav-head")].find(h => h.textContent.includes("每日一问"));
ok(studyHead.nextElementSibling.classList.contains("open") && dailyHead.nextElementSibling.classList.contains("open"), "学习中心/每日一问 默认展开可见");
dailyHead.click(); dailyHead.click(); // 收起再展开 → 学习中心被手风琴收起
// 生活管理也可折叠（不再 fixed），先点开确保可见
lifeHead.click(); ok(lifeSub.classList.contains("open"), "点生活管理标题可再展开");

console.log("== 4 学习中心无页内 tab ==");
ok(!doc.getElementById("studyTabs"), "studyTabs 已删除");
// 侧边栏点法律法规
const lawBtn = [...doc.querySelectorAll(".nav-sub-item")].find(b => b.textContent.includes("法律法规"));
lawBtn.click();
ok(doc.getElementById("study-law").classList.contains("active"), "法律法规面板激活");
ok(doc.querySelectorAll("#lawList .law-card").length >= 25, "法条数量 " + doc.querySelectorAll("#lawList .law-card").length + " 条（含应届生条目）");
ok(/三方协议/.test(doc.getElementById("lawList").textContent), "含应届生法律知识（三方协议）");
const interestBtn = [...doc.querySelectorAll(".nav-sub-item")].find(b => b.textContent.includes("兴趣拓展"));
interestBtn.click();
ok(doc.getElementById("study-interest").classList.contains("active"), "兴趣拓展面板激活");
doc.getElementById("interestInput").value = "吉他";
doc.getElementById("interestGen").click();
ok(/第 1 周/.test(doc.getElementById("interestPlan").textContent), "兴趣拓展可生成计划内容");

console.log("== 4b 法律法规：标题 + 折叠更多 ==");
const lawBtn2 = [...doc.querySelectorAll(".nav-sub-item")].find(b => b.textContent.includes("法律法规"));
if (lawBtn2) lawBtn2.click();
ok(/每日一览/.test(doc.querySelector("#panel-study .card-head h2").textContent), "法律法规面板标题已改为「法律法规 · 每日一览」");
ok(!/每天自动滚动/.test(doc.getElementById("panel-study").textContent), "「每天自动滚动…」介绍已删除");
ok(doc.getElementById("lawMore") && doc.getElementById("lawMoreBtn"), "有 lawMore 折叠容器 + 查看更多按钮");
ok(!doc.getElementById("lawMore").classList.contains("open"), "lawMore 默认无 open 类（折叠）");
ok(/查看更多法条/.test(doc.getElementById("lawMoreBtn").textContent), "按钮文案是「查看更多法条…▼」");
const moreCount = doc.querySelectorAll("#lawMore .law-card").length;
ok(moreCount > 0, "折叠区域里有 " + moreCount + " 条法条");
doc.getElementById("lawMoreBtn").click();
ok(doc.getElementById("lawMore").classList.contains("open"), "点查看更多 → lawMore 展开");
ok(/收起法条/.test(doc.getElementById("lawMoreBtn").textContent), "按钮文案切换为「收起法条 ▲」");
doc.getElementById("lawMoreBtn").click();
ok(!doc.getElementById("lawMore").classList.contains("open"), "再点 → lawMore 收起");
ok(/查看更多法条/.test(doc.getElementById("lawMoreBtn").textContent), "按钮文案还原为「查看更多法条…」");

console.log("== 4c 随手拍/今日日常的提示已清理 ==");
const lifeBtn = [...doc.querySelectorAll(".nav-item")].find(b => b.textContent.includes("回忆录") === false && b.textContent.trim() === "记录生活") || doc.getElementById("bbCam");
if (lifeBtn && lifeBtn.id !== "bbCam") lifeBtn.click();
else doc.getElementById("bbCam").click();
const lifePanel = doc.getElementById("panel-life");
ok(lifePanel && !/删除照片：长按图片拖到/.test(lifePanel.textContent), "随手拍卡片下「删除照片：长按图片…」提示已删除");
ok(lifePanel && !/确定后内容会锁定/.test(lifePanel.textContent), "今日日常卡片下「确定后内容会锁定…」提示已删除");

console.log("== 5 作息 ==");
// 作息在健康记录页里：先点「健康记录」进入 panel-health
const healthLeaf2 = [...doc.querySelectorAll(".nav-sub-item")].find(b => b.textContent.includes("健康记录"));
if (healthLeaf2) healthLeaf2.click();
const down = doc.getElementById("sleepDown"), up = doc.getElementById("sleepUp");
ok(down && up && down.tagName === "SELECT" && up.tagName === "SELECT", "作息改为下拉选择");
const downIdx = [...doc.querySelector("#panel-health .form-grid").querySelectorAll("select")];
ok(downIdx[0] === down, "睡觉时间在前、起床在后");
function setSleep(d, u) {
  down.value = d; down.dispatchEvent(new window.Event("change"));
  up.value = u; up.dispatchEvent(new window.Event("change"));
  return doc.getElementById("sleepInfo").textContent;
}
ok(down.querySelectorAll("option").length <= 30, "睡觉选项精简（" + down.querySelectorAll("option").length + " 个）");
let t = setSleep("23:00", "04:00"); ok(/红|睡/.test(t) && doc.getElementById("sleepJudge").style.display !== "none", "<6h 有红灯调侃: " + t.slice(0, 30));
t = setSleep("23:00", "06:30"); ok(/绿灯|刚刚好/.test(t), "6-8h 绿灯: " + t.slice(0, 30));
t = setSleep("22:00", "07:00"); ok(/黄灯|一丢丢/.test(t), "8-10h 黄灯+羡慕调侃: " + t.slice(0, 30));
t = setSleep("21:00", "08:00"); ok(/睡眠质量|红灯/.test(t), ">10h 红灯+怎么睡得着: " + t.slice(0, 30));

console.log("== 6 运动打卡加时间 ==");
// 运动健身打卡在健康记录页的 sec-exercise 中，renderHealth 已渲染
ok(!!doc.getElementById("exTime"), "有运动时间输入框");
doc.getElementById("exTime").value = "18:30";
doc.getElementById("exMin").value = "30";
doc.getElementById("exSave").click();
ok(/18:30/.test(doc.getElementById("exList2").textContent), "清单显示运动时间 18:30");

console.log("== 7 经期判断 ==");
window.eval('(function(){ const app=document.getElementById("pLast"); })()');
doc.getElementById("periodSet").click();
doc.getElementById("pLast").value = "2026-07-25";
doc.getElementById("pCycle").value = "28";
doc.getElementById("pDur").value = "5";
doc.getElementById("pSave").click();
ok(doc.getElementById("periodInfo").textContent.length > 5, "经期有判断内容: " + doc.getElementById("periodInfo").textContent.slice(0, 40));

console.log("== 8 塔罗 ==");
const tarotBtn = [...doc.querySelectorAll(".nav-sub-item")].find(b => b.textContent.includes("塔罗"));
tarotBtn.click();
ok(doc.getElementById("tarotCard").style.display === "none", "进入页面不出结果（只显示牌背）");
doc.getElementById("tarotBack").click();
ok(doc.getElementById("tarotCard").style.display !== "none", "点击牌背后出结果");
ok(/正位|逆位/.test(doc.getElementById("tarotOri").textContent), "显示正/逆位: " + doc.getElementById("tarotOri").textContent);
ok(/解读/.test(doc.getElementById("tarotRead").textContent), "有解读");
ok(doc.getElementById("tarotCheer").textContent.length > 5, "有激励语: " + doc.getElementById("tarotCheer").textContent.slice(0, 25));

console.log("== 9 美食盲盒 ==");
const foodBtn = [...doc.querySelectorAll(".nav-sub-item")].find(b => b.textContent.includes("美食盲盒"));
foodBtn.click();
ok(!doc.getElementById("foodWheel"), "转盘已移除");
const boxes = doc.querySelectorAll(".blind-box");
ok(boxes.length === 8, "有 8 个盲盒");
const LIFE = window.APP_LIFE;
["奶茶","小吃","正餐","大餐"].forEach(function (c) {
  const n = LIFE.foodWheel.filter(f => f.cat === c).length;
  ok(n >= 50, c + " 有 " + n + " 种（≥50）");
});
ok(!/xiaohongshu/.test(fs.readFileSync(path.join(dir, "app.js"), "utf8").split("美食盲盒")[1] || ""), "盲盒结果无小红书链接");
boxes[0].click();
// 等 shake 结束
setTimeout(function () {
  ok(/strong/.test(doc.getElementById("foodResult").innerHTML), "开盒出结果: " + doc.getElementById("foodResult").textContent.slice(0, 30));

  console.log("== 10 关于页 & 数据备份移除 ==");
  ok(!doc.getElementById("panel-data"), "数据备份面板已删除");
  const aboutBtn = [...doc.querySelectorAll(".nav-item")].find(b => b.textContent.includes("关于"));
  ok(aboutBtn, "侧边栏有「关于」");
  aboutBtn.click();
  ok(doc.getElementById("panel-about").classList.contains("active"), "关于面板激活");
  ok(/庆姐，生日快乐/.test(doc.getElementById("panel-about").textContent), "显示生日祝福");
  ok(/我永远支持你的每一个选择/.test(doc.getElementById("panel-about").textContent), "显示支持语");

  console.log("== 11 今日随手拍：确认上传 + 拖拽垃圾桶 ==");
  ok(/今日随手拍/.test(doc.querySelector("#panel-life .card-head h2").textContent), "标题改为「今日随手拍」");
  ok(doc.getElementById("snapPreview") && doc.getElementById("snapConfirm") && doc.getElementById("snapCancel"), "有预览 + 确认/取消按钮");
  ok(doc.querySelector(".trash-zone"), "垃圾桶元素已就绪");
  ok(!doc.querySelector(".pw-del"), "旧的 ✕ 删除按钮已移除（改为拖拽删除）");

  console.log("== 12 今日日常：添加确认 → 锁定 → 点击出修改 ==");
  const logEl2 = doc.getElementById("log");
  logEl2.value = "今天试了新的奶茶店";
  doc.getElementById("logAdd").click();
  ok(!doc.getElementById("logView").hidden && /奶茶店/.test(doc.getElementById("logView").textContent), "确认后内容锁定显示");
  ok(doc.getElementById("log").style.display === "none", "锁定后输入框隐藏");
  ok(doc.getElementById("logEdit").hidden, "修改按钮默认隐藏");
  doc.getElementById("logView").click();
  ok(!doc.getElementById("logEdit").hidden, "点击内容后出现修改按钮");
  doc.getElementById("logEdit").click();
  ok(doc.getElementById("logAdd").textContent === "确认修改", "进入修改模式（按钮变确认修改）");
  doc.getElementById("log").value = "今天试了新的奶茶店，超好喝";
  doc.getElementById("logAdd").click();
  ok(/超好喝/.test(doc.getElementById("logView").textContent), "修改已保存并重新锁定");

  console.log("== 13 心情小记：同样的添加/修改流程 ==");
  const hv = doc.getElementById("homeNoteView");
  ok(hv && doc.getElementById("homeNoteEdit"), "心情小记有锁定视图 + 修改按钮");
  doc.getElementById("homeNote").value = "今天心情不错";
  doc.getElementById("homeMoodSave").click();
  ok(!hv.hidden && /心情不错/.test(hv.textContent), "打卡后内容锁定");
  hv.click();
  ok(!doc.getElementById("homeNoteEdit").hidden, "点击内容出现修改按钮");
  doc.getElementById("homeNoteEdit").click();
  ok(doc.getElementById("homeMoodSave").textContent === "确认修改", "心情小记进入修改模式");

  console.log("");
  if (fail === 0) console.log("ALL PASSED");
  else { console.log(fail + " FAILED"); }
  process.exit(fail === 0 ? 0 : 1);
}, 1500);
