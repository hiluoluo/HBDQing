(function () {
  const C = window.APP_CONFIG || {};

  // 设置覆盖（页面里改的会存到这里，刷新后保留）
  try { const ov = JSON.parse(localStorage.getItem("app_settings")); if (ov) Object.assign(C, ov); } catch (e) {}

  const friend = C.friendName || "你";
  const now = new Date();

  // ---------- 工具 ----------
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  const key = todayKey();
  function addDays(dateStr, n) {
    const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function daysBetween(a, b) {
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  }
  function loadDay(k) { try { return JSON.parse(localStorage.getItem("ld_" + k)) || {}; } catch (e) { return {}; } }
  function saveDay(k, o) { localStorage.setItem("ld_" + k, JSON.stringify(o)); }
  function loadStore(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function saveStore(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  let day = loadDay(key);

  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  // 全局：HTML 转义
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  // 全局：带超时的 JSON 请求
  function fetchJSON(url, ms) {
    return new Promise(function (resolve, reject) {
      const ctrl = ("AbortController" in window) ? new AbortController() : null;
      const timer = setTimeout(function () { if (ctrl) ctrl.abort(); reject(new Error("timeout")); }, ms || 10000);
      fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) {
        clearTimeout(timer);
        if (!r.ok) { reject(new Error("http " + r.status)); return; }
        resolve(r.json());
      }).catch(function (e) { clearTimeout(timer); reject(e); });
    });
  }

  // ---------- 顶部 ----------
  document.getElementById("who").textContent = friend;
  document.getElementById("brandName").textContent = friend + " 的助手";
  document.getElementById("gift").textContent = C.giftLine || "";
  document.title = friend + " 的每日助手";
  const h = now.getHours();
  const greet = h < 6 ? "夜深了" : h < 11 ? "早上好" : h < 13 ? "中午好" : h < 18 ? "下午好" : "晚上好";
  document.getElementById("greet").textContent = greet + "，";
  const wk = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];
  document.getElementById("today").textContent = now.getFullYear() + "年" + (now.getMonth() + 1) + "月" + now.getDate() + "日 星期" + wk;

  // ---------- 顶部待办速览小方块（半透明，点开看详情） ----------
  const PRIO_COLOR = { "重要": "#e0533d", "比较重要": "#e0922a", "一般": "#2bb673" };
  function todoStats() {
    const todos = loadStore("work_todos") || [];
    const open = todos.filter(function (t) { return !t.done; });
    let overdue = 0, soon = 0;
    open.forEach(function (t) {
      if (!t.ddl) return;
      const d = daysBetween(key, t.ddl); // 正数=还有d天，负数=已超时
      if (d < 0) overdue++;
      else if (d <= 1) soon++; // 今明两天到期算“即将超时”
    });
    return { total: open.length, overdue: overdue, soon: soon, todos: todos };
  }
  function renderTodoTab() {
    const tab = document.getElementById("todoTab"); if (!tab) return;
    const txt = document.getElementById("todoTabText");
    const st = todoStats();
    txt.innerHTML = "今天共 <b>" + st.total + "</b> 待办" + (st.soon + st.overdue > 0 ? "，<b>" + (st.soon + st.overdue) + "</b> 个即将超时" : "");
    tab.classList.toggle("warn", st.overdue > 0);
    const pop = document.getElementById("todoPop");
    const todos = st.todos;
    if (!todos.length) { pop.innerHTML = '<div class="tp-empty">今天还没有待办，轻松一天 ♡</div>'; return; }
    let html = '<div class="tp-head">待办详情</div>';
    todos.slice().sort(function (a, b) {
      const rank = { "重要": 0, "比较重要": 1, "一般": 2 };
      return (a.done - b.done) || ((a.ddl || "9999") + "").localeCompare((b.ddl || "9999") + "") || (rank[a.prio] || 2) - (rank[b.prio] || 2);
    }).forEach(function (t) {
      const over = t.ddl && !t.done && daysBetween(key, t.ddl) < 0;
      const color = PRIO_COLOR[t.prio || "一般"];
      html += '<div class="tp-item' + (over ? " over" : "") + (t.done ? " done" : "") + '">' +
        '<span class="tp-dot" style="background:' + (over ? "#e0533d" : color) + '"></span>' +
        '<span class="tp-text">' + esc(t.text) + '</span>' +
        '<span class="tp-meta">' + (t.prio || "一般") + (t.ddl ? " · 最晚 " + esc(t.ddl.slice(5)) : "") + (over ? " · 已超时" : "") + '</span></div>';
    });
    pop.innerHTML = html;
  }
  (function initTodoTab() {
    const tab = document.getElementById("todoTab"); if (!tab) return;
    const pop = document.getElementById("todoPop");
    tab.onclick = function (e) {
      if (e.target.closest(".tt-pop")) return;
      renderTodoTab();
      pop.hidden = !pop.hidden;
      tab.classList.toggle("openned", !pop.hidden);
    };
    document.addEventListener("click", function (e) { if (!tab.contains(e.target)) { pop.hidden = true; tab.classList.remove("openned"); } });
    renderTodoTab();
  })();

  // ---------- 心情 ----------
  const MOODS = [
    { e:"(◕‿◕)", l:"开心" },
    { e:"(◡‿◡)", l:"还行" },
    { e:"(￣▽￣)", l:"平淡" },
    { e:"(´･_･`)", l:"低落" },
    { e:"(；ω；)", l:"难过" },
    { e:"(╬￣皿￣)", l:"生气" },
    { e:"(－_－)", l:"疲惫" },
    { e:"(×_×)", l:"不舒服" }
  ];
  const moodsEl = document.getElementById("moods");
  MOODS.forEach(function (m, i) {
    const b = document.createElement("button");
    b.className = "mood" + (day.mood === i ? " sel" : ""); b.textContent = m.e; b.title = m.l;
    b.onclick = function () { day.mood = i; saveDay(key, day); Array.prototype.forEach.call(moodsEl.children, function (c) { c.classList.remove("sel"); }); b.classList.add("sel"); toast("已记录今天的心情：" + m.l); };
    moodsEl.appendChild(b);
  });
  const moodNote = document.getElementById("moodNote"); moodNote.value = day.moodNote || "";
  moodNote.oninput = function () { day.moodNote = moodNote.value; saveDay(key, day); };

  // ---------- 喝水 ----------
  document.getElementById("waterGoal").textContent = C.waterGoal || 8;
  const wc = document.getElementById("waterCount"), wbar = document.getElementById("waterBar");
  function paintWater() { wc.textContent = day.water || 0; const g = C.waterGoal || 8; wbar.style.width = Math.min(100, ((day.water || 0) / g) * 100) + "%"; }
  paintWater();
  document.getElementById("waterPlus").onclick = function () { day.water = (day.water || 0) + 1; saveDay(key, day); paintWater(); if (day.water >= (C.waterGoal || 8)) toast("今天喝水目标达成"); };
  document.getElementById("waterMinus").onclick = function () { day.water = Math.max(0, (day.water || 0) - 1); saveDay(key, day); paintWater(); };
  let waterTimer;
  document.getElementById("waterRemind").onchange = function (e) {
    if (e.target.checked) {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
      const min = (C.waterReminderMin || 60) * 60000;
      waterTimer = setInterval(function () { toast("该喝水啦"); if ("Notification" in window && Notification.permission === "granted") new Notification("喝水提醒", { body: "该起身喝杯水啦" }); }, min);
      toast("已开启喝水提醒，每 " + (C.waterReminderMin || 60) + " 分钟一次");
    } else { clearInterval(waterTimer); toast("已关闭喝水提醒"); }
  };

  // ---------- 经期 ----------
  const pInfo = document.getElementById("periodInfo");
  function loadPCfg() { const s = localStorage.getItem("period_cfg"); if (s) return JSON.parse(s); return Object.assign({}, C.period || { enabled: true, lastDate: "", cycle: 28, duration: 5 }); }
  let pcfg = loadPCfg();
  function savePCfg() { localStorage.setItem("period_cfg", JSON.stringify(pcfg)); }
  function renderPeriod() {
    if (!pcfg.enabled || !pcfg.lastDate) { pInfo.innerHTML = "还没设置经期信息，点“设置”填写。"; return; }
    let next = pcfg.lastDate; while (daysBetween(next, key) >= 0) next = addDays(next, pcfg.cycle);
    const left = daysBetween(key, next);
    const sinceLast = daysBetween(pcfg.lastDate, key);
    const inPeriod = sinceLast >= 0 && sinceLast < pcfg.duration;
    let html = "距离下次经期还有 <b>" + left + "</b> 天";
    if (left === 0) html = "预计今天开始经期";
    if (inPeriod) html += " · 现在 <b>经期中</b>";
    const ov = addDays(next, -14), ovLeft = daysBetween(key, ov);
    const nearOv = ovLeft >= 0 && ovLeft <= 3;
    if (nearOv) html += " · 接近排卵期";
    // 综合判断结论
    let judge, jColor;
    if (inPeriod) {
      judge = "判断：经期第 " + ((sinceLast % pcfg.cycle) + 1) + " 天。注意保暖、别碰凉的，多喝热水，别太累，痛得厉害要休息。";
      jColor = "#e0533d";
    } else if (left <= 3) {
      judge = "判断：经期快来了（约 " + left + " 天后）。可以提前备好用品，最近别熬夜、少吃生冷辛辣。";
      jColor = "#e0922a";
    } else if (nearOv) {
      judge = "判断：正处于排卵期附近，属于周期正常波动，可能会有轻微不适，注意休息。";
      jColor = "#7c5bb5";
    } else {
      const normal = pcfg.cycle >= 21 && pcfg.cycle <= 35;
      judge = normal
        ? "判断：目前处于安全平稳期，周期 " + pcfg.cycle + " 天在正常范围（21–35 天），状态不错，保持规律作息就好。"
        : "判断：你的周期 " + pcfg.cycle + " 天不在常见范围（21–35 天），如果长期如此，建议找时间咨询医生。";
      jColor = normal ? "#2bb673" : "#e0533d";
    }
    html += '<div class="period-judge" style="color:' + jColor + '">' + judge + "</div>";
    pInfo.innerHTML = html;
  }
  renderPeriod();
  document.getElementById("periodMark").onclick = function () { pcfg.lastDate = key; savePCfg(); renderPeriod(); toast("已记录：今天经期开始"); };
  document.getElementById("periodSet").onclick = function () { const p = document.getElementById("periodPanel"); p.style.display = p.style.display === "none" ? "block" : "none"; document.getElementById("pLast").value = pcfg.lastDate || ""; document.getElementById("pCycle").value = pcfg.cycle || 28; document.getElementById("pDur").value = pcfg.duration || 5; };
  document.getElementById("pSave").onclick = function () { pcfg.lastDate = document.getElementById("pLast").value; pcfg.cycle = parseInt(document.getElementById("pCycle").value, 10) || 28; pcfg.duration = parseInt(document.getElementById("pDur").value, 10) || 5; savePCfg(); renderPeriod(); document.getElementById("periodPanel").style.display = "none"; toast("经期设置已保存"); };

  // ---------- 记录生活：拍照 / 照片墙 ----------
  const snapInput = document.getElementById("snapInput");
  function renderPhotoWall() {
    const wall = document.getElementById("photoWall"); if (!wall) return;
    wall.innerHTML = "";
    (day.photos || []).forEach(function (src, i) {
      const d = document.createElement("div"); d.className = "pw-item";
      const img = document.createElement("img"); img.src = src; img.alt = "";
      img.onclick = function () { window.open(src, "_blank"); };
      const del = document.createElement("button"); del.className = "pw-del"; del.textContent = "✕";
      del.onclick = function (e) { e.stopPropagation(); day.photos.splice(i, 1); saveDay(key, day); renderPhotoWall(); toast("已删除照片"); };
      d.appendChild(img); d.appendChild(del); wall.appendChild(d);
    });
  }
  // 压缩后存本地：最长边 1100px、jpeg 0.78，一张大约 100-250KB，不易撑爆 localStorage
  function compressImage(file, cb) {
    const r = new FileReader();
    r.onload = function () {
      const img = new Image();
      img.onload = function () {
        const MAX = 1100; let w = img.width, hgt = img.height;
        if (Math.max(w, hgt) > MAX) { const s = MAX / Math.max(w, hgt); w = Math.round(w * s); hgt = Math.round(hgt * s); }
        const cv = document.createElement("canvas"); cv.width = w; cv.height = hgt;
        cv.getContext("2d").drawImage(img, 0, 0, w, hgt);
        cb(cv.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = function () { cb(r.result); };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }
  if (snapInput) snapInput.onchange = function () {
    const f = snapInput.files[0]; if (!f) return;
    compressImage(f, function (dataUrl) {
      day.photos = day.photos || [];
      day.photos.push(dataUrl);
      try { saveDay(key, day); toast("照片已存好"); }
      catch (e) { day.photos.pop(); toast("存储空间满了，删几张旧照片再试"); }
      renderPhotoWall(); snapInput.value = "";
      day.prompts = day.prompts || {}; day.prompts.snap = true; saveDay(key, day);
    });
  };
  const snapBtn = document.getElementById("snapBtn");
  if (snapBtn) snapBtn.onclick = function () { snapInput.click(); };
  renderPhotoWall();

  // ---------- 记录生活 ----------
  const logEl = document.getElementById("log"), logSaved = document.getElementById("logSaved");
  logEl.value = day.log || ""; let logTimer;
  logEl.oninput = function () { logSaved.textContent = ""; clearTimeout(logTimer); logTimer = setTimeout(function () { day.log = logEl.value; saveDay(key, day); logSaved.textContent = "已自动保存"; }, 600); };

  function renderHistory() {
    const hist = document.getElementById("history"); hist.innerHTML = "";
    for (let i = 1; i <= 7; i++) {
      const dk = addDays(key, -i); const o = loadDay(dk);
      if (!o.mood && !o.log && !o.water && !(o.photos && o.photos.length)) continue;
      const div = document.createElement("div"); div.className = "hist";
      const m = o.mood != null ? MOODS[o.mood].e : "·";
      const wkd = ["日","一","二","三","四","五","六"][new Date(dk + "T00:00:00").getDay()];
      const txt = (o.log || "").slice(0, 28);
      const ph = (o.photos && o.photos.length) ? " 图" + o.photos.length : "";
      div.innerHTML = "<div class='hd'>" + dk.slice(5) + " 周" + wkd + "</div><div class='hm'>" + m + (o.water ? " 水" + o.water : "") + ph + "</div><div class='hl'>" + (txt || "（无文字）") + "</div>";
      hist.appendChild(div);
    }
  }
  renderHistory();

  // ---------- 回忆录 ----------
  document.getElementById("memoirTitle").textContent = (C.memoir && C.memoir.title) || "与姐姐的回忆录";
  document.getElementById("memoirSub").textContent = (C.memoir && C.memoir.subtitle) || "";
  if (loadStore("memoir_entries") == null && C.memoir && C.memoir.placeholder) saveStore("memoir_entries", C.memoir.placeholder);
  document.getElementById("mDate").value = key;
  function renderMemoir() {
    const list = loadStore("memoir_entries") || [];
    const box = document.getElementById("memoirList"); box.innerHTML = "";
    list.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }).forEach(function (it) {
      const d = document.createElement("div"); d.className = "tl-item";
      const del = document.createElement("button"); del.className = "tl-del"; del.textContent = "删除";
      del.onclick = function () { const arr = loadStore("memoir_entries") || []; const idx = arr.findIndex(function (x) { return x.id === it.id; }); if (idx >= 0) { arr.splice(idx, 1); saveStore("memoir_entries", arr); renderMemoir(); toast("已删除"); } };
      d.innerHTML = '<div class="tl-date">' + (it.date || "") + '</div><div class="tl-title"><span>' + (it.title || "（无标题）") + '</span></div>';
      d.querySelector(".tl-title").appendChild(del);
      const tx = document.createElement("div"); tx.className = "tl-text"; tx.textContent = it.text || ""; d.appendChild(tx);
      if (it.photo) { const img = document.createElement("img"); img.className = "tl-photo"; img.src = it.photo; img.alt = ""; d.appendChild(img); }
      box.appendChild(d);
    });
    if (!list.length) box.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px">还没有回忆，添加第一条吧 ♡</p>';
  }
  document.getElementById("mAdd").onclick = function () {
    const date = document.getElementById("mDate").value || key;
    const title = document.getElementById("mTitle").value.trim();
    const text = document.getElementById("mText").value.trim();
    const url = document.getElementById("mPhotoUrl").value.trim();
    const file = document.getElementById("mPhotoFile").files[0];
    if (!title && !text) { toast("写点标题或内容吧"); return; }
    const finish = function (photo) {
      const list = loadStore("memoir_entries") || [];
      list.push({ id: Date.now(), date: date, title: title, text: text, photo: photo || "" });
      saveStore("memoir_entries", list); renderMemoir();
      document.getElementById("mTitle").value = ""; document.getElementById("mText").value = ""; document.getElementById("mPhotoUrl").value = ""; document.getElementById("mPhotoFile").value = "";
      toast("已保存这条回忆 ♡");
    };
    if (file) {
      if (file.size > 1500000) document.getElementById("mHint").textContent = "照片较大，已存入但可能占空间";
      const r = new FileReader(); r.onload = function () { finish(r.result); }; r.onerror = function () { finish(url); }; r.readAsDataURL(file);
    } else finish(url);
  };
  renderMemoir();

  // ---------- 热点动态（多源聚合 + 汇总 + 关键词 + 出处） ----------
  (function renderHotNews() {
    const cfg = C.news || { enabled: true };
    if (!cfg.enabled) return;
    const taglineEl = document.getElementById("hotTagline");
    const tabsEl = document.getElementById("hotTabs"), panelsEl = document.getElementById("hotPanels"), summaryEl = document.getElementById("hotSummary");
    if (!tabsEl || !panelsEl) return;
    // 顶部语录（点进去先看到的一句话）
    if (taglineEl) {
      const lines = (cfg.taglines && cfg.taglines.length) ? cfg.taglines : ["再忙也抽空了解世界。"];
      taglineEl.textContent = lines[Math.floor(Math.random() * lines.length)];
    }

    const KW = cfg.keywords || [];
    function highlight(text) {
      let t = esc(text);
      KW.forEach(function (k) {
        if (!k) return;
        const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        t = t.replace(re, '<mark class="kw">' + k + "</mark>");
      });
      return t;
    }

    const all = [];
    if (cfg.authoritative) all.push(Object.assign({ id: "auth", isAuth: true }, cfg.authoritative));
    (cfg.sources || []).forEach(function (s) { all.push(Object.assign({ isAuth: false }, s)); });
    const localCfg = cfg.local || { enabled: false };
    const localProxy = (localCfg.proxy || "").trim();
    (localCfg.cities || []).forEach(function (c) {
      if (!localCfg.enabled) return;
      all.push(Object.assign({ id: c.id, isLocal: true, area: c.area, color: c.color || "#e0533d", icon: c.icon || "⌖", label: c.label }, c));
    });
    if (!all.length) return;

    const loaded = {}, cache = {};
    let activeId = all[0].id;

    function buildTabs() {
      tabsEl.innerHTML = ""; panelsEl.innerHTML = "";
      all.forEach(function (s) {
        const tab = document.createElement("button"); tab.className = "tab" + (s.id === activeId ? " active" : ""); tab.dataset.id = s.id;
        tab.innerHTML = '<span class="dot" style="background:' + (s.color || "#7b5cff") + '"></span>' + s.icon + " " + s.label;
        tab.onclick = function () { switchTab(s.id); }; tabsEl.appendChild(tab);
        const panel = document.createElement("div"); panel.className = "hot-panel" + (s.id === activeId ? " active" : ""); panel.id = "panel_" + s.id;
        panel.innerHTML = '<ol class="hot-list"><li class="loading">加载中…</li></ol>'; panelsEl.appendChild(panel);
      });
    }
    function switchTab(id) {
      activeId = id;
      Array.prototype.forEach.call(tabsEl.children, function (t) { t.classList.toggle("active", t.dataset.id === id); });
      Array.prototype.forEach.call(panelsEl.children, function (p) { p.classList.toggle("active", p.id === "panel_" + id); });
      const ol = document.getElementById("panel_" + id).querySelector(".hot-list");
      if (!loaded[id] && ol.querySelector(".loading")) loadSource(id);
    }
    function showTip(tip) {
      const card = panelsEl.closest(".card"); let t = card.querySelector(".hot-tip");
      if (!t) { t = document.createElement("p"); t.className = "hot-tip"; card.appendChild(t); }
      t.textContent = "✦ " + tip;
    }
    function renderList(ol, items, src) {
      ol.innerHTML = "";
      items.forEach(function (it) {
        const li = document.createElement("li"); const a = document.createElement("a");
        a.href = it.url || ("https://www.baidu.com/s?wd=" + encodeURIComponent(it.title)); a.target = "_blank"; a.rel = "noopener";
        const span = document.createElement("span"); span.className = "t"; span.innerHTML = highlight(it.title); a.appendChild(span);
        if (it.hot) { const v = document.createElement("span"); v.className = "hot-val"; v.textContent = it.hot; a.appendChild(v); }
        const sb = document.createElement("span"); sb.className = "src-badge"; sb.textContent = it.source || src.label; a.appendChild(sb);
        li.appendChild(a); ol.appendChild(li);
      });
    }
    // 顶部语录模式：不再汇总，直接展示各榜单
    function loadSource(id) {
      const src = all.find(function (s) { return s.id === id; });
      const ol = document.getElementById("panel_" + id).querySelector(".hot-list");
      ol.innerHTML = '<li class="loading">加载中…</li>';

      if (src.isLocal) {
        // 优先用 news.json 缓存（loadNewsCache 已处理）；缓存没有时的兜底
        if (localProxy) {   // 可选增强：部署了免费代理且含 JUHE_KEY，拉真实地方媒体新闻
          const url = localProxy.replace(/\/+$/, "") + "?city=" + encodeURIComponent(src.area || "");
          fetchJSON(url, 10000).then(function (j) {
            const items = parseLocalNews(j).slice(0, cfg.count || 12);
            if (!items.length) { ol.innerHTML = '<li class="loading">暂时没拉到，点“刷新”重试</li>'; return; }
            loaded[id] = true; cache[id] = items.map(function (it) { return { title: it.title, url: it.url, source: src.label, hot: "" }; });
            renderList(ol, cache[id], src);
          }).catch(function () { ol.innerHTML = '<li class="loading">拉取失败，检查代理地址或点“刷新”</li>'; });
          return;
        }
        // 免 Key 默认：由 GitHub Actions 定时任务自动抓取，无需任何配置
        ol.innerHTML = '<li class="loading">' + esc(localCfg.fallbackNote || "部署到 GitHub 后由定时任务每 2 小时自动更新（免 Key，无需任何配置）。") + '</li>';
        loaded[id] = true; return;
      }

      const urls = (src.apis && src.apis.slice()) || (src.api ? [src.api] : []);
      (function tryNext() {
        if (!urls.length) { ol.innerHTML = '<li class="loading">暂时没拉到，点“刷新”重试</li>'; return; }
        const url = urls.shift();
        fetchJSON(url, 10000).then(function (j) {
          let res = src.parse ? src.parse(j) : { items: [] };
          if (Array.isArray(res)) res = { items: res };
          const items = (res.items || []).slice(0, cfg.count || 12);
          if (!items.length) { tryNext(); return; }
          loaded[id] = true;
          cache[id] = items.map(function (it) { return { title: it.title, url: it.url, hot: it.hot, source: src.label }; });
          if (src.isAuth) { if (res.date) summaryEl.textContent = "更新于 " + res.date + " · 今日 " + items.length + " 条要闻（权威来源汇总）"; if (res.tip) showTip(res.tip); }
          renderList(ol, cache[id], src);
        }).catch(function () { tryNext(); });
      })();
    }
    // 优先读取定时任务预抓取的 data/news.json（同源、无跨域、关站也照常更新）
    function loadNewsCache(done) {
      fetchJSON("./data/news.json", 8000).then(function (json) {
        if (!json || !json.sources) { done(); return; }
        all.forEach(function (s) {
          const sd = json.sources[s.id]; if (!sd) return;
          const items = (sd.items || []).map(function (it) {
            return { title: it.title, url: it.url, hot: it.hot, source: s.label };
          });
          if (!items.length) return;            // 该源没抓到，留给实时兜底
          cache[s.id] = items; loaded[s.id] = true;
          const panel = document.getElementById("panel_" + s.id);
          if (panel) renderList(panel.querySelector(".hot-list"), items, s);
          if (s.isAuth) {
            if (sd.date) summaryEl.textContent = "更新于 " + sd.date + " · 今日 " + items.length + " 条要闻（权威来源汇总）";
            if (sd.tip) showTip(sd.tip);
          }
        });
        done();
      }).catch(function () { done(); });
    }

    buildTabs();
    loadNewsCache(function () {
      // 缓存里没有的源（如本地新闻未配置 Key），用实时接口兜底
      all.forEach(function (s) { if (!loaded[s.id]) loadSource(s.id); });
    });

    // 自动刷新：切回页面时、以及每 30 分钟重新读取一次预抓数据
    function autoRefresh() { loadNewsCache(function () {}); }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) autoRefresh(); });
    setInterval(autoRefresh, 30 * 60 * 1000);

    const hotRefresh = document.getElementById("hotRefresh");
    if (hotRefresh) hotRefresh.onclick = function () {
      all.forEach(function (s) {
        loaded[s.id] = false;
        const ol = document.getElementById("panel_" + s.id);
        if (ol) ol.querySelector(".hot-list").innerHTML = '<li class="loading">加载中…</li>';
      });
      loadNewsCache(function () {
        all.forEach(function (s) { if (!loaded[s.id]) loadSource(s.id); });
      });
    };
  })();

  // ---------- 外语学习中心 ----------
  const ST_EN = document.getElementById("study-en"), ST_KO = document.getElementById("study-ko");
  const studyTabs = document.getElementById("studyTabs");
  let studyActive = "en";
  function switchStudy(name) {
    studyActive = name;
    if (studyTabs) Array.prototype.forEach.call(studyTabs.children, function (b) { b.classList.toggle("active", b.dataset.study === studyActive); });
    ["en", "ko", "law", "interest"].forEach(function (n) {
      const p = document.getElementById("study-" + n); if (p) p.classList.toggle("active", studyActive === n);
    });
  }
  if (studyTabs) studyTabs.onclick = function (e) { const t = e.target.closest(".tab"); if (!t) return; switchStudy(t.dataset.study); };

  // 语音朗读：点开始 → 再点暂停 → 再点续读（不是从头读）
  let spUtter = null, spState = "idle", spLang = null, spCard = null;
  function cancelSpeech() { try { window.speechSynthesis.cancel(); } catch (e) {} spState = "idle"; spUtter = null; spCard = null; }
  function newUtter(text, lang) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = lang === "ko-KR" ? 0.9 : 0.92;
    u._text = text; u._lang = lang;
    return u;
  }
  // 英语朗读（英音 / 美音），同一段可暂停续读，按钮显示状态
  function speakEn(text, lang, btnId) {
    if (!("speechSynthesis" in window)) { toast("你的浏览器不支持朗读"); return; }
    const syn = window.speechSynthesis;
    const sameText = spUtter && spUtter._text === text, sameLang = spLang === lang;
    if (spState === "playing" && sameText && sameLang) { syn.pause(); spState = "paused"; paintEn("paused", btnId); return; }
    if (spState === "paused" && sameText && sameLang) { syn.resume(); spState = "playing"; paintEn("playing", btnId); return; }
    syn.cancel();
    const u = newUtter(text, lang);
    u.onend = function () { spState = "idle"; spUtter = null; paintEn("idle", btnId); };
    u.onerror = function () { spState = "idle"; spUtter = null; paintEn("idle", btnId); };
    spUtter = u; spLang = lang; spState = "playing"; syn.speak(u); paintEn("playing", btnId);
  }
  function paintEn(state, activeId) {
    ["enUk", "enUs"].forEach(function (id) {
      const b = document.getElementById(id); if (!b) return;
      const on = id === activeId;
      b.classList.toggle("reading", state === "playing" && on);
      b.classList.toggle("paused", state === "paused" && on);
      if (state === "idle" || !on) b.textContent = id === "enUk" ? "英音朗读" : "美音朗读";
      else b.textContent = (id === "enUk" ? "英音·" : "美音·") + (state === "playing" ? "朗读中" : "已暂停");
    });
  }
  // 韩语朗读（每张卡片独立状态）
  function speakKo(text, card) {
    if (!("speechSynthesis" in window)) { toast("你的浏览器不支持朗读"); return; }
    const syn = window.speechSynthesis;
    const same = spUtter && spUtter._text === text;
    if (spState === "playing" && spCard === card && same) { syn.pause(); spState = "paused"; paintKo(card, "paused"); return; }
    if (spState === "paused" && spCard === card && same) { syn.resume(); spState = "playing"; paintKo(card, "playing"); return; }
    syn.cancel();
    if (spCard && spCard !== card) paintKo(spCard, "idle");
    const u = newUtter(text, "ko-KR");
    u.onend = function () { spState = "idle"; spUtter = null; spCard = null; paintKo(card, "idle"); };
    u.onerror = function () { spState = "idle"; spUtter = null; spCard = null; paintKo(card, "idle"); };
    spUtter = u; spLang = "ko-KR"; spCard = card; spState = "playing"; syn.speak(u); paintKo(card, "playing");
  }
  function paintKo(card, state) {
    if (!card) return;
    card.classList.toggle("playing", state === "playing");
    card.classList.toggle("paused", state === "paused");
    const pb = card.querySelector(".ko-play");
    if (pb) pb.textContent = state === "playing" ? "⏸" : (state === "paused" ? "⏯" : "▶");
  }

  // 英语阅读：每日外刊（自动爬取）+ 轻松短文（带中文），可暂停/续读
  let enIdx = 0, enMode = "feed"; // feed = 外刊(英文原文) | lib = 轻松短文(带中文)
  let feedData = null;
  function enReadings() { return (C.english && C.english.readings) || []; }
  function renderEnglish() {
    const titleEl = document.getElementById("enTitle"), textEl = document.getElementById("enText"),
          zhEl = document.getElementById("enZh"), metaEl = document.getElementById("enMeta"),
          zhBtn = document.getElementById("enShowZh"), modeBtn = document.getElementById("enMode");
    if (enMode === "feed" && feedData) {
      titleEl.textContent = feedData.title || "今日外刊";
      textEl.textContent = feedData.en || "";
      zhEl.style.display = "none"; zhBtn.style.display = "none";
      metaEl.innerHTML = '<span class="en-src">来源：' + esc(feedData.source || "每日外刊") + '</span>' +
        (feedData.url ? ' <a class="en-link" href="' + esc(feedData.url) + '" target="_blank" rel="noopener">阅读原文 ↗</a>' : '');
      modeBtn.textContent = "轻松短文（带中文）";
    } else {
      const r = enReadings()[enIdx] || { title: "暂无", en: "", zh: "" };
      titleEl.textContent = r.title;
      textEl.textContent = r.en;
      zhEl.textContent = r.zh || "";
      zhEl.style.display = "none"; zhBtn.style.display = ""; zhBtn.textContent = "显示翻译";
      metaEl.innerHTML = '<span class="en-src">轻松练习 · 含中文注释</span>';
      modeBtn.textContent = "今日外刊";
    }
    document.getElementById("enNext").textContent = enMode === "feed" ? "换一篇" : "换一篇";
  }
  function loadFeed(cb) {
    fetchJSON("./data/english.json", 8000).then(function (j) {
      if (j && j.en && j.date === key) { feedData = j; if (enMode === "feed") renderEnglish(); }
      if (cb) cb();
    }).catch(function () { if (cb) cb(); });
  }
  renderEnglish();
  document.getElementById("enNext").onclick = function () {
    if (enMode === "lib") { const n = enReadings().length || 1; enIdx = (enIdx + 1) % n; }
    renderEnglish();
  };
  document.getElementById("enMode").onclick = function () {
    enMode = enMode === "feed" ? "lib" : "feed";
    cancelSpeech(); paintEn("idle", null);
    renderEnglish();
  };
  document.getElementById("enUk").onclick = function () { speakEn(document.getElementById("enText").textContent, "en-GB", "enUk"); };
  document.getElementById("enUs").onclick = function () { speakEn(document.getElementById("enText").textContent, "en-US", "enUs"); };
  document.getElementById("enShowZh").onclick = function () {
    const z = document.getElementById("enZh");
    const show = z.style.display === "none"; z.style.display = show ? "block" : "none";
    this.textContent = show ? "隐藏翻译" : "显示翻译";
  };
  loadFeed();

  // 韩语入门（常用词精简 + 四十音常驻，点一下朗读，再点暂停/续读）
  function makeKoCard(obj, zhOrSound) {
    const d = document.createElement("div"); d.className = "ko-card";
    d.innerHTML = '<button class="ko-play" type="button" aria-label="朗读">▶</button>' +
      '<div class="ko-main"><div class="ko">' + esc(obj.ko) + '</div>' +
      '<div class="rom">' + esc(obj.rom) + '</div>' +
      '<div class="zh">' + esc(zhOrSound) + '</div></div>';
    const say = function () { speakKo(obj.ko, d); };
    d.onclick = say;
    d.querySelector(".ko-play").onclick = function (e) { e.stopPropagation(); say(); };
    return d;
  }
  function renderKorean() {
    const words = (C.korean && C.korean.words) || [];
    const wg = document.getElementById("koWords"); wg.innerHTML = "";
    words.forEach(function (w) { wg.appendChild(makeKoCard(w, w.zh)); });
    const alpha = (C.korean && C.korean.alphabet) || {};
    const con = document.getElementById("koCon"), vow = document.getElementById("koVow");
    con.innerHTML = ""; vow.innerHTML = "";
    (alpha.consonants || []).forEach(function (c) { con.appendChild(makeKoCard(c, c.sound)); });
    (alpha.vowels || []).forEach(function (c) { vow.appendChild(makeKoCard(c, c.sound)); });
  }
  renderKorean();
  function renderStudy() { if (studyActive === "en") renderEnglish(enIdx); else if (studyActive === "ko") renderKorean(); else if (studyActive === "interest") renderInterest(); else renderLaw(); }

  // ---------- 法律法规：完整法条库（今日推荐置顶高亮） ----------
  function renderLaw() {
    const cfg = C.law || { enabled: true };
    if (!cfg.enabled) return;
    const box = document.getElementById("lawList"); if (!box) return;
    const db = C.lawDb || [];
    if (!db.length) { box.innerHTML = '<p class="hint">暂无法条数据</p>'; return; }
    const start = new Date();
    const doy = Math.floor((start - new Date(start.getFullYear(), 0, 0)) / 86400000);
    const n = cfg.count || 2;
    const pickSet = {};
    for (let i = 0; i < n; i++) pickSet[(doy + i) % db.length] = true;
    box.innerHTML = "";
    const todayWrap = document.createElement("div"); todayWrap.className = "law-today";
    todayWrap.innerHTML = '<div class="law-today-h">★ 今日推荐（' + n + ' 条）</div>';
    db.forEach(function (l, idx) {
      const d = document.createElement("div");
      d.className = "law-card" + (pickSet[idx] ? " today" : "");
      d.innerHTML = '<div class="law-from">' + esc(l.from || "") + '</div>' +
        '<div class="law-title">' + esc(l.title || "") + '</div>' +
        '<div class="law-content">' + esc(l.content || "") + '</div>' +
        '<div class="law-tip">解读 · ' + esc(l.tip || "") + '</div>';
      if (pickSet[idx]) todayWrap.appendChild(d); else box.appendChild(d);
    });
    if (todayWrap.children.length > 1) box.insertBefore(todayWrap, box.firstChild);
    const srcEl = document.getElementById("lawSource"); if (srcEl) srcEl.textContent = (cfg.source || "") + " · 共 " + db.length + " 条";
  }
  renderLaw();

  // ---------- 工作 ----------
  function renderWork() {
    const ul = document.getElementById("todoList"); const todos = loadStore("work_todos") || [];
    ul.innerHTML = "";
    todos.forEach(function (t, i) {
      const li = document.createElement("li");
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!t.done;
      cb.onchange = function () { todos[i].done = cb.checked; saveStore("work_todos", todos); renderWork(); };
      const sp = document.createElement("span"); sp.textContent = t.text;
      const del = document.createElement("button"); del.className = "ci-del"; del.textContent = "删除";
      del.onclick = function () { todos.splice(i, 1); saveStore("work_todos", todos); renderWork(); };
      li.appendChild(cb); li.appendChild(sp); li.appendChild(del); if (t.done) li.classList.add("done");
      ul.appendChild(li);
    });
    const pl = document.getElementById("projList"); pl.innerHTML = "";
    (C.work.projects || []).forEach(function (p) {
      const d = document.createElement("div"); d.style.margin = "10px 0";
      d.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px"><span>' + p.name + '</span><span class="hot-val">' + p.progress + '%</span></div><div class="bar"><div class="bar-fill" style="width:' + p.progress + '%"></div></div>';
      pl.appendChild(d);
    });
    renderTodoTab();
  }
  document.getElementById("todoAdd").onclick = function () { const inp = document.getElementById("todoInput"); const v = inp.value.trim(); if (!v) return; const todos = loadStore("work_todos") || []; todos.push({ text: v, done: false }); saveStore("work_todos", todos); inp.value = ""; renderWork(); };
  document.getElementById("todoInput").addEventListener("keydown", function (e) { if (e.key === "Enter") document.getElementById("todoAdd").click(); });
  renderWork();

  // ---------- 财富 ----------
  function renderWealth() {
    const cat = document.getElementById("wCat");
    if (!cat.dataset.filled) { (C.wealth.categories || []).forEach(function (c) { const o = document.createElement("option"); o.value = c; o.textContent = c; cat.appendChild(o); }); cat.dataset.filled = "1"; }
    const recs = loadStore("wealth_records") || [];
    const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    let out = 0, in_ = 0;
    recs.forEach(function (r) { if (r.date && r.date.indexOf(ym) === 0) { if (r.type === "支出") out += r.amount; else in_ += r.amount; } });
    document.getElementById("wealthSummary").innerHTML =
      '<div class="ov"><div class="ov-t">本月支出</div><div class="ov-v" style="color:#e0533d">¥' + out.toFixed(0) + '</div><div class="ov-s">预算 ¥' + (C.wealth.monthlyBudget || 0) + '</div></div>' +
      '<div class="ov"><div class="ov-t">剩余预算</div><div class="ov-v">¥' + ((C.wealth.monthlyBudget || 0) - out).toFixed(0) + '</div><div class="ov-s">本月收入 ¥' + in_.toFixed(0) + '</div></div>';
    const ul = document.getElementById("wealthList"); ul.innerHTML = "";
    recs.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || "") || b.id - a.id; }).slice(0, 10).forEach(function (r) {
      const li = document.createElement("li");
      li.innerHTML = '<span>' + r.cat + ' · ' + (r.note || "") + ' <span class="rd">' + r.date + '</span></span><span class="amt ' + (r.type === "支出" ? "out" : "in") + '">' + (r.type === "支出" ? "-" : "+") + "¥" + r.amount + '</span>';
      ul.appendChild(li);
    });
    if (!recs.length) ul.innerHTML = '<li style="color:var(--muted);justify-content:center">还没有记录</li>';
  }
  document.getElementById("wAdd").onclick = function () {
    const type = document.getElementById("wType").value; const cat = document.getElementById("wCat").value;
    const amt = parseFloat(document.getElementById("wAmount").value); const note = document.getElementById("wNote").value.trim();
    if (!(amt > 0)) { toast("金额要大于 0"); return; }
    const recs = loadStore("wealth_records") || []; recs.push({ id: Date.now(), date: key, type: type, cat: cat, amount: amt, note: note }); saveStore("wealth_records", recs);
    document.getElementById("wAmount").value = ""; document.getElementById("wNote").value = ""; renderWealth(); renderCalendar(); toast("已记录");
  };
  renderWealth();

  // ---------- 饮食运动（补剂 + 速览） ----------
  function renderDiet() {
    const sups = C.diet.supplements || []; const sd = day.supplements || {}; const sl = document.getElementById("supList"); sl.innerHTML = "";
    sups.forEach(function (s) {
      const li = document.createElement("li"); const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!sd[s];
      cb.onchange = function () { day.supplements = day.supplements || {}; day.supplements[s] = cb.checked; saveDay(key, day); };
      const sp = document.createElement("span"); sp.textContent = s; li.appendChild(cb); li.appendChild(sp); if (cb.checked) li.classList.add("done");
      sl.appendChild(li);
    });
    const meals = day.meals || {}; const recap = document.getElementById("dietRecap");
    const mtxt = [["早餐", meals.b], ["午餐", meals.l], ["晚餐", meals.d]].filter(function (x) { return x[1]; })
      .map(function (x) { return "<div><b>" + x[0] + "</b>：" + x[1] + "</div>"; }).join("");
    const ex = day.exercises || [];
    const etxt = ex.length ? ex.map(function (e) { return "<div>· " + (typeof e === "object" && e ? e.type + " " + (e.min || 0) + "分" : e) + "</div>"; }).join("") : "";
    recap.innerHTML = (mtxt || "<div class='hint'>今天还没记录三餐</div>") + (etxt ? "<div style='margin-top:6px'>" + etxt + "</div>" : "");
  }
  document.getElementById("toHealth").onclick = function () { showPanel("health"); };
  renderDiet();

  // ---------- 健康：三餐 / 运动 / 作息 ----------
  function renderHealthMeals() {
    const meals = day.meals || {};
    document.getElementById("hMealB").value = meals.b || ""; document.getElementById("hMealL").value = meals.l || ""; document.getElementById("hMealD").value = meals.d || "";
  }
  ["hMealB", "hMealL", "hMealD"].forEach(function (id) {
    document.getElementById(id).oninput = function () { day.meals = day.meals || {}; day.meals[{ hMealB: "b", hMealL: "l", hMealD: "d" }[id]] = this.value; saveDay(key, day); };
  });
  function renderHealthEx() {
    const ex = day.exercises || []; const exl = document.getElementById("hExList"); exl.innerHTML = "";
    ex.forEach(function (e, i) {
      const li = document.createElement("li"); const sp = document.createElement("span");
      sp.textContent = (typeof e === "object" && e) ? ((e.time ? e.time + " · " : "") + e.type + " · " + (e.min || 0) + " 分钟" + (e.level ? " · " + e.level : "")) : e;
      const del = document.createElement("button"); del.className = "ci-del"; del.textContent = "删除";
      del.onclick = function () { ex.splice(i, 1); day.exercises = ex; saveDay(key, day); renderHealthEx(); renderDiet(); };
      li.appendChild(sp); li.appendChild(del); exl.appendChild(li);
    });
  }
  document.getElementById("hExAdd").onclick = function () { const inp = document.getElementById("hExInput"); const v = inp.value.trim(); if (!v) return; const ex = day.exercises || []; ex.push(v); day.exercises = ex; saveDay(key, day); inp.value = ""; renderHealthEx(); renderDiet(); };
  document.getElementById("hExInput").addEventListener("keydown", function (e) { if (e.key === "Enter") document.getElementById("hExAdd").click(); });
  renderHealthMeals(); renderHealthEx();

  // 作息：先选睡觉时间（昨晚），再选起床时间（今早）。半小时一档，不怕滑过。
  // 判定标准（已规范）：7–8 小时最合适；<6 红灯，6–8 绿灯，8–10 黄灯，>10 红灯
  function fillTimeOptions(sel, startH, endH) {
    // 从 startH 到 endH（可跨零点），每 30 分钟一档
    sel.innerHTML = '<option value="">请选择</option>';
    let h = startH;
    while (true) {
      ["00", "30"].forEach(function (m) {
        const v = String(h % 24).padStart(2, "0") + ":" + m;
        const o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o);
      });
      if (h % 24 === endH) break;
      h = (h + 1) % 24;
    }
  }
  function sleepJudge(hours) {
    if (hours < 6)  return { color: "#e0533d", light: "red",    text: "只睡了这么点？红灯警告！身体是自己的，今晚早点睡好不好" };
    if (hours <= 8) return { color: "#2bb673", light: "green",  text: "绿灯通过～睡得刚刚好，今天必须元气满满" };
    if (hours <= 10) return { color: "#e0c02a", light: "yellow", text: "黄灯提示：睡得有点儿多啦，真是羡慕你这种想睡就睡的" };
    return { color: "#e0533d", light: "red", text: "红灯！超过 10 小时……你是怎么睡得着的，教教我" };
  }
  function renderSleep() {
    const s = day.sleep || {};
    const upSel = document.getElementById("sleepUp"), downSel = document.getElementById("sleepDown");
    if (!downSel.dataset.filled) { fillTimeOptions(downSel, 20, 4); downSel.dataset.filled = "1"; }  // 睡觉 20:00–04:30
    if (!upSel.dataset.filled) { fillTimeOptions(upSel, 4, 13); upSel.dataset.filled = "1"; }        // 起床 04:00–13:30
    downSel.value = s.down || ""; upSel.value = s.up || "";
    const judge = document.getElementById("sleepJudge"), lightEl = document.getElementById("sleepLight"), infoEl = document.getElementById("sleepInfo");
    if (!s.up || !s.down) { judge.style.display = "none"; return; }
    let a = s.down.split(":"), b = s.up.split(":");
    let mins = (Number(b[0]) * 60 + Number(b[1])) - (Number(a[0]) * 60 + Number(a[1]));
    if (mins <= 0) mins += 24 * 60;
    const h2 = Math.floor(mins / 60), m2 = mins % 60, hours = mins / 60;
    const j = sleepJudge(hours);
    judge.style.display = "flex";
    lightEl.style.background = j.color;
    lightEl.className = "sleep-light " + j.light;
    infoEl.innerHTML = "睡了约 <b>" + h2 + " 小时" + (m2 ? " " + m2 + " 分" : "") + "</b> · " + j.text;
    infoEl.style.color = j.color;
  }
  document.getElementById("sleepUp").onchange = function () { day.sleep = day.sleep || {}; day.sleep.up = this.value; saveDay(key, day); renderSleep(); };
  document.getElementById("sleepDown").onchange = function () { day.sleep = day.sleep || {}; day.sleep.down = this.value; saveDay(key, day); renderSleep(); };
  renderSleep();

  // ---------- 体检提醒 ----------
  const EXAM_KEY = "physical_exam";
  function loadExam() { return loadStore(EXAM_KEY); }
  function saveExam(o) { saveStore(EXAM_KEY, o); }
  function examState(d) {
    const interval = (C.health && C.health.examIntervalDays) || 180;
    const year = (C.health && C.health.examYearDays) || 365;
    if (d >= year) return { dim: "red", pin: true };            // 一年未检：持续置顶
    if (d >= interval) {
      if (d < interval + 7) return { dim: "red", pin: true };   // 刚到半年：连续一周提醒
      return { dim: "red", pin: false };                        // 之后回到底层（红色色带）
    }
    if (d >= interval - 30) return { dim: "orange", pin: false };// 临近：橙色
    return { dim: "green", pin: false };                        // 良好：绿色
  }
  const EXAM_DIM = {
    green:  ["#2bb673", "状态良好，保持就好"],
    orange: ["#e0922a", "快到半年啦，记得安排体检"],
    red:    ["#e0533d", "已超半年未体检，建议尽快安排"]
  };
  let examObj = loadExam();
  function renderExam() {
    const band = document.getElementById("examBand"), dot = document.getElementById("examDot"), txt = document.getElementById("examBandText");
    const banner = document.getElementById("examBanner"), issuesBox = document.getElementById("examIssues");
    if (!examObj || !examObj.lastDate) {
      txt.textContent = "还没记录体检时间";
      dot.style.background = "var(--muted)"; band.className = "exam-band";
      banner.style.display = "none"; issuesBox.innerHTML = "";
      return;
    }
    const d = daysBetween(examObj.lastDate, key);
    const st = examState(d); const info = EXAM_DIM[st.dim];
    txt.textContent = "距上次体检 " + d + " 天 · " + info[1];
    dot.style.background = info[0];
    band.className = "exam-band lv-" + st.dim;
    if (st.pin) {
      banner.style.display = "block";
      banner.style.borderColor = info[0];
      banner.innerHTML = "<span class='exam-banner-dot' style='background:" + info[0] + "'></span><span>" + info[1] + "（已 " + d + " 天）</span><button class='mini-btn' id='examBannerGo'>去更新</button>";
      const bg = document.getElementById("examBannerGo");
      if (bg) bg.onclick = function () { openExamModal(); };
    } else {
      banner.style.display = "none";
    }
    const issues = examObj.issues || [];
    issuesBox.innerHTML = issues.length ? "<h3 style='margin:12px 0 6px'>已记录的健康问题</h3>" : "";
    issues.forEach(function (it, i) {
      const d0 = document.createElement("div"); d0.className = "exam-issue";
      d0.innerHTML = "<div class='ei-top'><b>" + (it.text || "") + "</b><button class='ci-del'>删除</button></div><div class='ei-plan'>" + (it.plan || "") + "</div>";
      d0.querySelector(".ci-del").onclick = function () { examObj.issues.splice(i, 1); saveExam(examObj); renderExam(); toast("已删除该问题"); };
      issuesBox.appendChild(d0);
    });
  }
  function openExamModal() {
    const cur = examObj ? examObj.lastDate : "";
    const last = prompt("记录上次体检的日期（格式 2026-01-15，记不清可填大概日期）：", cur || key);
    if (last === null) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(last)) { toast("日期格式不对，请用 年-月-日"); return; }
    examObj = examObj || {}; examObj.lastDate = last; saveExam(examObj); renderExam();
    toast("已记录，下次体检提醒会按这个时间计算");
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  }
  function genPlan(text) {
    if (/视力|眼睛|近视/.test(text)) return "建议预约眼科检查；日常遵循 20-20-20 法则（每看屏 20 分钟，远眺 20 英尺外 20 秒），少熬夜。";
    if (/贫血|血色素|缺铁/.test(text)) return "多吃红肉、动物肝脏、深绿蔬菜补铁；餐后维 C 助吸收；1-2 个月后复查血常规。";
    if (/体重|肥胖|减脂|胖/.test(text)) return "每周 3-4 次中等强度运动（快走/游泳/骑行），控制精制糖与油炸；记录每日饮食，循序渐进。";
    if (/血压|高压|低压/.test(text)) return "每日固定时间测血压并记录；减盐（<5g/天）、规律作息、适度有氧运动；如持续偏高请就医。";
    if (/血糖|糖尿病/.test(text)) return "控制主食总量与升糖速度，饭后散步；定期监测空腹血糖；内分泌科随访。";
    if (/颈椎|腰椎|肩|脊椎/.test(text)) return "每坐 1 小时起身活动；做颈椎/腰椎拉伸；选合适枕头与座椅，避免低头久看手机。";
    if (/睡眠|失眠|熬夜/.test(text)) return "固定作息、睡前 1 小时远离电子屏；卧室保持黑暗安静；可尝试冥想或温牛奶助眠。";
    if (/牙齿|口腔|牙/.test(text)) return "每日刷牙两次+牙线；半年洗牙一次；有蛀牙/牙龈问题尽早看牙医。";
    return "建议预约相关科室复查，生活上保持规律作息、均衡饮食与适度运动，记录身体变化，必要时及时就医。";
  }
  document.getElementById("examSet").onclick = function () { openExamModal(); };
  document.getElementById("examBandBtn").onclick = function () { openExamModal(); };
  document.getElementById("examIssueAdd").onclick = function () {
    if (!examObj) examObj = {}; examObj.lastDate = examObj.lastDate || "";
    const t = prompt("记录这次发现的健康问题（如：视力下降、贫血、颈椎不适…）：");
    if (!t || !t.trim()) return;
    examObj.issues = examObj.issues || [];
    examObj.issues.push({ text: t.trim(), plan: genPlan(t) });
    saveExam(examObj); renderExam(); toast("已记录，并生成科学可行性建议");
  };
  renderExam();
  if (!examObj || !examObj.lastDate) {
    setTimeout(function () { openExamModal(); }, 700);
  } else {
    const ed = daysBetween(examObj.lastDate, key); const st = examState(ed);
    if (st.pin) {
      toast("体检提醒：距上次体检已 " + ed + " 天");
      if ("Notification" in window && Notification.permission === "granted") new Notification("体检提醒", { body: "距上次体检已 " + ed + " 天，记得安排哦" });
    }
  }

  // ---------- 出游计划 ----------
  function renderTravel() {
    const cfg = C.travel || { cities: {} };
    const chips = document.getElementById("travelChips"); chips.innerHTML = "";
    Object.keys(cfg.cities).forEach(function (city) {
      const b = document.createElement("button"); b.className = "mini-btn"; b.textContent = city;
      b.onclick = function () { document.getElementById("travelDest").value = city; showTravel(city); };
      chips.appendChild(b);
    });
    const dest = (document.getElementById("travelDest").value || "").trim();
    if (dest) showTravel(dest);
    else document.getElementById("travelOut").innerHTML = '<p class="hint">选择一个城市，或输入目的地查看攻略建议 ♡</p>';
    renderTravelList();
  }
  function travelPlanKey(city) { return "travel_plan_" + city; }
  function loadTravelPlan(city) {
    const p = loadStore(travelPlanKey(city)) || {};
    return { landmarks: p.landmarks || [], food: p.food || [], photo: p.photo || [], outfit: p.outfit || "", budget: p.budget || "" };
  }
  function saveTravelPlan(city, p) { saveStore(travelPlanKey(city), p); }
  function showTravel(city) {
    const cfg = C.travel || { cities: {} };
    const out = document.getElementById("travelOut");
    const t = cfg.cities[city];
    const plan = loadTravelPlan(city);
    const has = (t && (t.landmarks.length || t.food.length || t.photo.length)) || plan.landmarks.length || plan.food.length || plan.photo.length || plan.outfit || plan.budget;
    if (!has) {
      out.innerHTML = '<div class="travel-card"><p>没有「' + city + '」的内置攻略，但你可以自己添加收藏，也能直接去小红书看真实分享：</p>' + xhsBtns(city) + '</div>';
      return;
    }
    const dims = [
      { key: "landmarks", name: "地标打卡", base: t ? t.landmarks : [] },
      { key: "food", name: "必吃美食", base: t ? t.food : [] },
      { key: "photo", name: "拍照出片", base: t ? t.photo : [] }
    ];
    let html = '<div class="travel-card">';
    dims.forEach(function (dm) {
      html += '<h3>' + dm.name + '</h3><div class="tag-row" id="trav_' + dm.key + '">';
      (dm.base || []).forEach(function (s) { html += '<span class="tag">' + esc(s) + '</span>'; });
      (plan[dm.key] || []).forEach(function (s, i) {
        html += '<span class="tag custom" data-dim="' + dm.key + '" data-i="' + i + '">' + esc(s) + ' <b>✕</b></span>';
      });
      html += '</div><div class="row" style="margin-top:6px"><input class="flex-input trav-add" data-dim="' + dm.key + '" placeholder="添加一条' + dm.name + '…"><button class="btn primary trav-add-btn" data-dim="' + dm.key + '">添加</button></div>';
    });
    html += '<h3>穿搭建议</h3>';
    html += '<textarea class="trav-text" data-dim="outfit" placeholder="写写穿搭建议…">' + esc(plan.outfit || (t ? t.outfit : "")) + '</textarea>';
    html += '<h3>费用建议</h3>';
    html += '<textarea class="trav-text" data-dim="budget" placeholder="写写费用预算…">' + esc(plan.budget || (t ? t.budget : "")) + '</textarea>';
    html += '<h3>更多真实分享</h3>' + xhsBtns(city);
    html += '</div>';
    out.innerHTML = html;
    Array.prototype.forEach.call(out.querySelectorAll(".trav-add-btn"), function (b) {
      b.onclick = function () {
        const dm = b.dataset.dim; const inp = out.querySelector('.trav-add[data-dim="' + dm + '"]');
        const v = inp.value.trim(); if (!v) return;
        const pl = loadTravelPlan(city); pl[dm] = pl[dm] || []; pl[dm].push(v); saveTravelPlan(city, pl); showTravel(city);
      };
    });
    Array.prototype.forEach.call(out.querySelectorAll(".trav-text"), function (ta) {
      ta.oninput = function () { const pl = loadTravelPlan(city); pl[ta.dataset.dim] = ta.value; saveTravelPlan(city, pl); };
    });
    Array.prototype.forEach.call(out.querySelectorAll(".tag.custom"), function (sp) {
      sp.querySelector("b").onclick = function (e) {
        e.stopPropagation();
        const dm = sp.dataset.dim, i = parseInt(sp.dataset.i, 10);
        const pl = loadTravelPlan(city); pl[dm].splice(i, 1); saveTravelPlan(city, pl); showTravel(city);
      };
    });
  }
  function tag(s) { return '<span class="tag">' + s + '</span>'; }
  function xhsBtns(city) {
    const dims = [["地标", "地标打卡"], ["美食", "美食"], ["穿搭", "穿搭"], ["出片", "拍照出片"], ["费用", "花费攻略"]];
    return dims.map(function (d) {
      const kw = encodeURIComponent(city + " " + d[1]);
      return '<a class="xhs-btn" href="https://www.xiaohongshu.com/search_result?keyword=' + kw + '" target="_blank" rel="noopener">小红书 · ' + d[0] + '</a>';
    }).join("");
  }
  document.getElementById("travelDest").addEventListener("input", function () { showTravel(this.value.trim()); });
  document.getElementById("travelDest").addEventListener("blur", function () { renderTravel(); });
  function renderTravelList() {
    const list = loadStore("travel_checklist") || [];
    const ul = document.getElementById("travelList"); ul.innerHTML = "";
    list.forEach(function (it, i) {
      const li = document.createElement("li");
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!it.done;
      cb.onchange = function () { list[i].done = cb.checked; saveStore("travel_checklist", list); renderTravelList(); };
      const sp = document.createElement("span"); sp.textContent = it.text;
      const del = document.createElement("button"); del.className = "ci-del"; del.textContent = "删除";
      del.onclick = function () { list.splice(i, 1); saveStore("travel_checklist", list); renderTravelList(); };
      li.appendChild(cb); li.appendChild(sp); li.appendChild(del); if (it.done) li.classList.add("done");
      ul.appendChild(li);
    });
    if (!list.length) ul.innerHTML = '<li style="color:var(--muted);justify-content:center">还没有打卡项，添加你想做的事</li>';
  }
  document.getElementById("travelItemAdd").onclick = function () {
    const inp = document.getElementById("travelItem"); const v = inp.value.trim(); if (!v) return;
    const list = loadStore("travel_checklist") || []; list.push({ text: v, done: false }); saveStore("travel_checklist", list); inp.value = ""; renderTravelList();
  };
  document.getElementById("travelItem").addEventListener("keydown", function (e) { if (e.key === "Enter") document.getElementById("travelItemAdd").click(); });

  // ---------- 存钱计划日历 ----------
  let calY = now.getFullYear(), calM = now.getMonth();
  function renderCalendar() {
    const grid = document.getElementById("calGrid"), week = document.getElementById("calWeek"), monthEl = document.getElementById("calMonth");
    const recs = loadStore("wealth_records") || [];
    const ym = calY + "-" + String(calM + 1).padStart(2, "0");
    const byDay = {};
    recs.forEach(function (r) { if (r.date && r.date.indexOf(ym) === 0) { byDay[r.date.slice(8, 10)] = (byDay[r.date.slice(8, 10)] || 0) + (r.type === "花销" || r.type === "支出" ? -r.amount : r.amount); } });
    week.innerHTML = ["日", "一", "二", "三", "四", "五", "六"].map(function (w) { return "<span>" + w + "</span>"; }).join("");
    monthEl.textContent = calY + " 年 " + (calM + 1) + " 月";
    const first = new Date(calY, calM, 1).getDay();
    const days = new Date(calY, calM + 1, 0).getDate();
    let html = "";
    for (let i = 0; i < first; i++) html += "<span class='cal-cell empty'></span>";
    for (let d = 1; d <= days; d++) {
      const ds = String(d).padStart(2, "0");
      const net = byDay[ds] || 0;
      const cls = net > 0 ? "pos" : net < 0 ? "neg" : "";
      const isToday = (calY === now.getFullYear() && calM === now.getMonth() && d === now.getDate());
      html += "<span class='cal-cell " + cls + (isToday ? " today" : "") + "' data-d='" + ds + "'>" +
        "<b>" + d + "</b>" + (net ? "<i>" + (net > 0 ? "+" : "") + Math.round(net) + "</i>" : "") + "</span>";
    }
    grid.innerHTML = html;
    Array.prototype.forEach.call(grid.querySelectorAll(".cal-cell[data-d]"), function (c) {
      c.onclick = function () { openCalForm(calY + "-" + String(calM + 1).padStart(2, "0") + "-" + c.dataset.d); };
    });
    let monthNet = 0; recs.forEach(function (r) { if (r.date && r.date.indexOf(ym) === 0) monthNet += (r.type === "花销" || r.type === "支出" ? -r.amount : r.amount); });
    const goal = (C.wealth && C.wealth.savingsGoal) || 0;
    const pct = goal > 0 ? Math.min(100, Math.max(0, (monthNet / goal) * 100)) : 0;
    document.getElementById("savGoalHint").innerHTML = "本月净存 <b style='color:" + (monthNet >= 0 ? "#2bb673" : "#e0533d") + "'>¥" + monthNet.toFixed(0) + "</b> · 目标 ¥" + goal +
      " <div class='bar' style='margin-top:6px'><div class='bar-fill' style='width:" + pct + "%'></div></div>";
  }
  let calSelDate = "";
  function renderCalDetail(date) {
    const box = document.getElementById("calDetail"); if (!box) return;
    const recs = (loadStore("wealth_records") || []).filter(function (r) { return r.date === date; });
    if (!recs.length) { box.innerHTML = '<p class="hint" style="margin:0">这一天还没有记录，下面补记一笔吧。</p>'; return; }
    let saved = 0, spent = 0;
    recs.forEach(function (r) { if (r.type === "支出") spent += r.amount; else saved += r.amount; });
    let html = '<div class="cal-summary"><span class="pos">存入 ¥' + saved.toFixed(0) + '</span><span class="neg">花销 ¥' + spent.toFixed(0) + '</span><span class="net">结余 ¥' + (saved - spent).toFixed(0) + '</span></div>';
    html += '<ul class="cal-rec">';
    recs.forEach(function (r, i) {
      const globalIdx = (loadStore("wealth_records") || []).findIndex(function (x) { return x.id === r.id; });
      const cls = r.type === "支出" ? "out" : "in";
      html += '<li><span>' + (r.type === "支出" ? "花销" : "存款") + ' · ' + esc(r.note || r.cat || "") + '</span>' +
        '<span class="amt ' + cls + '">' + (r.type === "支出" ? "-" : "+") + "¥" + r.amount + '</span>' +
        '<button class="ci-del" data-i="' + globalIdx + '">删</button></li>';
    });
    html += '</ul>';
    box.innerHTML = html;
    Array.prototype.forEach.call(box.querySelectorAll(".ci-del"), function (b) {
      b.onclick = function () {
        const arr = loadStore("wealth_records") || []; arr.splice(parseInt(b.dataset.i, 10), 1); saveStore("wealth_records", arr);
        renderCalDetail(date); renderCalendar(); renderWealth(); toast("已删除该条记录");
      };
    });
  }
  function openCalForm(date) {
    calSelDate = date;
    document.getElementById("calDateLabel").textContent = "日期：" + date + (date < key ? "（补记过往）" : date > key ? "（提前记）" : "");
    document.getElementById("calAmt").value = ""; document.getElementById("calNote").value = "";
    document.getElementById("calType").value = "存款";
    document.getElementById("calForm").style.display = "block";
    renderCalDetail(date);
  }
  document.getElementById("calSave").onclick = function () {
    const amt = parseFloat(document.getElementById("calAmt").value);
    if (!(amt > 0)) { toast("金额要大于 0"); return; }
    const type = document.getElementById("calType").value === "花销" ? "支出" : "收入";
    const cat = type === "支出" ? "其他" : "存款";
    const note = document.getElementById("calNote").value.trim();
    const recs = loadStore("wealth_records") || []; recs.push({ id: Date.now(), date: calSelDate, type: type, cat: cat, amount: amt, note: note });
    saveStore("wealth_records", recs);
    renderCalDetail(calSelDate); renderCalendar(); renderWealth(); toast("已记录 " + calSelDate);
  };
  document.getElementById("calCancel").onclick = function () { document.getElementById("calForm").style.display = "none"; };
  document.getElementById("calPrev").onclick = function () { calM--; if (calM < 0) { calM = 11; calY--; } renderCalendar(); };
  document.getElementById("calNext").onclick = function () { calM++; if (calM > 11) { calM = 0; calY++; } renderCalendar(); };

  // 预算 / 存钱目标 编辑
  document.getElementById("budgetEdit").onclick = function () {
    const p = document.getElementById("budgetPanel");
    p.style.display = p.style.display === "none" ? "block" : "none";
    if (p.style.display === "block") {
      document.getElementById("bBudget").value = (C.wealth && C.wealth.monthlyBudget) || 0;
      document.getElementById("bGoal").value = (C.wealth && C.wealth.savingsGoal) || 0;
    }
  };
  document.getElementById("budgetSave").onclick = function () {
    C.wealth = C.wealth || {};
    C.wealth.monthlyBudget = parseFloat(document.getElementById("bBudget").value) || 0;
    C.wealth.savingsGoal = parseFloat(document.getElementById("bGoal").value) || 0;
    const ov = loadStore("app_settings") || {}; ov.wealth = C.wealth; saveStore("app_settings", ov);
    document.getElementById("budgetPanel").style.display = "none";
    renderWealth(); renderCalendar(); toast("预算 / 目标已保存");
  };


  // ---------- 设置 ----------
  function fillSettings() {
    document.getElementById("sName").value = C.friendName || "";
    document.getElementById("sCityName").value = (C.city && C.city.name) || "";
    document.getElementById("sLat").value = (C.city && C.city.lat) || "";
    document.getElementById("sLon").value = (C.city && C.city.lon) || "";
    document.getElementById("sGift").value = C.giftLine || "";
  }
  fillSettings();
  document.getElementById("sSave").onclick = function () {
    const ov = {
      friendName: document.getElementById("sName").value.trim() || "你",
      giftLine: document.getElementById("sGift").value.trim(),
      city: { name: document.getElementById("sCityName").value.trim() || "本地", lat: parseFloat(document.getElementById("sLat").value) || 39.9042, lon: parseFloat(document.getElementById("sLon").value) || 116.4074 }
    };
    Object.assign(C, ov); saveStore("app_settings", ov);
    document.getElementById("who").textContent = C.friendName; document.getElementById("brandName").textContent = C.friendName + " 的助手";
    document.getElementById("gift").textContent = C.giftLine; document.title = C.friendName + " 的每日助手";
    document.getElementById("sHint").textContent = "已保存，刷新后也会保留"; toast("设置已保存");
  };

  // ---------- 首页 ----------
  function renderHome() {
    paintCups(); renderHomeNote(); renderHomeTodos();
  }

  // 今日心情打卡：emoji 心情 + 想说的话 + 确认按钮
  const HOME_EMOJIS = [
    { e: "😊", l: "开心" }, { e: "😌", l: "放松" }, { e: "🥰", l: "被爱" }, { e: "😇", l: "平和" },
    { e: "😐", l: "平淡" }, { e: "🤔", l: "思考" }, { e: "😍", l: "喜欢" }, { e: "😎", l: "得意" },
    { e: "😴", l: "困了" }, { e: "🤒", l: "不舒服" }, { e: "😢", l: "难过" }, { e: "😠", l: "生气" }
  ];
  function renderHomeNote() {
    const box = document.getElementById("homeMoods"); if (!box) return;
    box.innerHTML = "";
    const sel = day.homeMood;
    HOME_EMOJIS.forEach(function (m, i) {
      const b = document.createElement("button"); b.className = "emoji" + (sel === i ? " sel" : ""); b.textContent = m.e; b.title = m.l;
      b.onclick = function () { day.homeMood = i; saveDay(key, day); renderHomeNote(); toast("今天的心情：" + m.l); };
      box.appendChild(b);
    });
    const note = document.getElementById("homeNote"); note.value = day.homeNote || "";
    document.getElementById("homeNoteSaved").textContent = day.homeNote ? "已打卡 ♡" : "";
    const saveBtn = document.getElementById("homeMoodSave");
    if (saveBtn) saveBtn.onclick = function () {
      day.homeNote = note.value.trim();
      saveDay(key, day);
      document.getElementById("homeNoteSaved").textContent = "今日心情已打卡 ♡";
      toast("今日心情已打卡 ♡");
    };
  }

  // 首页待办（复用 work_todos，支持 DDL + 优先级：重要红 / 比较重要橙 / 一般绿；超时整条红）
  function renderHomeTodos() {
    const ul = document.getElementById("homeTodoList"); if (!ul) return;
    const todos = loadStore("work_todos") || [];
    ul.innerHTML = "";
    todos.forEach(function (t, i) {
      const li = document.createElement("li");
      const over = t.ddl && !t.done && daysBetween(key, t.ddl) < 0;
      const color = over ? "#e0533d" : PRIO_COLOR[t.prio || "一般"];
      li.style.borderLeft = "4px solid " + color;
      if (over) li.classList.add("overdue");
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!t.done;
      cb.onchange = function () { todos[i].done = cb.checked; saveStore("work_todos", todos); renderHomeTodos(); renderWork(); renderTodoTab(); };
      const sp = document.createElement("span");
      sp.innerHTML = esc(t.text) +
        '<small class="todo-meta" style="color:' + color + '">' +
        (t.prio || "一般") + (t.ddl ? " · 最晚 " + esc(t.ddl.slice(5)) : "") + (over ? " · 已超时！" : "") + "</small>";
      const del = document.createElement("button"); del.className = "ci-del"; del.textContent = "删除";
      del.onclick = function () { todos.splice(i, 1); saveStore("work_todos", todos); renderHomeTodos(); renderWork(); renderTodoTab(); };
      li.appendChild(cb); li.appendChild(sp); li.appendChild(del); if (t.done) li.classList.add("done");
      ul.appendChild(li);
    });
    if (!todos.length) ul.innerHTML = '<li style="color:var(--muted);justify-content:center">还没有待办，加一条吧</li>';
    renderTodoTab();
  }
  const hTodoInput = document.getElementById("homeTodoInput");
  if (hTodoInput) {
    document.getElementById("homeTodoAdd").onclick = function () {
      const v = hTodoInput.value.trim(); if (!v) return;
      const ddl = document.getElementById("homeTodoDdl").value || "";
      const prio = document.getElementById("homeTodoPrio").value || "一般";
      const todos = loadStore("work_todos") || []; todos.push({ text: v, done: false, ddl: ddl, prio: prio }); saveStore("work_todos", todos);
      hTodoInput.value = ""; document.getElementById("homeTodoDdl").value = "";
      renderHomeTodos(); renderWork();
    };
    hTodoInput.addEventListener("keydown", function (e) { if (e.key === "Enter") document.getElementById("homeTodoAdd").click(); });
  }

  // ---------- 首页交互模块：敲木鱼 / 水杯 / 名言 / 拍一拍 ----------
  // 赛博木鱼（真实木质敲击声，data/woodfish.wav；连击可叠加）
  let wfAudio = null;
  function playWood() {
    try {
      if (!wfAudio) { wfAudio = new Audio("data/woodfish.wav"); wfAudio.preload = "auto"; }
      const a = wfAudio.cloneNode(true); a.volume = 0.9;
      const p = a.play(); if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function initWoodfish() {
    const wf = document.getElementById("woodfish"); if (!wf) return;
    const mc = document.getElementById("meritCount"), mn = document.getElementById("meritNote");
    const lines = (C.home && C.home.woodfish && C.home.woodfish.lines) || ["功德 +1"];
    const mk = "merit_" + key;
    mc.textContent = loadStore(mk) || 0;
    wf.onclick = function () {
      const n = (parseInt(mc.textContent, 10) || 0) + 1; mc.textContent = n; saveStore(mk, n);
      playWood();
      wf.classList.remove("tap"); void wf.offsetWidth; wf.classList.add("tap");
      mn.textContent = lines[Math.floor(Math.random() * lines.length)];
    };
  }

  // 喝水 8 杯（单列 · 水滴 💧 · 点亮）
  function paintCups() {
    const box = document.getElementById("cups"); if (!box) return;
    const g = C.waterGoal || 8; const n = day.water || 0;
    box.innerHTML = "";
    for (let i = 0; i < g; i++) {
      const c = document.createElement("button"); c.className = "cup" + (i < n ? " on" : ""); c.textContent = "💧";
      c.title = "第 " + (i + 1) + " 杯";
      c.onclick = function () { day.water = (i < n) ? i : i + 1; saveDay(key, day); paintCups(); paintWater(); if (day.water >= g) toast("今天喝水目标达成 ♡"); };
      box.appendChild(c);
    }
    const wh = document.getElementById("waterHint"); if (wh) wh.textContent = n + " / " + g + " 杯" + (n >= g ? " · 已达标" : "");
  }
  function initHomeCtrls() {
    const minus = document.getElementById("waterMinusHome"); if (minus) minus.onclick = function () { day.water = Math.max(0, (day.water || 0) - 1); saveDay(key, day); paintCups(); paintWater(); };
    const reset = document.getElementById("waterResetHome"); if (reset) reset.onclick = function () { day.water = 0; saveDay(key, day); paintCups(); paintWater(); toast("已重置今日喝水"); };
  }

  // 名言：每天一句（按日期确定，不自动滚动）
  function initQuotes() {
    const box = document.getElementById("quoteBox"); if (!box) return;
    const arr = window.APP_QUOTES || [];
    if (!arr.length) { box.innerHTML = '<p class="hint">暂无名言</p>'; return; }
    let idx = 0;
    try { const base = new Date(key + "T00:00:00"); idx = (Math.floor(base.getTime() / 86400000) % arr.length + arr.length) % arr.length; } catch (e) {}
    function show() {
      const q = arr[idx];
      box.classList.remove("show"); void box.offsetWidth;
      box.innerHTML = '<div class="q-text">' + esc(q.q) + '</div><div class="q-author">—— ' + esc(q.a) + '</div>';
      box.classList.add("show");
    }
    show();
    const nx = document.getElementById("quoteNext"); if (nx) nx.onclick = function () { idx = (idx + 1) % arr.length; show(); };
  }

  // 拍一拍 每日小记（做完当天折叠，仍可在记录生活继续）
  function renderPrompts() {
    const box = document.getElementById("prompts"); if (!box) return;
    const list = (C.home && C.home.prompts) || [];
    const done = day.prompts || {};
    box.innerHTML = "";
    list.forEach(function (p) {
      const finished = !!done[p.id];
      const d = document.createElement("div"); d.className = "prompt" + (finished ? " done" : "");
      d.innerHTML = '<span class="p-icon">' + p.icon + '</span><span class="p-text">' + esc(p.text) + '</span>';
      if (finished) {
        const ok = document.createElement("span"); ok.className = "p-done"; ok.textContent = "已完成 ✓"; d.appendChild(ok);
      } else {
        const btn = document.createElement("button"); btn.className = "btn primary p-btn"; btn.textContent = "去做";
        btn.onclick = function () { doPrompt(p); };
        d.appendChild(btn);
      }
      box.appendChild(d);
    });
  }
  function doPrompt(p) {
    if (p.action === "photo") { showPanel("life"); setTimeout(function () { const inp = document.getElementById("snapInput"); if (inp) inp.click(); }, 150); }
    else if (p.action === "weather") { const st = todoStats(); toast("今天共 " + st.total + " 项待办" + (st.soon + st.overdue ? "，" + (st.soon + st.overdue) + " 个即将超时" : "，加油")); }
    else if (p.action === "mood") { showPanel("health"); }
    day.prompts = day.prompts || {}; day.prompts[p.id] = true; saveDay(key, day); renderPrompts();
    if (p.action !== "photo") toast("已记下：" + p.text);
  }

  // ---------- 每日一问：答案之书 ----------
  function renderAnswer() {
    const box = document.getElementById("answerBox");
    const note = document.getElementById("answerNote");
    const todayEl = document.getElementById("answerToday");
    const book = (C.mystic && C.mystic.answers) || [];
    const todayAnswer = loadStore("answer_today_" + key);
    function draw(again) {
      if (!book.length) return;
      const a = book[Math.floor(Math.random() * book.length)];
      box.textContent = a;
      box.classList.remove("show"); void box.offsetWidth; box.classList.add("show");
      note.textContent = again ? "换了个念头，再听听看。" : "答案之书说：";
      saveStore("answer_today_" + key, a);
      todayEl.textContent = a;
    }
    document.getElementById("answerDraw").onclick = function () { draw(false); };
    document.getElementById("answerAgain").onclick = function () { draw(true); };
    if (todayAnswer) { box.textContent = todayAnswer; todayEl.textContent = todayAnswer; note.textContent = "这是你今天抽过的答案 ♡"; }
    else { box.textContent = "？"; todayEl.textContent = "还没有"; note.textContent = ""; }
  }

  // ---------- 每日一问：塔罗（点击才出结果；正/逆位 + 解读 + 匹配激励语） ----------
  const TAROT_CHEER = {
    "愚者":   { up: "带着好奇出发吧，世界会给勇敢的人让路。", rev: "慢一点没关系，看清路再迈步，你依然可以出发。" },
    "魔术师": { up: "你手里的牌已经够好了，大胆去创造。", rev: "别怀疑自己的本事，把拖着的那件事今天就开个头。" },
    "女祭司": { up: "相信你的直觉，它比你以为的更聪明。", rev: "静下来听听内心的声音，答案其实你早就知道。" },
    "皇后":   { up: "温柔也是一种力量，好好爱自己，丰盛自然会来。", rev: "先把自己照顾好，你不需要为所有人负责。" },
    "皇帝":   { up: "稳住节奏，按你的规划走，你掌控得住。", rev: "松一松手也没关系，不必事事都攥得那么紧。" },
    "教皇":   { up: "前人的经验值得听，站在肩膀上看得更远。", rev: "规则是参考不是枷锁，走出自己的路也很好。" },
    "恋人":   { up: "跟随真心去选择，爱和被爱你都值得。", rev: "选择难免纠结，但忠于自己的那颗心不会错。" },
    "战车":   { up: "目标就在前方，踩下油门，胜利是你的。", rev: "先定方向再发力，你的冲劲儿谁也拦不住。" },
    "力量":   { up: "真正的强大是温柔而坚定，你一直都有。", rev: "别怀疑自己，你比想象中坚强得多。" },
    "隐士":   { up: "独处不是孤独，是在为更好的自己充电。", rev: "别把自己关太久，世界还有很多光等你。" },
    "命运之轮": { up: "好运的齿轮已经开始转动，接住它！", rev: "低谷只是轮回的一段，转上去只是时间问题。" },
    "正义":   { up: "你做的每一分努力，都会被公平地回报。", rev: "问心无愧就好，时间会还你一个公道。" },
    "倒吊人": { up: "换个角度看，眼前的停顿也许是最好的安排。", rev: "别再为不值得的事消耗自己，该放就放。" },
    "死神":   { up: "旧的结束是新的开始，勇敢告别，前面更好。", rev: "改变虽然难，但你值得一个全新的开始。" },
    "节制":   { up: "不急不躁，细水长流，你的节奏刚刚好。", rev: "累了就歇歇，找回平衡再出发也不迟。" },
    "恶魔":   { up: "看见执念就是解脱的开始，你有选择权。", rev: "你正在挣脱束缚，再坚持一下，自由就在前面。" },
    "高塔":   { up: "崩塌的是旧框架，站上废墟你会看到新天地。", rev: "有些改变躲不掉，但你比任何风浪都稳。" },
    "星星":   { up: "希望正在向你眨眼，继续相信，继续走。", rev: "暂时的迷路不算什么，你的星光一直都在。" },
    "月亮":   { up: "看不清的时候就慢慢走，天亮之后一切明朗。", rev: "迷雾正在散开，真相和安心都在路上。" },
    "太阳":   { up: "今天的你自带光芒，尽情发光就好！", rev: "阴影只是暂时的，你的太阳很快就会升起来。" },
    "审判":   { up: "这是重新出发的号角，过去翻篇，未来可期。", rev: "别再自我否定，你已经比昨天更好了。" },
    "世界":   { up: "圆满正在到来，你值得这一切的美好。", rev: "还差一点点就完成了，别停，终点就在眼前。" }
  };
  function renderTarot() {
    const deck = (C.mystic && C.mystic.tarot) || [];
    const back = document.getElementById("tarotBack");
    const card = document.getElementById("tarotCard");
    const nameEl = document.getElementById("tarotName");
    const enEl = document.getElementById("tarotEn");
    const oriEl = document.getElementById("tarotOri");
    const readEl = document.getElementById("tarotRead");
    const cheerEl = document.getElementById("tarotCheer");
    const note = document.getElementById("tarotNote");
    function show(i, upright, isDaily) {
      const c = deck[i]; if (!c) return;
      back.style.display = "none";
      card.style.display = "block";
      card.classList.remove("flip"); void card.offsetWidth; card.classList.add("flip");
      nameEl.textContent = c.name; enEl.textContent = c.en;
      oriEl.innerHTML = upright
        ? '<span class="ori-badge up">正位 ↑</span>'
        : '<span class="ori-badge rev">逆位 ↓</span>';
      readEl.innerHTML = "<b>解读：</b>" + esc(upright ? c.up : c.rev);
      const cheer = TAROT_CHEER[c.name];
      cheerEl.textContent = "「" + (cheer ? (upright ? cheer.up : cheer.rev) : "无论抽到什么牌，认真生活的人运气都不会差。") + "」";
      note.textContent = isDaily ? "这是你今天的专属牌，当天稳定不变。" : "随心再抽的一张，参考看看。";
    }
    function dailySeed() {
      const d = new Date();
      return d.getFullYear() * 1000 + (d.getMonth() + 1) * 40 + d.getDate();
    }
    function drawDaily() {
      const seed = dailySeed();
      show(seed % deck.length, (seed % 7) % 2 === 0, true); // 牌面与正逆位当天稳定
    }
    function reset() {
      back.style.display = "";
      card.style.display = "none";
      note.textContent = "";
    }
    back.onclick = drawDaily;
    document.getElementById("tarotDaily").onclick = drawDaily;
    document.getElementById("tarotShuffle").onclick = function () { show(Math.floor(Math.random() * deck.length), Math.random() < 0.5, false); };
    reset(); // 进入页面只显示牌背，点击后才出结果
  }

  // ---------- 每日一问：灵签 ----------
  function renderOracle() {
    const slips = (C.mystic && C.mystic.oracle) || [];
    const box = document.getElementById("oracleBox");
    const lvl = document.getElementById("oracleLevel");
    const no = document.getElementById("oracleNo");
    const poem = document.getElementById("oraclePoem");
    const meaning = document.getElementById("oracleMeaning");
    function lvlClass(l) {
      if (l.indexOf("上上") >= 0) return "best";
      if (l.indexOf("上") >= 0) return "up";
      if (l.indexOf("中") >= 0) return "mid";
      if (l.indexOf("下下") >= 0) return "worst";
      return "down";
    }
    document.getElementById("oracleDraw").onclick = function () {
      if (!slips.length) return;
      const s = slips[Math.floor(Math.random() * slips.length)];
      lvl.textContent = s.level; lvl.className = "oracle-level lv-" + lvlClass(s.level);
      no.textContent = "第 " + s.no + " 签";
      poem.textContent = s.poem; meaning.textContent = s.meaning;
      box.classList.remove("show"); void box.offsetWidth; box.classList.add("show");
    };
    // 复位
    lvl.textContent = "—"; lvl.className = "oracle-level"; no.textContent = ""; poem.textContent = ""; meaning.textContent = "";
    box.classList.remove("show");
  }

  // ---------- 运动健身（打卡 + 近14天热力图） ----------
  const EX_TYPES = (C.diet && C.diet.exerciseTypes) || ["跑步", "走路", "瑜伽", "健身", "跳绳", "游泳", "骑车", "拉伸", "羽毛球", "跳舞"];
  let exSelType = EX_TYPES[0];
  function renderExercise() {
    const box = document.getElementById("exTypes"); if (!box) return;
    box.innerHTML = "";
    EX_TYPES.forEach(function (t) {
      const b = document.createElement("button");
      b.className = "ex-chip" + (t === exSelType ? " sel" : "");
      b.textContent = t;
      b.onclick = function () { exSelType = t; renderExercise(); };
      box.appendChild(b);
    });
    document.getElementById("exSave").onclick = function () {
      const min = parseInt(document.getElementById("exMin").value, 10);
      if (!min || min <= 0) { toast("先填一下运动了多少分钟哦"); return; }
      const level = document.getElementById("exLevel").value;
      const time = document.getElementById("exTime") ? document.getElementById("exTime").value : "";
      const ex = day.exercises || [];
      ex.push({ type: exSelType, min: min, level: level, time: time });
      day.exercises = ex; saveDay(key, day);
      document.getElementById("exMin").value = "";
      document.getElementById("exSaved").textContent = "已记录：" + (time ? time + " " : "") + exSelType + " " + min + " 分钟（" + level + "）";
      toast("运动打卡成功 ♡");
      renderExHeat(); renderExList(); renderHealthEx(); renderDiet();
    };
    renderExHeat(); renderExList();
  }
  function exMinOfDay(k) {
    const d = loadDay(k); let sum = 0;
    (d.exercises || []).forEach(function (e) { sum += (typeof e === "object" && e && e.min) ? Number(e.min) : (typeof e === "string" ? 20 : 0); });
    return sum;
  }
  function renderExHeat() {
    const box = document.getElementById("exHeat"); if (!box) return;
    box.innerHTML = "";
    for (let i = 13; i >= 0; i--) {
      const k = addDays(key, -i);
      const min = exMinOfDay(k);
      const cell = document.createElement("div");
      const lv = min <= 0 ? 0 : min < 20 ? 1 : min < 40 ? 2 : min < 60 ? 3 : 4;
      cell.className = "ex-cell lv" + lv;
      cell.title = k.slice(5) + "：" + (min > 0 ? min + " 分钟" : "未运动");
      const lab = document.createElement("span"); lab.className = "ex-cell-day"; lab.textContent = k.slice(8);
      cell.appendChild(lab);
      box.appendChild(cell);
    }
  }
  function renderExList() {
    const ul = document.getElementById("exList2"); if (!ul) return;
    const ex = day.exercises || [];
    ul.innerHTML = "";
    ex.forEach(function (e, i) {
      const li = document.createElement("li");
      const sp = document.createElement("span");
      sp.textContent = (typeof e === "object" && e) ? ((e.time ? e.time + " · " : "") + e.type + " · " + e.min + " 分钟 · 强度" + (e.level || "中")) : String(e);
      const del = document.createElement("button"); del.className = "ci-del"; del.textContent = "删除";
      del.onclick = function () { ex.splice(i, 1); day.exercises = ex; saveDay(key, day); renderExHeat(); renderExList(); renderHealthEx(); renderDiet(); };
      li.appendChild(sp); li.appendChild(del);
      ul.appendChild(li);
    });
    if (!ex.length) ul.innerHTML = '<li style="color:var(--muted);justify-content:center">今天还没运动，动一动更开心</li>';
  }

  // ---------- 美食盲盒（点盒子开箱，每次文案不同） ----------
  const LIFE = window.APP_LIFE || {};
  const BOX_EMOJIS = ["🎁", "📦", "🎀", "🧧", "🪄", "🎊", "🍱", "🛍️"];
  const FOOD_LINES = [
    "锵锵——命运之盒为你打开：<strong>{name}</strong>！",
    "盒子里蹦出来的是……<strong>{name}</strong>！今天就它了！",
    "哇哦，手气不错，开出了 <strong>{name}</strong>～",
    "叮！宇宙的安排是 <strong>{name}</strong>，别犹豫啦。",
    "缘分让你今天遇到 <strong>{name}</strong>，去吃就对了！",
    "盲盒之神说：<strong>{name}</strong> 在等你翻牌子。",
    "恭喜抽中隐藏款干饭选项：<strong>{name}</strong>！",
    "咚咚咚——今日份快乐由 <strong>{name}</strong> 承包！",
    "闭眼选的都是最好的：<strong>{name}</strong>，冲！",
    "开出来的是 <strong>{name}</strong>，闻到香味了吗？"
  ];
  let foodCat = "全部", boxOpening = false;
  function renderFoodBoxes() {
    const grid = document.getElementById("foodBoxes"); if (!grid) return;
    grid.innerHTML = "";
    BOX_EMOJIS.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (em, i) {
      const b = document.createElement("button");
      b.className = "blind-box";
      b.innerHTML = '<span class="bb-emoji">' + em + '</span><span class="bb-q">?</span>';
      b.onclick = function () { openBox(b); };
      grid.appendChild(b);
    });
  }
  function openBox(btn) {
    if (boxOpening) return;
    const all = LIFE.foodWheel || [];
    const pool = foodCat === "全部" ? all : all.filter(function (f) { return f.cat === foodCat; });
    if (!pool.length) { toast("这个品类还没有内容"); return; }
    boxOpening = true;
    btn.classList.add("shaking");
    const res = document.getElementById("foodResult");
    res.innerHTML = '<span style="color:var(--muted)">盒子晃啊晃，好像有什么要出来了……</span>';
    setTimeout(function () {
      btn.classList.remove("shaking");
      btn.classList.add("opened");
      const it = pool[Math.floor(Math.random() * pool.length)];
      const line = FOOD_LINES[Math.floor(Math.random() * FOOD_LINES.length)].replace("{name}", esc(it.name));
      btn.querySelector(".bb-q").textContent = "✦";
      res.innerHTML =
        '<div class="food-hit">' + line + "</div>" +
        '<div class="food-hit-sub">' + esc(it.cat) + (it.tip ? " · " + esc(it.tip) : "") + "</div>";
      day.foodPick = it.name; saveDay(key, day);
      toast("美食盲盒开出：" + it.name);
      boxOpening = false;
    }, 1200);
  }
  function renderFood() {
    const catBox = document.getElementById("foodCats"); if (!catBox) return;
    catBox.innerHTML = "";
    (LIFE.foodCats || ["全部"]).forEach(function (c) {
      const b = document.createElement("button");
      b.className = "food-cat" + (c === foodCat ? " sel" : "");
      b.textContent = c;
      b.onclick = function () { if (boxOpening) return; foodCat = c; document.getElementById("foodResult").innerHTML = ""; renderFood(); renderFoodBoxes(); };
      catBox.appendChild(b);
    });
    const again = document.getElementById("foodAgain");
    if (again) again.onclick = function () { if (boxOpening) return; document.getElementById("foodResult").innerHTML = ""; renderFoodBoxes(); };
    if (!document.getElementById("foodBoxes").children.length) renderFoodBoxes();
  }

  // ---------- 兴趣拓展（填写兴趣 → 自动生成 1 个月计划） ----------
  function renderInterest() {
    const btn = document.getElementById("interestGen"); if (!btn) return;
    const inp = document.getElementById("interestInput");
    btn.onclick = function () {
      const topic = inp.value.trim();
      if (!topic) { toast("先填一个你感兴趣的事呀"); return; }
      let plan = null;
      const plans = LIFE.interestPlans || {};
      const hitKey = Object.keys(plans).find(function (k) { return topic.indexOf(k) >= 0 || k.indexOf(topic) >= 0; });
      if (hitKey) plan = plans[hitKey];
      else if (typeof LIFE.interestGeneric === "function") plan = LIFE.interestGeneric(topic);
      if (!plan) { toast("生成失败，再试一次"); return; }
      let html = '<div class="interest-title">' + esc(plan.title || topic + " · 一个月入门计划") + "</div>";
      (plan.weeks || []).forEach(function (w, i) {
        html += '<div class="interest-week"><div class="iw-head">第 ' + (i + 1) + " 周 · " + esc(w.t) + "</div><ul>";
        (w.items || []).forEach(function (it) { html += "<li>" + esc(it) + "</li>"; });
        html += "</ul></div>";
      });
      const xhs = "https://www.xiaohongshu.com/search_result?keyword=" + encodeURIComponent(topic + " 入门");
      const bili = "https://search.bilibili.com/all?keyword=" + encodeURIComponent(topic + " 教程");
      html += '<div class="interest-links"><a href="' + xhs + '" target="_blank" rel="noopener">小红书搜「' + esc(topic) + ' 入门」→</a><a href="' + bili + '" target="_blank" rel="noopener">B 站搜「' + esc(topic) + ' 教程」→</a></div>';
      document.getElementById("interestPlan").innerHTML = html;
      // 存记录（供时间线）
      const recs = loadStore("interest_records") || [];
      recs.push({ date: key, topic: topic });
      saveStore("interest_records", recs);
      toast("已为你生成「" + topic + "」的一个月计划 ♡");
    };
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") btn.click(); });
  }

  // ---------- 我的 · 记录时间线（自动汇总所有记录） ----------
  function renderTimeline() {
    const box = document.getElementById("timelineBox"); if (!box) return;
    const byDate = {};   // date -> [ {icon, text} ]
    function push(date, icon, text) {
      if (!date) return;
      (byDate[date] = byDate[date] || []).push({ icon: icon, text: text });
    }
    // 1) 每日数据 ld_*
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf("ld_") !== 0) continue;
      const date = k.slice(3);
      let d; try { d = JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { continue; }
      if (d.water > 0) push(date, "☕", "喝了 " + d.water + " 杯水");
      if (d.meals) {
        const m = [];
        if (d.meals.b) m.push("早餐：" + d.meals.b);
        if (d.meals.l) m.push("午餐：" + d.meals.l);
        if (d.meals.d) m.push("晚餐：" + d.meals.d);
        if (m.length) push(date, "❀", m.join("；"));
      }
      (d.exercises || []).forEach(function (e) {
        push(date, "➤", "运动：" + ((typeof e === "object" && e) ? (e.type + " " + e.min + " 分钟") : String(e)));
      });
      if (typeof d.homeMood === "number" && HOME_EMOJIS[d.homeMood]) push(date, HOME_EMOJIS[d.homeMood].e, "心情打卡：" + HOME_EMOJIS[d.homeMood].l);
      if (d.homeNote) push(date, "✎", "心情小记：" + d.homeNote);
      if (d.log) push(date, "✎", "生活记录：" + (d.log.length > 40 ? d.log.slice(0, 40) + "…" : d.log));
      if (d.photos && d.photos.length) push(date, "◈", "拍了 " + d.photos.length + " 张照片");
      if (d.foodPick) push(date, "✿", "美食盲盒开出：" + d.foodPick);
      if (d.sleep && d.sleep.down && d.sleep.up) push(date, "☾", "睡眠：" + d.sleep.down + " → " + d.sleep.up);
    }
    // 2) 记账
    (loadStore("wealth_records") || []).forEach(function (r) {
      push(r.date, "✧", (r.type === "income" ? "收入" : "支出") + " ¥" + r.amount + "（" + (r.cat || "记账") + (r.note ? " · " + r.note : "") + "）");
    });
    // 3) 回忆录
    (loadStore("memoir_entries") || []).forEach(function (m) {
      const date = m.date || (m.id ? new Date(m.id).getFullYear() + "-" + String(new Date(m.id).getMonth() + 1).padStart(2, "0") + "-" + String(new Date(m.id).getDate()).padStart(2, "0") : "");
      push(date, "♡", "回忆录：" + ((m.title || m.text || "").length > 30 ? (m.title || m.text).slice(0, 30) + "…" : (m.title || m.text || "写下了一段回忆")));
    });
    // 4) 兴趣计划
    (loadStore("interest_records") || []).forEach(function (r) {
      push(r.date, "✎", "生成了「" + r.topic + "」的一个月兴趣计划");
    });
    // 按日期倒序渲染
    const dates = Object.keys(byDate).sort().reverse();
    if (!dates.length) {
      box.innerHTML = '<p class="hint" style="text-align:center">还没有记录。喝水、打卡心情、运动、记账……做的每件小事都会自动出现在这里 ♡</p>';
      return;
    }
    let html = "";
    dates.forEach(function (dt) {
      const wd = ["日", "一", "二", "三", "四", "五", "六"][new Date(dt + "T00:00:00").getDay()];
      html += '<div class="tl-day"><div class="tl-date">' + dt + " · 星期" + wd + (dt === key ? '<span class="tl-today">今天</span>' : "") + "</div>";
      byDate[dt].forEach(function (it) {
        html += '<div class="tl-item"><span class="tl-icon">' + it.icon + '</span><span class="tl-text">' + esc(it.text) + "</span></div>";
      });
      html += "</div>";
    });
    box.innerHTML = html;
  }

  // 健康面板统一渲染：三餐 / 喝水 / 运动 / 作息 / 经期 / 体检 / 心情
  function renderHealth() {
    if (moodsEl) Array.prototype.forEach.call(moodsEl.children, function (c, i) { c.classList.toggle("sel", day.mood === i); });
    if (moodNote) moodNote.value = day.moodNote || "";
    paintWater(); renderPeriod(); renderHealthMeals(); renderHealthEx(); renderSleep(); renderExam();
  }

  // ---------- 导航 ----------
  const NAV = C.nav || [
    { id: "home", label: "首页", icon: "⌂" },
    { id: "health", label: "健康", icon: "♡" },
    { id: "life", label: "记录生活", icon: "✿" },
    { id: "memoir", label: "回忆录", icon: "♡" },
    { id: "news", label: "资讯", icon: "✉" },
    { id: "study", label: "学习", icon: "✎" },
    { id: "work", label: "工作", icon: "✎" },
    { id: "wealth", label: "财富", icon: "✧" },
    { id: "diet", label: "饮食运动", icon: "✧" },
    { id: "settings", label: "设置", icon: "☺" }
  ];
  const sidebarNav = document.getElementById("sidebarNav");
  const sidebar = document.getElementById("sidebar"), drawerMask = document.getElementById("drawerMask"), menuBtn = document.getElementById("menuBtn");
  const renderMap = { home: renderHome, memoir: renderMemoir, study: renderStudy, work: renderWork, health: renderHealth, wealth: function () { renderWealth(); renderCalendar(); }, diet: renderDiet, travel: renderTravel, checkin: function () {}, answer: renderAnswer, tarot: renderTarot, oracle: renderOracle, exercise: renderExercise, food: renderFood, interest: function () { renderStudy(); }, timeline: renderTimeline, about: function () {} };

  // 把导航树拍平，便于底部栏查找图标名称
  const flatNav = [];
  function flatten(nav) {
    nav.forEach(function (n) {
      if (n.children && n.children.length) {
        n.children.forEach(function (child) {
          if (child.group && child.items) child.items.forEach(function (it) { flatNav.push(it); });
          else flatNav.push(child);
        });
      } else flatNav.push(n);
    });
  }
  flatten(NAV);

  // 抽屉开合（手机）
  function openDrawer() { sidebar.classList.add("open"); drawerMask.classList.add("show"); }
  function closeDrawer() { sidebar.classList.remove("open"); drawerMask.classList.remove("show"); }
  menuBtn.onclick = openDrawer;
  drawerMask.onclick = closeDrawer;

  function makeLeaf(item, sub) {
    const cls = sub ? "nav-sub-item" : "nav-item";
    const b = document.createElement("button"); b.className = cls; b.dataset.id = item.id;
    b.innerHTML = '<span class="ni">' + item.icon + '</span>' + item.label;
    b.onclick = function () { showPanel(item.id); closeDrawer(); };
    return b;
  }

  function buildNav() {
    NAV.forEach(function (item) {
      if (item.children && item.children.length) {
        const head = document.createElement("button"); head.className = "nav-head";
        head.innerHTML = '<span class="nh-main"><span class="ni">' + item.icon + '</span>' + item.label + '</span><span class="nav-arrow"></span>';
        const sub = document.createElement("div"); sub.className = "nav-sub" + (item.open ? " open" : "");
        const arrow = head.querySelector(".nav-arrow"); if (item.open) arrow.classList.add("open");
        head.onclick = function () {
          const willOpen = !sub.classList.contains("open");
          // 手风琴：打开一个时自动收起其他，避免互相遮挡
          if (willOpen) {
            Array.prototype.forEach.call(sidebarNav.querySelectorAll(".nav-sub.open"), function (s) { s.classList.remove("open"); });
            Array.prototype.forEach.call(sidebarNav.querySelectorAll(".nav-arrow.open"), function (a) { a.classList.remove("open"); });
          }
          sub.classList.toggle("open", willOpen);
          arrow.classList.toggle("open", willOpen);
        };
        item.children.forEach(function (child) {
          if (child.group) {
            const gt = document.createElement("div"); gt.className = "nav-group-title"; gt.textContent = child.group; sub.appendChild(gt);
            (child.items || []).forEach(function (it) { sub.appendChild(makeLeaf(it, true)); });
          } else {
            sub.appendChild(makeLeaf(child, true));
          }
        });
        sidebarNav.appendChild(head);
        sidebarNav.appendChild(sub);
      } else {
        sidebarNav.appendChild(makeLeaf(item, false));
      }
    });
  }

  // 底部三键栏：左 / 中(相机→记录生活并拍照) / 右（config.bottomBar 可改）
  const bbCfg = C.bottomBar || { left: "home", right: "memoir" };
  const bbLeft = document.getElementById("bbLeft"), bbRight = document.getElementById("bbRight"), bbCam = document.getElementById("bbCam");
  function catOf(id) { return flatNav.find(function (c) { return c.id === id; }) || NAV.find(function (c) { return c.id === id; }) || flatNav[0] || NAV[0]; }
  function fillSide(btn, id) {
    const c = catOf(id);
    btn.dataset.id = c.id;
    btn.innerHTML = '<span class="bi">' + c.icon + '</span>' + c.label;
    btn.onclick = function () { showPanel(c.id); };
  }
  fillSide(bbLeft, bbCfg.left || "home");
  fillSide(bbRight, bbCfg.right || "memoir");
  bbCam.onclick = function () {
    showPanel("life");
    const inp = document.getElementById("snapInput");
    if (inp) setTimeout(function () { inp.click(); }, 150);   // 打开记录生活并直接调起相机/相册
  };

  function showPanel(id) {
    const origId = id;
    const studyTabs = { "law": "law", "study-en": "en", "study-ko": "ko", "interest": "interest" };
    if (studyTabs[id]) { switchStudy(studyTabs[id]); id = "study"; }
    Array.prototype.forEach.call(document.querySelectorAll(".panel"), function (p) { p.classList.toggle("active", p.id === "panel-" + id); });
    Array.prototype.forEach.call(document.querySelectorAll(".nav-item, .nav-sub-item"), function (b) { b.classList.toggle("active", b.dataset.id === origId); });
    bbLeft.classList.toggle("active", bbLeft.dataset.id === id);
    bbRight.classList.toggle("active", bbRight.dataset.id === id);
    if (renderMap[id]) renderMap[id]();
    window.scrollTo(0, 0);
  }
  initWoodfish(); initQuotes(); initHomeCtrls();
  buildNav();
  showPanel("home");
})();
