// ============================================================
//  设置文件 —— 你只改这里，其他不用动
// ============================================================

// 通用社交热榜解析：兼容多种返回结构（vvhan 等）
function parseSocialHot(j) {
  let arr = (j && j.data) || [];
  if (!Array.isArray(arr) && j.data && Array.isArray(j.data.list)) arr = j.data.list;
  if (!Array.isArray(arr) && Array.isArray(j)) arr = j;
  if (!Array.isArray(arr) && j.result && Array.isArray(j.result.list)) arr = j.result.list;
  return arr.slice(0, 15).map(function (it) {
    if (typeof it === "string") return { title: it, url: "https://www.baidu.com/s?wd=" + encodeURIComponent(it) };
    const title = it.title || it.name || it.word || it.hotword || it.query || "";
    let hot = it.hot_value || it.hot || it.num || it.hotScore || it.heat || it.score || "";
    if (typeof hot === "number" && hot >= 10000) hot = (hot / 10000).toFixed(1).replace(/\.0$/, "") + "万";
    const url = it.url || it.href || it.link || ("https://www.baidu.com/s?wd=" + encodeURIComponent(title));
    return { title: title, url: url, hot: hot };
  });
}

// 聚合数据「地区新闻」解析：兼容多种返回结构（含 error_code / result.news / result.data）
function parseLocalNews(j) {
  if (!j) return [];
  if (j.error_code && j.error_code !== 0) return [];        // 聚合数据返回错误（如 Key 无效）
  const box = j.result || j.data || j;
  let arr = box.news || box.data || box.list || box.items || (Array.isArray(box) ? box : null);
  if (!arr) return [];
  return (Array.isArray(arr) ? arr : []).slice(0, 15).map(function (it) {
    const title = it.title || it.name || it.word || "";
    const url = it.url || it.link || it.weburl || (title ? "https://www.baidu.com/s?wd=" + encodeURIComponent(title) : "");
    return { title: title, url: url, hot: "", source: it.source || "" };
  });
}

