// packages/core/src/humanize/lexicon.ts
// Built-in fatigue term list and cliche pattern registry.
// These data represent commonly overused phrases and structural patterns
// in AI-generated Chinese creative writing.
// ---------------------------------------------------------------------------
// Fatigue terms — words / phrases that AI models overuse.
// Grouped by category and sorted by severity.
// ---------------------------------------------------------------------------
export const FATIGUE_TERMS = [
    // --- Transitional / connective filler (过渡词) ---
    // Note: 「值得注意的是/不可否认/毋庸置疑」移至「填充短语」分类，
    //       「众所周知」移至「模糊归因」分类，避免重复检测。
    { term: "综上所述", suggestion: "删除，用自然的段落收束", severity: "high", category: "过渡词" },
    { term: "总而言之", suggestion: "删除，或融入叙述语气", severity: "high", category: "过渡词" },
    { term: "由此可见", suggestion: "删除，让叙事自己说话", severity: "high", category: "过渡词" },
    { term: "毋庸讳言", suggestion: "删除", severity: "high", category: "过渡词" },
    { term: "一言以蔽之", suggestion: "删除，用更自然的总结", severity: "medium", category: "过渡词" },
    { term: "换句话说", suggestion: "减少使用，避免反复解释", severity: "medium", category: "过渡词" },
    // --- Evaluative cliches (评价套话) ---
    { term: "淋漓尽致", suggestion: "用具体的动作或画面替代", severity: "medium", category: "评价套话" },
    { term: "跃然纸上", suggestion: "用具体的细节展示而非评价", severity: "medium", category: "评价套话" },
    { term: "栩栩如生", suggestion: "用具体的感官细节替代", severity: "medium", category: "评价套话" },
    { term: "引人入胜", suggestion: "用具体的情节张力替代", severity: "medium", category: "评价套话" },
    { term: "扣人心弦", suggestion: "用具体的紧张感描写替代", severity: "medium", category: "评价套话" },
    { term: "耐人寻味", suggestion: "用具体的余韵描写替代", severity: "medium", category: "评价套话" },
    { term: "意味深长", suggestion: "用具体的暗示替代", severity: "medium", category: "评价套话" },
    { term: "发人深省", suggestion: "删除，让读者自己感受", severity: "medium", category: "评价套话" },
    { term: "令人深思", suggestion: "删除，让读者自己感受", severity: "medium", category: "评价套话" },
    // Note: 「令人叹为观止」移至「广告腔」分类
    // --- Formulaic actions / emotions (动作/情绪套话) ---
    { term: "若有所思", suggestion: "用具体的表情或动作替代", severity: "medium", category: "情绪套话" },
    { term: "恍然大悟", suggestion: "用具体的心理活动替代", severity: "medium", category: "情绪套话" },
    { term: "不约而同", suggestion: "用各自独立的动作替代", severity: "medium", category: "情绪套话" },
    { term: "不由自主", suggestion: "用具体的驱动力替代", severity: "low", category: "情绪套话" },
    { term: "情不自禁", suggestion: "用具体的情绪描写替代", severity: "low", category: "情绪套话" },
    { term: "心头一震", suggestion: "用具体的生理反应替代", severity: "low", category: "情绪套话" },
    { term: "心中一凛", suggestion: "用具体的生理反应替代", severity: "low", category: "情绪套话" },
    // --- HIGH-FREQUENCY AI MARKERS (found in actual generated text) ---
    { term: "喉头发紧", suggestion: "根据具体情绪换用不同描写：哽咽/窒息感/舌根发苦/喉咙干涩等", severity: "high", category: "AI高频标记" },
    { term: "指节发白", suggestion: "用具体的动作反应替代（攥紧拳头到指甲嵌入掌心/手微微颤抖等）", severity: "high", category: "AI高频标记" },
    { term: "心理活动如潮水", suggestion: "删除，用具体的生理反应或动作表现心理波动", severity: "high", category: "AI高频标记" },
    { term: "如潮水般涌来", suggestion: "删除，用具体描写替代抽象比喻", severity: "high", category: "AI高频标记" },
    { term: "潮水般涌来", suggestion: "删除，用具体描写替代抽象比喻", severity: "high", category: "AI高频标记" },
    { term: "如潮水般", suggestion: "减少使用，换用更具体的比喻或直接白描", severity: "medium", category: "AI高频标记" },
    { term: "如刀割般", suggestion: "用具体的痛感描写替代（灼痛/钝痛/撕裂感等）", severity: "medium", category: "AI高频标记" },
    { term: "如针扎般", suggestion: "用具体的触感描写替代", severity: "medium", category: "AI高频标记" },
    { term: "如活物般", suggestion: "减少使用，用更具体的动态描写替代", severity: "medium", category: "AI高频标记" },
    { term: "心底涌起", suggestion: "删除，用具体动作或感受替代", severity: "medium", category: "AI高频标记" },
    { term: "心头涌起", suggestion: "删除，用具体动作或感受替代", severity: "medium", category: "AI高频标记" },
    { term: "涌起一股", suggestion: "删除，用具体描写替代", severity: "medium", category: "AI高频标记" },
    { term: "心底泛起", suggestion: "删除，用具体描写替代", severity: "low", category: "AI高频标记" },
    { term: "带着一丝", suggestion: "减少使用'带着XX的XX'句式，改用更直接的描写", severity: "medium", category: "AI高频标记" },
    { term: "带着疲惫", suggestion: "用具体的疲惫细节替代（眼皮沉重/脚步虚浮等）", severity: "low", category: "AI高频标记" },
    { term: "嘴角勾起", suggestion: "用更具体的笑容描写替代", severity: "low", category: "AI高频标记" },
    { term: "眼中闪过", suggestion: "用更具体的眼神描写替代，避免'闪过一丝XX'的模板", severity: "medium", category: "AI高频标记" },
    { term: "深吸一口气", suggestion: "不要每章都用，换用其他动作表现紧张/决断", severity: "low", category: "AI高频标记" },
    { term: "缓缓开口", suggestion: "减少使用，换用更具体的说话方式描写", severity: "low", category: "AI高频标记" },
    { term: "沉默片刻", suggestion: "减少使用，用具体的停顿动作或环境细节替代", severity: "low", category: "AI高频标记" },
    { term: "目光落在", suggestion: "减少使用，换用更具体的视线描写", severity: "low", category: "AI高频标记" },
    { term: "身形一闪", suggestion: "用更具体的动作描写替代", severity: "low", category: "AI高频标记" },
    { term: "化作灰烬", suggestion: "不要每次击败敌人都用'化作灰烬/光雨'，设计不同的击败效果", severity: "medium", category: "AI高频标记" },
    { term: "化作光雨", suggestion: "同上，设计差异化的战斗结果", severity: "medium", category: "AI高频标记" },
    { term: "化作光点", suggestion: "同上，差异化战斗反馈", severity: "medium", category: "AI高频标记" },
    { term: "焦糊味", suggestion: "不要每场战斗都有'焦糊味/焦灼金属味'，设计不同的气味", severity: "medium", category: "AI高频标记" },
    { term: "金属气息", suggestion: "同上，差异化嗅觉描写", severity: "low", category: "AI高频标记" },
    { term: "银白丝线", suggestion: "灵气描写不要每次都是'银白丝线'，根据场景和境界变化视觉表现", severity: "medium", category: "AI高频标记" },
    // --- Meta-commentary / writing-note leakage (元叙述/写作笔记泄漏) ---
    { term: "悬念钩子", suggestion: "删除！这是写作笔记语言，绝对不能出现在正文中", severity: "high", category: "写作笔记泄漏" },
    { term: "章节钩子", suggestion: "删除！这是写作笔记语言，绝对不能出现在正文中", severity: "high", category: "写作笔记泄漏" },
    { term: "钩子埋下", suggestion: "删除！这是写作笔记语言，绝对不能出现在正文中", severity: "high", category: "写作笔记泄漏" },
    { term: "伏笔埋下", suggestion: "删除！这是写作笔记语言", severity: "high", category: "写作笔记泄漏" },
    { term: "短句加速", suggestion: "删除！这是写作指导术语，绝对不能出现在正文中", severity: "high", category: "写作笔记泄漏" },
    { term: "比喻减速", suggestion: "删除！这是写作指导术语，绝对不能出现在正文中", severity: "high", category: "写作笔记泄漏" },
    { term: "动作场景中", suggestion: "删除！这是场景提示词，不是小说语言", severity: "high", category: "写作笔记泄漏" },
    { term: "本章完", suggestion: "删除！章节标记不应出现在正文中", severity: "high", category: "写作笔记泄漏" },
    { term: "待续", suggestion: "删除！章节结尾标记不应出现在正文中", severity: "medium", category: "写作笔记泄漏" },
    { term: "下一步计划", suggestion: "删除！这是大纲语言，不是小说叙事", severity: "high", category: "写作笔记泄漏" },
    { term: "计划分三步", suggestion: "删除！这是大纲语言，人物对话不应说'计划分三步'", severity: "high", category: "写作笔记泄漏" },
    { term: "战斗在", suggestion: "删除'战斗在XX展开/升级/拉锯'这类导演指令式写法，直接写战斗过程", severity: "medium", category: "写作笔记泄漏" },
    // --- English words mixed into Chinese text ---
    { term: "faint", suggestion: "删除英文单词，改用中文'微弱的/淡淡的'", severity: "high", category: "语言混杂" },
    { term: "sizzling", suggestion: "删除英文单词，改用中文'滋滋声/嘶嘶声'", severity: "high", category: "语言混杂" },
    { term: "OK", suggestion: "玄幻/古风背景中禁止使用，改用'好/行/可'", severity: "medium", category: "语言混杂" },
    { term: "cool", suggestion: "改用中文'厉害/不错/妙'", severity: "low", category: "语言混杂" },
    { term: "马拉松", suggestion: "古风/玄幻背景中禁止使用现代体育术语，改用'脱力/虚脱/精疲力竭'", severity: "high", category: "语言混杂" },
    // --- Overused simile markers (比喻标记) ---
    { term: "仿佛", suggestion: "偶尔使用可以，注意频率", severity: "low", category: "比喻标记" },
    { term: "犹如", suggestion: "偶尔使用可以，注意频率", severity: "low", category: "比喻标记" },
    { term: "宛如", suggestion: "偶尔使用可以，注意频率", severity: "low", category: "比喻标记" },
    { term: "宛若", suggestion: "偶尔使用可以，注意频率", severity: "low", category: "比喻标记" },
    // --- Meta-commentary (元叙述) ---
    { term: "让我们", suggestion: "删除，创意写作中避免元叙述", severity: "high", category: "元叙述" },
    { term: "接下来", suggestion: "用自然的场景转换替代", severity: "medium", category: "元叙述" },
    { term: "与此同时", suggestion: "减少使用，用场景切换替代", severity: "low", category: "元叙述" },
    // --- Over-inflation of significance (过度拔高) ---
    // AI 写作套路：用宏大词汇拔高事件意义，制造虚假的史诗感与历史感。
    { term: "标志着", suggestion: "删除或用具体事件描写替代，避免空洞的意义拔高", severity: "medium", category: "过度拔高" },
    { term: "至关重要的角色", suggestion: "用具体的贡献或影响替代空泛定位", severity: "medium", category: "过度拔高" },
    { term: "深刻印记", suggestion: "用具体的影响细节替代抽象比喻", severity: "medium", category: "过度拔高" },
    { term: "关键转折点", suggestion: "用具体的情节变化替代意义标签", severity: "medium", category: "过度拔高" },
    { term: "不断演变的面貌", suggestion: "用具体的变化过程替代抽象概括", severity: "low", category: "过度拔高" },
    { term: "具有重要意义", suggestion: "删除，用具体事实展示而非声明意义", severity: "high", category: "过度拔高" },
    { term: "深远影响", suggestion: "用具体的影响细节替代空泛概括", severity: "high", category: "过度拔高" },
    { term: "不容忽视", suggestion: "删除，用具体证据代替强制关注", severity: "medium", category: "过度拔高" },
    { term: "举足轻重", suggestion: "用具体的作用或地位描写替代成语标签", severity: "medium", category: "过度拔高" },
    // --- Promotional / advertising tone (广告腔) ---
    // AI 写作套路：使用宣传广告式的夸张赞美，偏离叙事文学语感。
    { term: "令人叹为观止", suggestion: "用具体的壮丽细节替代夸张赞美", severity: "medium", category: "广告腔" },
    { term: "美不胜收", suggestion: "用具体的视觉细节替代成语标签", severity: "medium", category: "广告腔" },
    { term: "气势磅礴", suggestion: "用具体的场景规模描写替代", severity: "medium", category: "广告腔" },
    { term: "蔚为壮观", suggestion: "用具体的观感细节替代套话", severity: "medium", category: "广告腔" },
    { term: "令人震撼", suggestion: "用具体的冲击感描写替代直白宣告", severity: "medium", category: "广告腔" },
    { term: "无与伦比", suggestion: "删除绝对化赞美，用具体对比展示独特性", severity: "high", category: "广告腔" },
    { term: "前所未有", suggestion: "用具体的创新细节替代空泛宣言", severity: "high", category: "广告腔" },
    { term: "惊天动地", suggestion: "用具体的事件规模描写替代夸张", severity: "medium", category: "广告腔" },
    { term: "波澜壮阔", suggestion: "用具体的过程描写替代宏大叙事标签", severity: "medium", category: "广告腔" },
    // --- Vague attribution (模糊归因) ---
    // AI 写作套路：用模糊信源归因制造权威感，缺乏具体出处。
    { term: "专家认为", suggestion: "指明具体专家姓名与身份，或删除归因直接陈述", severity: "high", category: "模糊归因" },
    { term: "观察家指出", suggestion: "指明具体观察家或删除模糊信源", severity: "high", category: "模糊归因" },
    { term: "有消息称", suggestion: "指明具体消息来源或删除", severity: "high", category: "模糊归因" },
    { term: "业内人士透露", suggestion: "指明具体业内人士身份或删除", severity: "high", category: "模糊归因" },
    { term: "众所周知", suggestion: "删除，读者已知则无需声明；未知则需给出具体证据", severity: "high", category: "模糊归因" },
    { term: "普遍认为", suggestion: "指明具体群体或数据来源，避免泛化归因", severity: "medium", category: "模糊归因" },
    { term: "一般认为", suggestion: "指明具体认知主体或删除", severity: "medium", category: "模糊归因" },
    { term: "据说", suggestion: "指明具体传言来源或删除", severity: "medium", category: "模糊归因" },
    // --- Filler phrases (填充短语) ---
    // AI 写作套路：用断言式填充短语替代论证，制造不容置疑的语气。
    { term: "毫无疑问", suggestion: "删除，用具体证据支撑论点而非空泛断言", severity: "high", category: "填充短语" },
    { term: "不可否认", suggestion: "删除，用具体细节代替断言", severity: "high", category: "填充短语" },
    { term: "毋庸置疑", suggestion: "删除", severity: "high", category: "填充短语" },
    { term: "显而易见", suggestion: "删除，用具体描写让读者自行得出结论", severity: "high", category: "填充短语" },
    { term: "值得注意的是", suggestion: "删除，或用具体事实引出", severity: "high", category: "填充短语" },
    { term: "需要指出的是", suggestion: "删除，直接陈述要点", severity: "high", category: "填充短语" },
];
// ---------------------------------------------------------------------------
// Cliche patterns — structural / frequency-based detection.
// Each pattern fires when its regex matches exceed the per-1k threshold.
// ---------------------------------------------------------------------------
export const CLICHE_PATTERNS = [
    {
        id: "consecutive-idioms",
        description: "连续使用三个及以上四字成语",
        regex: /[\u4e00-\u9fff]{4}(?:[，、；][\u4e00-\u9fff]{4}){2,}/g,
        severity: "medium",
        suggestion: "拆散成语堆砌，用口语化或具象描写替代部分成语",
        thresholdPer1k: 0,
    },
    {
        id: "however-sentence-start",
        description: "频繁以「然而」开头转折",
        regex: /(^|[。！？\n])\s*然而/g,
        severity: "medium",
        suggestion: "减少转折词使用，用情节自然推进代替显式转折",
        thresholdPer1k: 2,
    },
    {
        id: "not-only-but-also",
        description: "频繁使用「不仅…而且…」句式",
        regex: /不仅[^。！？]*?而且/g,
        severity: "medium",
        suggestion: "拆分并列句，用两个独立句子替代递进句式",
        thresholdPer1k: 1,
    },
    {
        id: "locative-opening",
        description: "频繁以「在这个/在这」开头",
        regex: /(^|[。！？\n])\s*在这(个|里)/g,
        severity: "low",
        suggestion: "用具体的场景细节替代泛化空间指示",
        thresholdPer1k: 2,
    },
    {
        id: "em-dash-overuse",
        description: "破折号(——)使用过多",
        regex: /——/g,
        severity: "low",
        suggestion: "减少破折号，用逗号或句号替代",
        thresholdPer1k: 3,
    },
    {
        id: "ellipsis-overuse",
        description: "省略号(……)使用过多",
        regex: /……/g,
        severity: "low",
        suggestion: "减少省略号，用具体描写替代留白",
        thresholdPer1k: 3,
    },
    {
        id: "passive-voice-cluster",
        description: "被动句式(被/为…所)密集出现",
        regex: /被[^。！？]{1,20}[，。！？]|为[^。！？]{1,15}所/g,
        severity: "low",
        suggestion: "改用主动语态，让动作发出者做主语",
        thresholdPer1k: 3,
    },
    {
        id: "listing-enumeration",
        description: "频繁使用「首先…其次…最后」枚举",
        regex: /首先[\s\S]{0,300}?其次[\s\S]{0,300}?(?:最后|再次|然后)/g,
        severity: "high",
        suggestion: "创意写作中避免枚举式行文，用叙事节奏替代",
        thresholdPer1k: 0,
    },
    {
        id: "bujin-frequency",
        description: "频繁使用「不禁」表示自发性动作",
        regex: /不禁/g,
        severity: "medium",
        suggestion: "减少「不禁」使用，用具体动作或心理描写替代",
        thresholdPer1k: 2,
    },
    {
        id: "fangfo-yiban-simile",
        description: "频繁使用「仿佛…一般」比喻句式",
        regex: /仿佛[^。！？\n]{1,50}?一般/g,
        severity: "medium",
        suggestion: "减少比喻句式，用直白描写替代部分比喻",
        thresholdPer1k: 1.5,
    },
    {
        id: "xinzong-yidong",
        description: "频繁使用「心中一动」心理描写套话",
        regex: /心中一动/g,
        severity: "medium",
        suggestion: "用具体的心理活动或生理反应替代",
        thresholdPer1k: 2,
    },
    {
        id: "zuijiao-shangyang",
        description: "频繁使用「嘴角微微上扬」微表情描写",
        regex: /嘴角微微上扬/g,
        severity: "low",
        suggestion: "用更具体的笑容或表情描写替代",
        thresholdPer1k: 1,
    },
    {
        id: "yanzhong-shanguo",
        description: "频繁使用「眼中闪过一丝」眼神描写套话",
        regex: /眼中闪过一丝/g,
        severity: "low",
        suggestion: "用更具体的目光或眼神描写替代",
        thresholdPer1k: 1,
    },
    {
        id: "bujin-chensi",
        description: "频繁使用「不禁陷入了沉思」沉思套话",
        regex: /不禁陷入了沉思/g,
        severity: "medium",
        suggestion: "用具体的思考过程或动作替代沉思套话",
        thresholdPer1k: 1,
    },
    {
        id: "shengyin-cixing",
        description: "使用「声音低沉而富有磁性」声音描写套话",
        regex: /声音低沉而富有磁性/g,
        severity: "medium",
        suggestion: "用独特的声音特征描写替代套话",
        thresholdPer1k: 0.5,
    },
    {
        id: "rutong-ban-simile",
        description: "频繁使用「如同…般」比喻标记",
        regex: /如同[^。！？\n]{1,50}?般/g,
        severity: "medium",
        suggestion: "减少比喻标记，用直白叙述替代部分比喻",
        thresholdPer1k: 2,
    },
    // --- Synonym rotation (同义词轮换) ---
    // AI 写作套路：在同一段落内轮换使用近义词，制造词汇丰富假象，
    // 实则暴露刻意感。以下模式检测近义词扎堆出现（需 2 个以上同组词
    // 在窗口内同时出现才触发，避免对正常单独使用误报）。
    {
        id: "protagonist-synonym-rotation",
        description: "同一段落内轮换使用「主角/主人公/中心人物/英雄」等称呼",
        regex: /(?:主角|主人公|中心人物|英雄)[\s\S]{0,300}?(?:主角|主人公|中心人物|英雄)/g,
        severity: "medium",
        suggestion: "统一人物称呼，避免同段内频繁轮换同义词造成刻意感",
        thresholdPer1k: 1,
    },
    {
        id: "causal-conjunction-cluster",
        description: "「于是/因此/所以/故而/便」因果连词扎堆出现",
        regex: /(?:于是|因此|所以|故而|便)[\s\S]{0,150}?(?:于是|因此|所以|故而|便)/g,
        severity: "medium",
        suggestion: "减少因果连词堆叠，用自然逻辑推进替代显式连接",
        thresholdPer1k: 1,
    },
    {
        id: "adversative-conjunction-cluster",
        description: "「然而/但是/不过/可是/只是」转折连词扎堆出现",
        regex: /(?:然而|但是|不过|可是|只是)[\s\S]{0,150}?(?:然而|但是|不过|可是|只是)/g,
        severity: "medium",
        suggestion: "减少转折连词堆叠，用情节自然反转替代显式转折",
        thresholdPer1k: 1,
    },
    // --- Triple-formula overuse (三件套) ---
    // AI 写作套路：程式化三段句式，制造工整的递进/并列/枚举效果，
    // 暴露模板化行文痕迹。
    {
        id: "not-only-but-also-more",
        description: "使用「不仅…而且…更…」三段递进句式",
        regex: /不仅[^。！？\n]{0,80}?而且[^。！？\n]{0,80}?更/g,
        severity: "medium",
        suggestion: "拆解三段递进，用独立句子或具体描写替代程式化递进",
        thresholdPer1k: 0.5,
    },
    {
        id: "both-and-also-pattern",
        description: "使用「既…又…还…」三段并列句式",
        regex: /既[^。！？\n]{0,80}?又[^。！？\n]{0,80}?还/g,
        severity: "medium",
        suggestion: "拆解三段并列，避免程式化的排比堆砌",
        thresholdPer1k: 0.5,
    },
    {
        id: "from-to-to-pattern",
        description: "使用「从…到…再到…」三段枚举句式",
        regex: /从[^。！？\n]{0,80}?到[^。！？\n]{0,80}?再到/g,
        severity: "medium",
        suggestion: "减少三段枚举句式，用叙事铺陈替代程式化列举",
        thresholdPer1k: 0.5,
    },
];
// ---------------------------------------------------------------------------
// Synonym groups — terms that refer to the same entity / concept.
// Used by the burstiness engine to detect "同义词轮换": AI's habit of
// cycling through different words for the same referent within a paragraph.
// NOTE: within each group, no term should be a substring of another, to
// avoid double-counting a single occurrence.
// ---------------------------------------------------------------------------
export const SYNONYM_GROUPS = [
    {
        id: "protagonist",
        description: "主角 / 主人公 / 中心人物 等同义轮换",
        terms: ["主角", "主人公", "中心人物", "英雄", "主要角色"],
    },
    {
        id: "enemy",
        description: "敌人 / 对手 / 仇敌 等同义轮换",
        terms: ["敌人", "对手", "仇敌", "强敌", "敌手", "死敌"],
    },
    {
        id: "friend",
        description: "朋友 / 伙伴 / 同伴 等同义轮换",
        terms: ["朋友", "伙伴", "同伴", "挚友", "友人", "战友"],
    },
    {
        id: "teacher",
        description: "老师 / 师父 / 师傅 等同义轮换",
        terms: ["老师", "师父", "师傅", "导师", "恩师", "师长"],
    },
    {
        id: "world",
        description: "世界 / 天地 / 世间 等同义轮换",
        terms: ["世界", "天地", "世间", "尘世", "天下", "俗世"],
    },
    {
        id: "power",
        description: "力量 / 实力 / 功力 等同义轮换",
        terms: ["力量", "实力", "功力", "修为", "能量", "法力"],
    },
    {
        id: "battle",
        description: "战斗 / 厮杀 / 交锋 等同义轮换",
        terms: ["战斗", "厮杀", "交锋", "激战", "搏杀", "对战"],
    },
    {
        id: "child",
        description: "孩子 / 孩童 / 稚童 等同义轮换",
        terms: ["孩子", "孩童", "稚童", "幼童", "小童", "孩提"],
    },
    {
        id: "city",
        description: "城市 / 都市 / 城池 等同义轮换",
        terms: ["城市", "都市", "城池", "城邦", "城镇"],
    },
    {
        id: "story",
        description: "故事 / 传说 / 往事 等同义轮换",
        terms: ["故事", "传说", "往事", "旧事", "轶事", "传闻"],
    },
];
//# sourceMappingURL=lexicon.js.map