window.APP_CONFIG = {

  // 朋友的名字（显示在标题和页脚）
  friendName: "庆",

  // 顶部那句礼物寄语
  giftLine: "送给最棒的你 —— 愿你每天都被温柔以待。",

  // 喝水目标（杯/天）
  waterGoal: 8,

  // 喝水提醒间隔（分钟）
  waterReminderMin: 60,

  // 首页交互模块配置（敲木鱼 / 拍一拍每日小记）
  home: {
    woodfish: { enabled: true, lines: ["功德 +1", "心静自然凉", "慢慢来，比较快", "敲一下，烦恼少一点", "诸事顺遂"] },
    prompts: [
      { id: "snap",    icon: "◉", text: "你现在手边有什么？拍一拍记录一下吧", action: "photo" },
      { id: "weather", icon: "☀", text: "今天天气如何？记录一下吧", action: "weather" },
      { id: "mood",    icon: "♡", text: "今天心情怎样？随手记一句", action: "mood" }
    ]
  },

  // 默认城市（用于天气）。想换城市就改名字和经纬度
  // 北京 39.9042,116.4074 | 上海 31.2304,121.4737 | 广州 23.1291,113.2644 | 深圳 22.5431,114.0579
  city: { name: "北京", lat: 39.9042, lon: 116.4074 },

  // 经期提醒默认设置（朋友打开后可自行在页面里改）
  period: { enabled: true, lastDate: "2026-07-20", cycle: 28, duration: 5 },

  // 生日提醒（可加多个）。date 用 公历 月-日；lunar 填农历，仅作展示
  // 庆：公历 2000-08-18，农历 七月十九
  birthdays: [
    { name: "庆", date: "2000-08-18", lunar: "七月十九" },
    { name: "（你）", date: "2000-01-01", lunar: "" }
  ],

  // 节日列表（日期格式 年-月-日；过期的不显示，可自行增删）
  holidays: [
    { name: "元旦", date: "2026-01-01" },
    { name: "情人节", date: "2026-02-14" },
    { name: "春节", date: "2026-02-17" },
    { name: "元宵节", date: "2026-03-03" },
    { name: "女神节", date: "2026-03-08" },
    { name: "清明节", date: "2026-04-05" },
    { name: "劳动节", date: "2026-05-01" },
    { name: "端午节", date: "2026-06-19" },
    { name: "中秋节", date: "2026-09-25" },
    { name: "国庆节", date: "2026-10-01" },
    { name: "圣诞节", date: "2026-12-25" }
  ],

  // 热点动态：打开即聚合多平台实时动态（免费接口，无需密钥）
  // 微博热搜 · 抖音热榜·音乐 · 新华社早报 · 知乎 · 小红书 · 深圳/成都本地（本地需填 Key）
  // 所有条目自动标注【关键词】与【出处】；顶部「今日汇总」为各源速览
  news: {
    enabled: true,
    count: 12,                       // 每个平台最多显示条数
    keywords: ["新华社","央行","国务院","台湾","台风","地震","高考","发布会","降息","涨价","降价","上市","新规","政策","制裁","芯片","航天","医保","社保","养老金","假期","降温","暴雨","高温","演唱会","电影","夺冠","IPO","AI","新能源","维权","召回"],

    // 进入热点时顶部随机展示的一句语录（纯展示，可随意增删）
    taglines: ["再忙也抽空了解世界。","世界很大，抽空看看。","关心天下事，也是关心自己。","每天三分钟，世界在指尖。","看看今天，世界发生了什么。"],

    // 权威媒体·每日早报（主源，稳定必出，自带每日寄语）
    // 60s 接口聚合了新华社等权威来源，本身就是一份当日要闻汇总
    authoritative: {
      id: "auth", label: "新华社早报", icon: "◈", color: "#e0533d",
      apis: ["https://60s.viki.moe/v2/60s", "https://60s.b23.run/v2/60s"],
      parse: function (j) {
        const d = (j && j.data) || {};
        const items = (d.news || []).map(function (t) {
          return { title: t, url: "https://www.baidu.com/s?wd=" + encodeURIComponent(t) };
        });
        return { items: items, tip: d.tip || "", date: d.date || "" };
      }
    },

    // 社交 / 内容平台热榜（同为 60s 开源项目端点，已实测可用且允许跨域；主源失败自动切镜像）
    sources: [
      { id: "weibo",  label: "微博热搜",     icon: "✸", color: "#ff8200",
        apis: ["https://60s.viki.moe/v2/weibo",   "https://60s.b23.run/v2/weibo"],   parse: parseSocialHot },
      { id: "douyin", label: "抖音热榜", icon: "▷", color: "#161823",
        apis: ["https://60s.viki.moe/v2/douyin",  "https://60s.b23.run/v2/douyin"],  parse: parseSocialHot },
      { id: "zhihu",  label: "知乎热榜",     icon: "✚", color: "#0066ff",
        apis: ["https://60s.viki.moe/v2/zhihu",   "https://60s.b23.run/v2/zhihu"],   parse: parseSocialHot },
      { id: "xhs",    label: "小红书",       icon: "✿", color: "#ff2741",
        apis: ["https://60s.viki.moe/v2/rednote", "https://60s.b23.run/v2/rednote"], parse: parseSocialHot }
    ],

    // 本地新闻（深圳 / 成都）：默认【免 Key】！
    //   由 .github/workflows/refresh-news.yml（GitHub Actions）每 2 小时在服务端抓取
    //   Bing 新闻 RSS（真实、实时、无需任何密钥），写入 data/news.json，网页直接读。
    //   可选增强：若想看真实地方媒体新闻，可部署 proxy/ 里的免费 Worker 并 `wrangler secret put JUHE_KEY`，
    //   再把 Worker 地址填到下面 proxy 即可（Key 在服务端，不暴露）。
    local: {
      enabled: true,
      proxy: "",                        // ← 可选：填你部署的 Worker 地址（配 JUHE_KEY 后增强为真实地方媒体）
      fallbackNote: "部署到 GitHub 后由定时任务每 2 小时自动更新（免 Key，无需任何配置）。",
      cities: [
        { id: "shenzhen", label: "深圳本地", area: "深圳", color: "#e0533d", icon: "⌖" },
        { id: "chengdu",  label: "成都本地", area: "成都", color: "#d4882a", icon: "⌖" }
      ]
    }
  },

  // 底部三键导航（手机）：左 / 中(相机) / 右。右边没想好，先放回忆录，想换改 id 即可
  // 可选 id：home 首页 | health 健康 | life 记录生活 | memoir 回忆录 | news 资讯
  //          study 学习 | work 工作 | wealth 财富 | diet 饮食运动 | settings 设置
  bottomBar: { left: "home", right: "memoir" },

  // 与姐姐的回忆录
  memoir: {
    title: "与姐姐的回忆录",
    subtitle: "我们的故事，一条一条慢慢写 ♡",
    placeholder: [
      { date: "2018-06-15", title: "第一次一起旅行", text: "那年夏天，我们去了海边，姐姐说以后每年都要来一次。（把这里换成你们真实的回忆）", photo: "" }
    ]
  },

  // 学习
  study: {
    habits: ["英语听力 20 分钟", "阅读 30 分钟", "练琴 1 小时"]
  },

  // 工作
  work: {
    projects: [
      { name: "示例项目 A", progress: 40 },
      { name: "示例项目 B", progress: 15 }
    ]
  },

  // 财富
  wealth: {
    monthlyBudget: 3000,
    savingsGoal: 2000,                 // 每月存钱目标（元）
    categories: ["餐饮", "交通", "购物", "娱乐", "其他"]
  },

  // 饮食运动
  diet: {
    supplements: ["维生素 D", "叶酸", "钙片"]
  },

  // 健康管理（体检追踪默认半年提醒；具体上次体检时间由她首次打开时填写）
  health: {
    sleepGoalHours: 8,                 // 目标睡眠时长
    examIntervalDays: 180,             // 半年提醒阈值
    examYearDays: 365                  // 一年持续置顶阈值
  },

  // 出游计划：内置热门城市攻略模板（五维），未知城市自动跳小红书搜索
  travel: {
    cities: {
      "北京": { landmarks:["故宫 · 天安门","长城（八达岭/慕田峪）","天坛","颐和园","798 艺术区"], food:["北京烤鸭","炸酱面","铜锅涮肉","卤煮","豆汁焦圈"], outfit:"春秋防风外套+舒适走路鞋；冬季厚羽绒；夏季透气防晒衣", photo:["景山俯拍故宫全景","胡同人文纪实","三里屯夜景"], budget:"日均 400-700 元（门票+餐饮+交通）" },
      "上海": { landmarks:["外滩","东方明珠","豫园","南京路","迪士尼"], food:["生煎","小笼包","红烧肉","本帮熏鱼","葱油拌面"], outfit:"秋冬大衣；春夏衬衫+薄外套；江边风大带围巾", photo:["外滩万国建筑夜景","武康路梧桐街拍","陆家嘴天际线"], budget:"日均 500-900 元" },
      "成都": { landmarks:["宽窄巷子","锦里","大熊猫基地","都江堰","春熙路"], food:["火锅","串串香","担担面","钟水饺","龙抄手"], outfit:"湿润微凉，薄外套即可；吃辣备好纸巾", photo:["熊猫基地萌拍","茶馆盖碗茶","锦里红灯笼"], budget:"日均 300-550 元" },
      "杭州": { landmarks:["西湖","灵隐寺","西溪湿地","断桥","雷峰塔"], food:["西湖醋鱼","龙井虾仁","东坡肉","片儿川","定胜糕"], outfit:"春秋宜薄衫；西湖边风雅拍照带浅色裙", photo:["苏堤春晓","雷峰夕照","龙井茶园"], budget:"日均 400-650 元" },
      "西安": { landmarks:["兵马俑","大雁塔","城墙","钟鼓楼","回民街"], food:["肉夹馍","羊肉泡馍","凉皮","biangbiang面","葫芦头"], outfit:"北方干燥，润唇膏+防风外套；古迹拍照穿汉服出片", photo:["城墙骑行","大雁塔音乐喷泉","回民街夜市"], budget:"日均 350-600 元" },
      "重庆": { landmarks:["洪崖洞","解放碑","李子坝轻轨","磁器口","长江索道"], food:["重庆火锅","小面","酸辣粉","烤鱼","毛血旺"], outfit:"山地多台阶穿运动鞋；江雾拍照带薄外套", photo:["洪崖洞夜景","轻轨穿楼","两江夜游"], budget:"日均 350-600 元" },
      "厦门": { landmarks:["鼓浪屿","环岛路","曾厝垵","南普陀","沙坡尾"], food:["沙茶面","海蛎煎","土笋冻","姜母鸭","花生汤"], outfit:"海滨城市带防晒+草帽；穿浅色裙拍照仙", photo:["鼓浪屿礁石","环岛路骑行","双子塔日落"], budget:"日均 400-700 元" },
      "三亚": { landmarks:["亚龙湾","天涯海角","蜈支洲岛","南山寺","大东海"], food:["清补凉","椰子鸡","海鲜加工","文昌鸡","抱罗粉"], outfit:"泳衣+防晒+草帽+墨镜；备薄外套防空调凉", photo:["椰林沙滩","潜水海底","日落海湾"], budget:"日均 600-1200 元" },
      "丽江": { landmarks:["古城","玉龙雪山","泸沽湖","束河古镇","蓝月谷"], food:["腊排骨火锅","鸡豆凉粉","丽江粑粑","酥油茶","野生菌"], outfit:"高原紫外线强防晒+外套；雪山需羽绒", photo:["古城流水","雪山倒影","泸沽湖晨雾"], budget:"日均 400-800 元" },
      "大理": { landmarks:["洱海","苍山","双廊","古城","喜洲"], food:["饵块","乳扇","酸辣鱼","喜洲粑粑","凉鸡米线"], outfit:"高原湖边带防风外套+亮色披肩出片", photo:["洱海骑行","双廊日落","稻田风光"], budget:"日均 350-650 元" },
      "南京": { landmarks:["中山陵","夫子庙","总统府","玄武湖","鸡鸣寺"], food:["盐水鸭","鸭血粉丝","汤包","皮肚面","梅花糕"], outfit:"梧桐古城文艺风；春秋薄外套拍照", photo:["陵园梧桐道","夫子庙灯会","玄武湖晨雾"], budget:"日均 350-600 元" }
    }
  },

  // ============================================================
  //  侧边栏导航结构（你要的折叠菜单就在这里改）
  // ============================================================
  // 规则：
  // - 没有 children：直接切换对应 id 的面板
  // - 有 children：显示为可展开的分组，open:true 表示默认展开
  // - children 里可以再放 { group:"分组标题", items:[...] } 来加小标题
  // - 暂时没做的功能可以设 id:"checkin" 这种占位面板，后续再填补
  // 图标用的是可爱的单色符号，不是 emoji，保持统一颜文字风格
  nav: [
    { id: "home", label: "首页", icon: "⌂" },

    // 生活管理：下拉分类（三餐 / 健康 / 记录）
    {
      id: "life", label: "生活管理", icon: "❀", open: true,
      children: [
        { group: "三餐饮食", items: [
          { id: "health", label: "喝水",   icon: "💧" },
          { id: "health", label: "早饭",   icon: "◔" },
          { id: "health", label: "午餐",   icon: "◑" },
          { id: "health", label: "晚餐",   icon: "☾" }
        ]},
        { group: "健康管理", items: [
          { id: "exercise", label: "运动健身", icon: "✦" },
          { id: "health",   label: "体检记录", icon: "♡" }
        ]},
        { group: "日常记录", items: [
          { id: "wealth",  label: "记账",     icon: "✧" },
          { id: "travel",  label: "旅游计划", icon: "➹" }
        ]}
      ]
    },

    // 学习中心：下拉分类（语言 / 法规 / 兴趣）
    {
      id: "study", label: "学习中心", icon: "✎", open: true,
      children: [
        { group: "学习", items: [
          { id: "study-en",  label: "英语积累", icon: "✐" },
          { id: "study-ko",  label: "韩语入门", icon: "✎" },
          { id: "law",       label: "法律法规", icon: "§" },
          { id: "interest",  label: "兴趣拓展", icon: "✺" }
        ]}
      ]
    },

    // 每日一问：下拉（玄学 + 美食）
    {
      id: "daily", label: "每日一问", icon: "✶", open: true,
      children: [
        { group: "今日玄学 & 美食", items: [
          { id: "answer", label: "答案之书", icon: "✉" },
          { id: "tarot",  label: "塔罗牌",   icon: "✺" },
          { id: "oracle", label: "灵签",     icon: "✎" },
          { id: "food",   label: "美食盲盒", icon: "🍜" }
        ]}
      ]
    },

    { id: "news", label: "热点动态", icon: "✉" },
    { id: "memoir", label: "回忆录", icon: "❀" },
    { id: "timeline", label: "我的", icon: "☺" },   // 无下拉：点进去即整体记录时间线
    { id: "data", label: "数据备份", icon: "◈" }
  ],

  // ============================================================
  //  外语学习资料
  // ============================================================
  english: {
    // 每日一篇，200 词以内，配中文翻译。每天按日期循环取一篇。
    readings: [
      {
        title: "A Quiet Morning",
        en: "The sun rises slowly. The city is still quiet. Sarah makes a cup of tea and sits by the window. She watches the sky turn from pink to gold. 'Small moments like this,' she thinks, 'are the best part of the day.'",
        zh: "太阳缓缓升起，城市还很安静。萨拉泡了一杯茶，坐在窗边。她看着天空从粉色变成金色。她想：'像这样的小瞬间，才是一天中最美好的部分。'"
      },
      {
        title: "Learning to Dance",
        en: "Tom was shy at first. He stepped on his partner's feet twice. Everyone laughed, but kindly. By the end of the song, he was smiling. 'Next time,' he said, 'I will be better.'",
        zh: "汤姆一开始很害羞。他两次踩到了舞伴的脚。大家都笑了，但笑得很友善。一曲结束时，他已经笑了起来。他说：'下次我会更好的。'"
      },
      {
        title: "The Best Gift",
        en: "Lily did not have money for a gift. So she wrote a letter. She told her friend all the reasons she was thankful. Her friend cried a little and hugged her tight. 'This is the best gift,' she said.",
        zh: "莉莉没有钱买礼物。于是她写了一封信。她在信里告诉朋友所有她感激的理由。朋友微微落泪，紧紧抱住了她。'这是最好的礼物。'她说。"
      },
      {
        title: "Rainy Day Plan",
        en: "It was raining hard. The picnic was cancelled. Instead, the family made popcorn and watched an old movie. The dog slept on the sofa. Outside, the rain sang against the window. It turned out to be a lovely day.",
        zh: "雨下得很大。野餐取消了。于是全家人一起做了爆米花，看了一部老电影。狗狗睡在沙发上。窗外，雨点敲打着窗户，像在唱歌。结果这一天变得很美好。"
      },
      {
        title: "First Bike Ride",
        en: "Mia was afraid to fall. Her father held the back of the bike and ran beside her. Suddenly, she realized he had let go. She was riding by herself! The wind felt sweet on her face.",
        zh: "米娅害怕摔倒。爸爸扶着车尾，在旁边跑着。突然，她意识到爸爸已经松开了手。她自己在骑！风轻轻拂过她的脸庞，感觉很甜。"
      },
      {
        title: "Star Gazing",
        en: "They lay on the grass far from the city lights. The sky was full of stars. One of them pointed at a bright light and asked, 'Is that a planet?' Her grandmother smiled. 'Maybe it is a wish waiting to be made.'",
        zh: "他们躺在远离城市灯光的草地上。天空中布满了星星。有人指着一颗亮星问：'那是行星吗？'奶奶笑了：'也许那是一个等待被许下的愿望。'"
      },
      {
        title: "Kindness Returns",
        en: "An old man dropped his bag. A young boy picked it up and walked with him to the bus stop. The next morning, the boy found a thank-you note on his desk. Small kindnesses always find their way back.",
        zh: "一位老人袋子掉了。一个小男孩捡起来，陪他走到公交站。第二天早上，男孩在桌上发现了一封感谢信。小小的善意，总会回到你身边。"
      }
    ]
  },

  korean: {
    // 常用词汇（精简为 6 个最高频，点一下就能听发音）
    words: [
      { ko: "안녕하세요", zh: "你好", rom: "an-nyeong-ha-se-yo" },
      { ko: "감사합니다", zh: "谢谢", rom: "gam-sa-ham-ni-da" },
      { ko: "사랑해요", zh: "我爱你", rom: "sa-rang-hae-yo" },
      { ko: "물", zh: "水", rom: "mul" },
      { ko: "밥", zh: "饭", rom: "bap" },
      { ko: "친구", zh: "朋友", rom: "chin-gu" }
    ],
    // 韩语四十音（完整 19 子音 + 21 母音），常驻展示，点一下听发音
    alphabet: {
      consonants: [
        { ko: "ㄱ", rom: "g/k", sound: "像 '哥' 的声母" },
        { ko: "ㄲ", rom: "kk", sound: "紧音，更用力的 '哥哥'" },
        { ko: "ㄴ", rom: "n", sound: "像 '呢' 的声母" },
        { ko: "ㄷ", rom: "d/t", sound: "像 '的' 的声母" },
        { ko: "ㄸ", rom: "tt", sound: "紧音，更用力的 '的的'" },
        { ko: "ㄹ", rom: "r/l", sound: "舌尖抵上齿龈轻弹" },
        { ko: "ㅁ", rom: "m", sound: "像 '么' 的声母" },
        { ko: "ㅂ", rom: "b/p", sound: "像 '波' 的声母" },
        { ko: "ㅃ", rom: "pp", sound: "紧音，更用力的 '波波'" },
        { ko: "ㅅ", rom: "s", sound: "像 '思' 的声母" },
        { ko: "ㅆ", rom: "ss", sound: "紧音，更用力的 '思思'" },
        { ko: "ㅇ", rom: "ng/无", sound: "开头不发音，尾音像 '嗯'" },
        { ko: "ㅈ", rom: "j", sound: "像 '机' 的声母" },
        { ko: "ㅉ", rom: "jj", sound: "紧音，更用力的 '机机'" },
        { ko: "ㅊ", rom: "ch", sound: "像 '七' 的声母，送气" },
        { ko: "ㅋ", rom: "k", sound: "像 '科' 的声母，送气" },
        { ko: "ㅌ", rom: "t", sound: "像 '特' 的声母，送气" },
        { ko: "ㅍ", rom: "p", sound: "像 '坡' 的声母，送气" },
        { ko: "ㅎ", rom: "h", sound: "像 '喝' 的声母" }
      ],
      vowels: [
        { ko: "ㅏ", rom: "a", sound: "啊" },
        { ko: "ㅐ", rom: "ae", sound: "哎" },
        { ko: "ㅑ", rom: "ya", sound: "呀" },
        { ko: "ㅒ", rom: "yae", sound: "耶" },
        { ko: "ㅓ", rom: "eo", sound: "哦（偏后）" },
        { ko: "ㅔ", rom: "e", sound: "诶" },
        { ko: "ㅕ", rom: "yeo", sound: "哟（偏后）" },
        { ko: "ㅖ", rom: "ye", sound: "耶" },
        { ko: "ㅗ", rom: "o", sound: "哦（圆唇）" },
        { ko: "ㅘ", rom: "wa", sound: "哇" },
        { ko: "ㅙ", rom: "wae", sound: "喂" },
        { ko: "ㅚ", rom: "oe", sound: "危" },
        { ko: "ㅛ", rom: "yo", sound: "哟（圆唇）" },
        { ko: "ㅜ", rom: "u", sound: "乌" },
        { ko: "ㅝ", rom: "wo", sound: "窝" },
        { ko: "ㅞ", rom: "we", sound: "威" },
        { ko: "ㅟ", rom: "wi", sound: "喂" },
        { ko: "ㅠ", rom: "yu", sound: "优" },
        { ko: "ㅡ", rom: "eu", sound: "像 '呃' 扁唇" },
        { ko: "ㅢ", rom: "ui", sound: "衣（带 ㅡ）" },
        { ko: "ㅣ", rom: "i", sound: "衣" }
      ]
    }
  },

  // 法律法规每日学习（本地精选法条库，按日期滚动，每天 1-2 条；无需联网）
  law: {
    enabled: true,
    count: 2,
    source: "国家法律法规数据库（精选）",
    lawApi: ""   // 留空则用下方本地库；如需在线法条接口可在此填地址
  },

  // 本地精选法条库（按年中的第几天滚动，保证每天稳定出现 1-2 条）
  lawDb: [
    { from:"《民法典》第1010条", title:"性骚扰防治", content:"违背他人意愿，以言语、文字、图像、肢体行为等方式对他人实施性骚扰的，受害人有权依法请求行为人承担民事责任。", tip:"遭遇性骚扰应保留聊天记录、录音等证据，可向单位、妇联投诉或报警、起诉。" },
    { from:"《民法典》第1043条", title:"优良家风", content:"家庭应当树立优良家风，弘扬家庭美德，重视家庭文明建设。", tip:"法律倡导夫妻互相忠实、尊重，家庭成员间敬老爱幼、互相帮助。" },
    { from:"《民法典》第1077条", title:"离婚冷静期", content:"自婚姻登记机关收到离婚登记申请之日起三十日内，任何一方可撤回申请；期满后三十日内双方应共同申请发给离婚证。", tip:"协议离婚有 30 天冷静期，期满后还需在 30 天内共同领证，逾期视为撤回。" },
    { from:"《民法典》第1064条", title:"夫妻共同债务", content:"夫妻一方在婚姻关系存续期间以个人名义为家庭日常生活需要所负的债务，属夫妻共同债务。", tip:"超出家庭日常需要的巨额举债，一般不算共同债务，债权人需举证用于夫妻共同生活。" },
    { from:"《民法典》第1165条", title:"过错责任", content:"行为人因过错侵害他人民事权益造成损害的，应当承担侵权责任。", tip:"一般侵权遵循『谁过错谁赔偿』，被侵权人需证明对方有过错、有损害、有因果关系。" },
    { from:"《民法典》第188条", title:"诉讼时效三年", content:"向人民法院请求保护民事权利的诉讼时效期间为三年。", tip:"权利受侵害后应在三年内起诉，超期对方可主张时效抗辩，但自愿履行仍有效。" },
    { from:"《民法典》第509条", title:"全面履行合同", content:"当事人应当按照约定全面履行自己的义务，遵循诚信原则。", tip:"合同一旦成立即具约束力，单方违约需承担继续履行、赔偿损失等责任。" },
    { from:"《民法典》第1122条", title:"遗产的范围", content:"遗产是自然人死亡时遗留的个人合法财产。", tip:"抚恤金、丧葬费、保险金（指定受益人）一般不算遗产；网络账号等虚拟财产可依法继承。" },
    { from:"《民法典》第1145条", title:"遗嘱执行人", content:"继承开始后，遗嘱执行人应履行清理遗产、处理债权债务、按遗嘱分割财产等职责。", tip:"立遗嘱时可指定信任的人或机构作执行人，减少继承纠纷。" },
    { from:"《民法典》第1254条", title:"高空抛物", content:"禁止从建筑物中抛掷物品；难以确定具体侵权人的，由可能加害的建筑物使用人补偿。", tip:"高空抛物不仅赔偿，情节严重可构成刑事犯罪；物业未采取安全保障措施的也担责。" },
    { from:"《劳动法》第36条", title:"标准工时", content:"国家实行劳动者每日工作时间不超过八小时、平均每周工作时间不超过四十四小时的工时制度。", tip:"超出标准工时应算加班并支付加班工资，强制超时加班可投诉劳动监察。" },
    { from:"《劳动法》第44条", title:"加班工资", content:"安排劳动者延长工作时间的，支付不低于工资 150% 的报酬；休息日加班可补休或 200%；法定休假日 300%。", tip:"法定节假日加班必须付 3 倍工资，不能用补休替代。" },
    { from:"《劳动合同法》第10条", title:"书面劳动合同", content:"建立劳动关系应当订立书面劳动合同，自用工之日起一个月内订立。", tip:"用工超一个月不满一年未签合同，劳动者可主张最多 11 个月双倍工资。" },
    { from:"《劳动合同法》第38条", title:"劳动者解约权", content:"用人单位未按约定提供劳动保护、未及时足额支付工资、未缴社保等，劳动者可解除劳动合同。", tip:"单位欠薪、不缴社保，员工可随时辞职并主张经济补偿。" },
    { from:"《劳动合同法》第47条", title:"经济补偿", content:"经济补偿按劳动者在本单位工作年限，每满一年支付一个月工资。", tip:"被违法辞退可主张双倍经济补偿（赔偿金）；协商解除也有补偿。" },
    { from:"《社会保险法》第58条", title:"社保登记", content:"用人单位应自用工之日起三十日内为职工向社保经办机构申请办理社保登记。", tip:"单位不缴社保属违法，员工可投诉要求补缴，影响养老、医保、工伤待遇。" },
    { from:"《消费者权益保护法》第8条", title:"知情权", content:"消费者享有知悉其购买、使用的商品或者接受的服务的真实情况的权利。", tip:"经营者虚假宣传、隐瞒重要信息，消费者可要求退赔。" },
    { from:"《消费者权益保护法》第25条", title:"七天无理由退货", content:"经营者采用网络、电视、电话、邮购等方式销售商品的，消费者有权自收到商品之日起七日内退货。", tip:"网购（除定制、鲜活、拆封音像等）可七天无理由退，运费一般由买家承担。" },
    { from:"《消费者权益保护法》第26条", title:"格式条款无效", content:"经营者不得以格式条款作出排除或限制消费者权利、减轻自身责任的不公平规定。", tip:"『最终解释权归本店』『概不退换』等店堂告示通常无效。" },
    { from:"《消费者权益保护法》第55条", title:"欺诈三倍赔", content:"经营者提供商品或服务有欺诈行为的，应按消费者要求增加赔偿，金额为价款的三倍，不足五百元为五百元。", tip:"买到假货可主张『退一赔三』，最低 500 元；食品十倍更优。" },
    { from:"《食品安全法》第148条", title:"食品安全赔偿", content:"生产不符合安全标准食品或经营明知不符合安全标准的食品，消费者可要求价款十倍或损失三倍的赔偿。", tip:"吃到过期、变质食品，除退赔外可主张十倍价款赔偿（不足一千赔一千）。" },
    { from:"《宪法》第33条", title:"法律平等", content:"中华人民共和国公民在法律面前一律平等。", tip:"任何公民享有宪法和法律规定的权利，同时须履行义务，不因身份、性别而不同。" },
    { from:"《宪法》第38条", title:"人格尊严", content:"公民的人格尊严不受侵犯，禁止用任何方法对公民进行侮辱、诽谤和诬告陷害。", tip:"遭遇网暴、人肉搜索、公开侮辱，可依法报警并提起名誉权诉讼。" },
    { from:"《宪法》第43条", title:"休息权", content:"中华人民共和国劳动者有休息和休假的权利。", tip:"国家实行带薪年休假制度，连续工作一年以上可享受带薪年假。" },
    { from:"《刑法》第234条", title:"故意伤害", content:"故意伤害他人身体的，处三年以下有期徒刑、拘役或者管制；致人重伤、死亡的加重处罚。", tip:"打架致人轻伤即可能构罪，和解赔偿可争取从轻，但刑责不免。" },
    { from:"《刑法》第264条", title:"盗窃", content:"盗窃公私财物，数额较大的，或多次盗窃、入户盗窃、携带凶器盗窃、扒窃的，构成盗窃罪。", tip:"多次小额扒窃也构罪；被盗应及时报警并保留证据。" },
    { from:"《刑法》第266条", title:"诈骗", content:"诈骗公私财物，数额较大的，处三年以下有期徒刑、拘役或者管制，并处或单处罚金。", tip:"网络刷单、冒充客服、杀猪盘均属诈骗，不转账、不贪小利是防线。" },
    { from:"《道路交通安全法》第76条", title:"交通事故责任", content:"机动车发生交通事故造成损害的，依过错承担责任；机动车一方无过错也承担不超过一成赔偿责任。", tip:"行人/非机动车有过错可减轻机动车责任；肇事逃逸承担全责并加重处罚。" },
    { from:"《个人信息保护法》第13条", title:"处理信息须同意", content:"处理个人信息应取得个人同意，或符合为订立履行合同、履行法定职责等情形。", tip:"App 强制索要与服务无关的权限可拒绝；非法买卖个人信息违法。" },
    { from:"《个人信息保护法》第15条", title:"撤回同意", content:"基于个人同意处理个人信息的，个人有权撤回其同意。", tip:"可随时关闭 App 个性化推荐、删除账号并撤回授权。" },
    { from:"《民法典》第1034条", title:"个人信息保护", content:"自然人的个人信息受法律保护；处理个人信息应遵循合法、正当、必要原则。", tip:"泄露、买卖他人手机号、住址等信息可承担民事责任乃至刑事责任。" },
    { from:"《妇女权益保障法》第23条", title:"就业性别平等", content:"各单位在录用职工时，除不适合妇女的工种或岗位外，不得以性别为由拒绝录用或提高标准。", tip:"孕期、产期、哺乳期不得随意辞退；遭遇就业歧视可投诉或仲裁。" },
    { from:"《反家庭暴力法》第23条", title:"人身安全保护令", content:"当事人因遭受家暴或面临现实危险，可向法院申请人身安全保护令。", tip:"家暴受害者可向法院、妇联求助，保护令可禁止施暴者接近、骚扰。" },
    { from:"《噪声污染防治法》第65条", title:"邻里噪声", content:"使用家用电器、乐器或进行其他家庭场所活动，应控制音量，避免干扰周围生活环境。", tip:"深夜装修、高分贝音响扰民，可报警或向生态环境部门投诉。" }
  ],

  // ============================================================
  //  每日一问（答案之书 · 塔罗 · 灵签）—— 纯本地，无需联网
  // ============================================================
  mystic: {

    // 答案之书：抽一句给你
    answers: [
      "是的，毫无疑问。", "现在还不是时候。", "顺其自然就好。", "值得去试一试。",
      "再等等看。", "相信你的直觉。", "学会放手。", "答案其实就在你心里。",
      "先放一放。", "勇敢一点，没事的。", "不必太勉强自己。", "好的转变正在发生。",
      "别想太多，去做吧。", "时机未到，再耐心些。", "你会得到你想要的。", "小心一点总没错。",
      "放下过去，向前看。", "听从内心的声音。", "今天不适合做大决定。", "明天会更好。",
      "保持专注，你会成功。", "别让情绪替你做主。", "是时候做出改变了。", "多问问身边人的意见。",
      "相信过程。", "也许吧，但别抱太大期望。", "你已经知道答案了。", "慢一点，反而更快。",
      "别怕犯错。", "这件事值得等待。", "把注意力放在当下。", "会有贵人相助。",
      "不要急于求成。", "诚实地面对自己。", "结果会比你想的更好。", "先照顾好自己。",
      "别替别人做决定。", "和水有关的事要多留意。", "保持简单。", "你可以的。",
      "别回头看。", "让时间来说话。", "小事化了，不必慌。", "跟着感觉走就好。"
    ],

    // 塔罗 · 大阿卡纳 22 张（正位 / 逆位 含义）
    tarot: [
      { name:"愚者", en:"The Fool", up:"新的开始、冒险、纯真与可能", rev:"鲁莽、犹豫、无视风险" },
      { name:"魔术师", en:"The Magician", up:"创造力、行动力、心想事成", rev:"欺骗、能力没发挥、拖延" },
      { name:"女祭司", en:"The High Priestess", up:"直觉、神秘、潜意识的智慧", rev:"忽略直觉、秘密尚未揭开" },
      { name:"皇后", en:"The Empress", up:"丰盛、滋养、温柔的力量", rev:"过度依赖、创造受阻" },
      { name:"皇帝", en:"The Emperor", up:"秩序、权威、稳定可靠", rev:"专制、失控、固执" },
      { name:"教皇", en:"The Hierophant", up:"传统、引导、信念与规则", rev:"墨守成规、盲目跟随" },
      { name:"恋人", en:"The Lovers", up:"爱、结合、重要的选择", rev:"失衡、错误的选择" },
      { name:"战车", en:"The Chariot", up:"胜利、意志、向前冲", rev:"失控、方向不明" },
      { name:"力量", en:"Strength", up:"勇气、温柔的坚定、自控", rev:"自我怀疑、软弱" },
      { name:"隐士", en:"The Hermit", up:"内省、独处、沉淀智慧", rev:"孤立、逃避现实" },
      { name:"命运之轮", en:"Wheel of Fortune", up:"转机、循环、好运将至", rev:"低谷、停滞不前" },
      { name:"正义", en:"Justice", up:"公平、因果、真相大白", rev:"不公、逃避责任" },
      { name:"倒吊人", en:"The Hanged Man", up:"放下、换个角度看、耐心等待", rev:"无谓牺牲、固执" },
      { name:"死神", en:"Death", up:"结束与重生、彻底转化", rev:"抗拒改变、原地停滞" },
      { name:"节制", en:"Temperance", up:"平衡、调和、耐心", rev:"失衡、走极端" },
      { name:"恶魔", en:"The Devil", up:"束缚、欲望、执念", rev:"觉察、开始解脱" },
      { name:"高塔", en:"The Tower", up:"突变、崩塌、猛然觉醒", rev:"迟迟不变、压抑已久" },
      { name:"星星", en:"The Star", up:"希望、治愈、光明指引", rev:"失望、暂时迷失" },
      { name:"月亮", en:"The Moon", up:"迷惑、潜意识、隐隐不安", rev:"释疑、真相浮现" },
      { name:"太阳", en:"The Sun", up:"喜悦、成功、耀眼光明", rev:"短暂阴影、过度乐观" },
      { name:"审判", en:"Judgement", up:"觉醒、召唤、重新出发", rev:"自我否定、一再拖延" },
      { name:"世界", en:"The World", up:"圆满、完成、心愿达成", rev:"尚未完成、留有缺口" }
    ],

    // 灵签：签号 / 等级 / 签诗 / 解曰（综合解读）
    oracle: [
      { no:1,  level:"上上签", poem:"天开地辟结良缘，日吉时良万物全。若得此签非小可，公侯将相在眼前。", meaning:"诸事顺遂，所求皆成。事业有贵人提携，感情和睦，身体安康，放手去闯便是。" },
      { no:8,  level:"上上签", poem:"曳石崇追韩令子，故知福德胜前生。荣华富贵今生定，更积阴功许大鹏。", meaning:"福气深厚，胜过从前。旧日积累今得回报，宜把握机会，广结善缘。" },
      { no:15, level:"上签",   poem:"一事当前莫逡巡，相逢得意是天恩。从今喜气频频至，莫负春光一片心。", meaning:"时机已到，不必犹豫。贵人就在身边，主动一点便能成事。" },
      { no:22, level:"上签",   poem:"碧玉池中开白莲，妆成镜子转婵娟。清风明月无人管，流水高山自有缘。", meaning:"心境清净，自有好缘。感情上佳，事业平稳向上，宜守正持稳。" },
      { no:30, level:"上签",   poem:"劝君耐守旧生涯，把定身心莫起歹。流水落花随远去，春风一转便荣华。", meaning:"守得云开见月明。眼前宜稳不宜动，转机在即，静待春风。" },
      { no:38, level:"中签",   poem:"月被云遮晓未明，虽无荣辱也心惊。逢危遇险须提防，守旧安然过一生。", meaning:"前路暂不明朗，宜谨慎防守。小人暗伏，凡事多留证据，莫轻易托付。" },
      { no:45, level:"中签",   poem:"温柔女子作人妻，一旦生儿便解疑。莫道从来皆顺境，也须防备有差池。", meaning:"表面平顺，内里藏变。感情事业皆需用心经营，防微杜渐最妥。" },
      { no:52, level:"中签",   poem:"水中捞月费工夫，守旧随缘不用图。云开月出终有日，何须终日叹穷途。", meaning:"强求难得，随缘更安。所求之事暂未到时，先充实自身，时机自现。" },
      { no:60, level:"中签",   poem:"日出扶桑万里明，贵人携手上青云。粉墙朱户重门开，积善之家庆有馀。", meaning:"阴霾散去，贵人将至。积善之家必有余庆，事业感情皆有上升之机。" },
      { no:68, level:"中签",   poem:"锦上添花不足奇，雪中送炭最相宜。时来风送滕王阁，运去雷轰荐福碑。", meaning:"运势起伏有时。得意时助人，失意时忍守，潮起潮落皆是常事。" },
      { no:75, level:"中下签", poem:"宛如抱虎过山前，战战兢兢胆欲穿。幸得山高林密处，脱身归去保平安。", meaning:"眼前有险，所幸可避。诸事以稳为先，莫逞强、莫贪快，平安即是福。" },
      { no:82, level:"下签",   poem:"两只燕子语雕梁，此去他乡路渺茫。纵有家书千万字，不如归去守故乡。", meaning:"远行多阻，思乡心切。重要之事宜留在本土经营，勿轻言离乡背井。" },
      { no:90, level:"下签",   poem:"前途阻隔路难行，百计千方总未成。且守寒窗温旧业，待时一举上青云。", meaning:"时机未至，谋事多挫。宜沉淀学习、守住本分，待势转再图大举。" },
      { no:97, level:"下下签", poem:"云雾遮天未见星，风波平地起沧溟。劝君忍事休轻动，恐有灾危入砚屏。", meaning:"诸事不宜妄动。口舌官非、人际风波需避让，忍一时方保平安。" },
      { no:100,level:"下下签", poem:"否极泰来本有时，如今运蹇莫嗟咨。守心待得阳和转，自有春风满树枝。", meaning:"最暗之处，转机将生。眼下虽困，守正安心，否极泰来终有日。" }
    ]
  }

};
