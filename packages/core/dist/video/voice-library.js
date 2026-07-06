// Voice Library for AI short-drama video generation (V3.0)
//
// 300+ voice profiles covering female/male/special/dialect categories, with
// auto-matching logic based on character gender/age/archetype.
// Each profile produces a Chinese voice-anchoring sentence that can be
// directly injected into a Seedance/Grok video prompt.
//
// Voice profile structure:
//   id        - Stable identifier (e.g. F03A, M04A, S02A, D01A)
//   name      - Chinese display name
//   gender    - "female" | "male" | "special"
//   ageRange  - [min, max] in years
//   category  - Category label (幼女/少女/御姐/男童/青年/老年/粤语/东北话/etc.)
//   desc      - Chinese description for prompt injection
//   archetypes- Short-drama archetypes this voice fits (霸总/女主/反派/etc.)
// ---------------------------------------------------------------------------
// Female voices (65)
// ---------------------------------------------------------------------------
const FEMALE_VOICES = [
    // F01 幼女声 (6-10)
    { id: "F01A", name: "幼萝奶糯音", gender: "female", ageRange: [6, 9], category: "幼女声",
        desc: "奶声奶气，甜软稚嫩，语速偏慢，像小奶猫说话", archetypes: ["幼女", "小女孩", "孩童"] },
    { id: "F01B", name: "幼女清脆音", gender: "female", ageRange: [7, 10], category: "幼女声",
        desc: "清脆明亮，吐字清楚，带机灵感，像活泼的小女孩", archetypes: ["幼女", "小女孩", "机灵鬼"] },
    { id: "F01C", name: "幼女怯生音", gender: "female", ageRange: [6, 10], category: "幼女声",
        desc: "声音轻软，带气声，语速偏慢，像害怕时低声说话", archetypes: ["幼女", "害怕的小女孩"] },
    { id: "F01D", name: "幼女撒娇音", gender: "female", ageRange: [6, 9], category: "幼女声",
        desc: "奶声奶气带撒娇，尾音拖长上扬，黏人哼唧，像在央求大人", archetypes: ["幼女", "撒娇小女孩", "女儿"] },
    { id: "F01E", name: "幼女好奇音", gender: "female", ageRange: [7, 10], category: "幼女声",
        desc: "清脆带疑问上扬，语速偏快，不停追问为什么，天真好奇", archetypes: ["幼女", "好奇小女孩"] },
    { id: "F01F", name: "幼女委屈音", gender: "female", ageRange: [6, 10], category: "幼女声",
        desc: "奶软带哭腔，尾音颤抖，吸鼻子，像被训斥后委屈巴巴", archetypes: ["幼女", "受委屈小女孩"] },
    { id: "F01G", name: "幼女开心音", gender: "female", ageRange: [7, 10], category: "幼女声",
        desc: "明亮欢快，语速快，带咯咯笑，像得到糖果般雀跃", archetypes: ["幼女", "开心小女孩"] },
    // F02 少萝声 (11-15)
    { id: "F02A", name: "少萝傲娇音", gender: "female", ageRange: [11, 14], category: "少萝声",
        desc: "清脆偏甜，语速略快，带小脾气嘴硬感", archetypes: ["傲娇少女", "妹妹"] },
    { id: "F02B", name: "少萝软萌音", gender: "female", ageRange: [11, 14], category: "少萝声",
        desc: "甜软，带轻微鼻音和气声，语速中慢，乖巧可爱", archetypes: ["软萌少女", "妹妹"] },
    { id: "F02C", name: "少萝早熟音", gender: "female", ageRange: [12, 15], category: "少萝声",
        desc: "吐字清晰利落，语气冷静，有小大人成熟感", archetypes: ["早熟少女"] },
    { id: "F02D", name: "少萝活泼音", gender: "female", ageRange: [11, 14], category: "少萝声",
        desc: "清脆轻快，语速偏快，跳跃有弹性，机灵爱闹", archetypes: ["活泼少女", "妹妹", "机灵鬼"] },
    { id: "F02E", name: "少萝撒娇音", gender: "female", ageRange: [11, 14], category: "少萝声",
        desc: "甜软带拖音，撒娇哼唧，尾音上扬，黏人求关注", archetypes: ["撒娇少女", "妹妹"] },
    { id: "F02F", name: "少萝毒舌音", gender: "female", ageRange: [12, 15], category: "少萝声",
        desc: "清脆利落，语速快，吐字带刺，嘴毒不留情面", archetypes: ["毒舌少女", "嘴硬妹妹"] },
    { id: "F02G", name: "少萝天然呆音", gender: "female", ageRange: [11, 15], category: "少萝声",
        desc: "软糯慢半拍，反应迟钝，天然呆萌，语速偏慢", archetypes: ["天然呆少女", "迷糊妹妹"] },
    // F03 少女声 (15-22) — most used
    { id: "F03A", name: "少女清亮利落音", gender: "female", ageRange: [15, 20], category: "少女声",
        desc: "清亮干净，吐字利落，语速中等偏快，句尾轻扬，明亮真诚", archetypes: ["女主", "少女", "大学生", "活泼女主"] },
    { id: "F03B", name: "少女软糯甜感音", gender: "female", ageRange: [15, 20], category: "少女声",
        desc: "柔软偏甜，带轻微鼻音和气声，语速中慢，温柔亲近", archetypes: ["甜妹", "软妹", "邻家女孩"] },
    { id: "F03C", name: "少女元气快语音", gender: "female", ageRange: [16, 22], category: "少女声",
        desc: "明亮轻快，语速偏快，吐字有弹性，带笑意，积极热情", archetypes: ["元气少女", "活泼女主"] },
    { id: "F03D", name: "少女怯生气声音", gender: "female", ageRange: [15, 21], category: "少女声",
        desc: "声音轻，音量低，带气声，语速偏慢，紧张怯生", archetypes: ["怯弱少女", "受委屈的女主"] },
    { id: "F03E", name: "少女倔强紧绷音", gender: "female", ageRange: [16, 22], category: "少女声",
        desc: "清亮略紧，吐字有力，句尾压住，忍住委屈愤怒不肯低头", archetypes: ["倔强女主", "不服输少女"] },
    { id: "F03F", name: "少女冷淡早熟音", gender: "female", ageRange: [16, 22], category: "少女声",
        desc: "干净偏冷，语速中慢，吐字清晰，理智疏离", archetypes: ["冷感少女", "学霸", "高冷女主"] },
    { id: "F03G", name: "少女治愈暖音", gender: "female", ageRange: [16, 22], category: "少女声",
        desc: "柔和温暖，带轻微气声，语速中慢，像阳光一样治愈人心", archetypes: ["治愈少女", "暖妹", "邻家女孩"] },
    { id: "F03H", name: "少女毒舌利嘴音", gender: "female", ageRange: [16, 22], category: "少女声",
        desc: "清亮利落，语速快，吐字带锋芒，嘴毒一针见血", archetypes: ["毒舌少女", "嘴炮女主"] },
    { id: "F03I", name: "少女哭腔颤抖音", gender: "female", ageRange: [15, 21], category: "少女声",
        desc: "带哭腔，声音颤抖，鼻音重，吸鼻子，委屈到说不出话", archetypes: ["受委屈女主", "哭戏少女"] },
    { id: "F03J", name: "少女英气飒爽音", gender: "female", ageRange: [17, 22], category: "少女声",
        desc: "干净利落，略偏低，语速中等，飒爽英气，有少年感", archetypes: ["飒爽女主", "女侠", "警花"] },
    { id: "F03K", name: "少女偶像舞台音", gender: "female", ageRange: [16, 22], category: "少女声",
        desc: "甜美明亮，语速中等，带舞台表演感，元气十足像偶像打call", archetypes: ["偶像", "女团", "明星"] },
    { id: "F03L", name: "少女沙哑烟嗓音", gender: "female", ageRange: [18, 24], category: "少女声",
        desc: "略沙哑有颗粒感，偏低但不老，慵懒带故事感，像熬夜后", archetypes: ["烟嗓少女", "酷女孩", "乐队女主唱"] },
    { id: "F03M", name: "少女娇蛮任性音", gender: "female", ageRange: [15, 20], category: "少女声",
        desc: "明亮偏高，语速快，任性娇蛮，爱指挥人，大小姐脾气", archetypes: ["娇蛮大小姐", "任性女主"] },
    { id: "F03N", name: "少女空灵仙气音", gender: "female", ageRange: [16, 22], category: "少女声",
        desc: "轻柔空灵，带微弱回响感，语速慢，飘渺不食人间烟火", archetypes: ["仙气少女", "精灵", "仙女"] },
    // F04 少御声 (20-34)
    { id: "F04A", name: "少御清冷音", gender: "female", ageRange: [20, 28], category: "少御声",
        desc: "干净偏冷，语速中慢，吐字利落，情绪克制，带疏离感", archetypes: ["清冷女主", "御姐", "白领"] },
    { id: "F04B", name: "少御贵气音", gender: "female", ageRange: [20, 30], category: "少御声",
        desc: "清冷干净，语速中慢，吐字标准，矜持优雅，带富家千金骄傲感", archetypes: ["千金", "名媛", "富家女"] },
    { id: "F04C", name: "少御知性音", gender: "female", ageRange: [23, 32], category: "少御声",
        desc: "干净稳定，语速中等偏慢，吐字有条理，理性温和，带专业感", archetypes: ["知性女", "医生", "律师", "姐姐"] },
    { id: "F04D", name: "少御疲惫音", gender: "female", ageRange: [24, 34], category: "少御声",
        desc: "略低，带气声，语速偏慢，句尾下沉，疲惫克制", archetypes: ["疲惫女主", "打工人", "失意女"] },
    { id: "F04E", name: "少御疯批音", gender: "female", ageRange: [20, 32], category: "少御声",
        desc: "轻柔偏冷，语速中慢，表面温柔底层带危险偏执，偶尔冷笑", archetypes: ["疯批女", "病娇", "反派女"] },
    { id: "F04F", name: "少御慵懒音", gender: "female", ageRange: [22, 32], category: "少御声",
        desc: "略低慵懒，漫不经心，语速偏慢，尾音拖长，像刚睡醒", archetypes: ["慵懒御姐", "猫系女"] },
    { id: "F04G", name: "少御腹黑音", gender: "female", ageRange: [22, 32], category: "少御声",
        desc: "温柔表象带腹黑，语速中慢，笑意盈盈却暗藏算计，笑里藏刀", archetypes: ["腹黑女", "绿茶", "心机女"] },
    { id: "F04H", name: "少御电台暖音", gender: "female", ageRange: [24, 34], category: "少御声",
        desc: "温暖磁性，圆润好听，语速中等，像深夜电台主播娓娓道来", archetypes: ["电台主播", "知性姐姐"] },
    { id: "F04I", name: "少御御宅清冷音", gender: "female", ageRange: [20, 30], category: "少御声",
        desc: "清冷寡言，音量偏低，语速偏慢，宅系疏离，不爱说话", archetypes: ["宅女", "社恐御姐"] },
    // F05 御姐声 (25-45)
    { id: "F05A", name: "御姐冷艳音", gender: "female", ageRange: [25, 38], category: "御姐声",
        desc: "沉稳冷艳，语速中慢，吐字有压迫感，冷静克制，掌控感", archetypes: ["御姐", "女总裁", "女上司", "女王"] },
    { id: "F05B", name: "御姐温柔音", gender: "female", ageRange: [25, 40], category: "御姐声",
        desc: "柔和稳定，语速中慢，吐字轻柔，温暖包容，有安抚感", archetypes: ["温柔御姐", "人妻", "母亲"] },
    { id: "F05C", name: "御姐烟嗓音", gender: "female", ageRange: [28, 42], category: "御姐声",
        desc: "略沙哑，带成熟颗粒感，语速中慢，慵懒有故事感", archetypes: ["烟嗓御姐", "成熟女", "风情女"] },
    { id: "F05D", name: "御姐反派音", gender: "female", ageRange: [28, 45], category: "御姐声",
        desc: "冷硬，吐字有锋芒，语速偏慢，句尾下沉，带轻蔑控制感", archetypes: ["女反派", "恶女", "后妈"] },
    { id: "F05E", name: "御姐霸气女王音", gender: "female", ageRange: [25, 40], category: "御姐声",
        desc: "沉稳强势，气场强大，吐字有力，语速中慢，不怒自威", archetypes: ["女王", "女总裁", "霸气女主"] },
    { id: "F05F", name: "御姐妩媚风情音", gender: "female", ageRange: [28, 42], category: "御姐声",
        desc: "慵懒妩媚，尾音微拖带勾，语速中慢，风情万种勾人心魄", archetypes: ["风情女", "妖姬", "红颜祸水"] },
    { id: "F05G", name: "御姐干练职场音", gender: "female", ageRange: [28, 40], category: "御姐声",
        desc: "干练利落，语速偏快，吐字清楚果断，职场女强人不拖泥带水", archetypes: ["女强人", "职场御姐", "女高管"] },
    { id: "F05H", name: "御姐慵懒低沉音", gender: "female", ageRange: [28, 42], category: "御姐声",
        desc: "低沉慵懒，漫不经心，语速偏慢，像靠在沙发上漫不经心说话", archetypes: ["慵懒御姐", "贵妇", "闲散女"] },
    { id: "F05I", name: "御姐病娇痴狂音", gender: "female", ageRange: [25, 38], category: "御姐声",
        desc: "轻柔偏冷转偏执，语速忽快忽慢，温柔中带病态痴狂，危险迷人", archetypes: ["病娇御姐", "疯批美人", "痴恋女"] },
    // F06 中年女性 (35-55)
    { id: "F06A", name: "贵妇御妈音", gender: "female", ageRange: [35, 50], category: "中年女性",
        desc: "语速偏慢，吐字标准，优雅稳重，带笑但暗含锋芒", archetypes: ["贵妇", "婆婆", "富太太"] },
    { id: "F06B", name: "中年母亲温厚音", gender: "female", ageRange: [38, 55], category: "中年女性",
        desc: "温暖厚实，语速中慢，吐字柔和，关切疲惫包容", archetypes: ["母亲", "妈妈", "阿姨"] },
    { id: "F06C", name: "中年市井女声", gender: "female", ageRange: [35, 55], category: "中年女性",
        desc: "音量偏大，语速偏快，咬字重，直接强势，挑剔泼辣", archetypes: ["市井大妈", "邻居", "恶婆婆"] },
    { id: "F06D", name: "严厉女教师音", gender: "female", ageRange: [35, 55], category: "中年女性",
        desc: "吐字清楚，语速中等，咬字偏重，严肃有秩序感", archetypes: ["老师", "教导主任"] },
    { id: "F06E", name: "中年干练女强人音", gender: "female", ageRange: [38, 52], category: "中年女性",
        desc: "干练利落，语速偏快，吐字清楚有力，雷厉风行不废话", archetypes: ["女强人", "女老板", "职场中年女"] },
    { id: "F06F", name: "中年泼辣尖音", gender: "female", ageRange: [38, 55], category: "中年女性",
        desc: "尖锐高亢，音量大，语速快，泼辣爱吵架，得理不饶人", archetypes: ["泼辣大妈", "吵架王", "恶邻居"] },
    { id: "F06G", name: "中年优雅文艺音", gender: "female", ageRange: [40, 55], category: "中年女性",
        desc: "优雅知性，语速中慢，吐字柔和圆润，文艺气息，有涵养", archetypes: ["文艺中年女", "作家", "艺术家"] },
    { id: "F06H", name: "中年疲惫打工音", gender: "female", ageRange: [38, 55], category: "中年女性",
        desc: "略沙哑带疲态，语速偏慢，句尾下沉，常年操劳透支感", archetypes: ["疲惫中年女", "打工阿姨", "底层母亲"] },
    { id: "F06I", name: "中年算计心机音", gender: "female", ageRange: [40, 55], category: "中年女性",
        desc: "语速中慢，带笑但精明算计，话里有话，城府深", archetypes: ["心机婆婆", "算计大妈", "宅斗配角"] },
    // F07 老年女性 (65+)
    { id: "F07A", name: "慈祥奶奶音", gender: "female", ageRange: [65, 90], category: "老年女性",
        desc: "年迈温和，气息略弱，语速慢，尾音微虚，慈祥亲切", archetypes: ["奶奶", "外婆", "老人"] },
    { id: "F07B", name: "阴沉老妇音", gender: "female", ageRange: [65, 90], category: "老年女性",
        desc: "年迈偏低，语速很慢，气息轻，句尾下沉，阴郁审视", archetypes: ["阴毒老太", "反派老人"] },
    { id: "F07C", name: "老年唠叨奶奶音", gender: "female", ageRange: [65, 90], category: "老年女性",
        desc: "年迈温和，语速偏快但断续，爱唠叨碎碎念，反复叮嘱", archetypes: ["唠叨奶奶", "外婆"] },
    { id: "F07D", name: "老年威严老太音", gender: "female", ageRange: [65, 90], category: "老年女性",
        desc: "年迈但中气足，吐字清楚有力，语速偏慢，不怒自威有家族权威", archetypes: ["老太君", "家族长辈", "强势老太"] },
    { id: "F07E", name: "老年慈笑奶奶音", gender: "female", ageRange: [65, 90], category: "老年女性",
        desc: "年迈温和，总带笑意，语速慢，慈祥和蔼爱讲过去的故事", archetypes: ["慈祥奶奶", "讲故事老人"] },
    { id: "F07F", name: "老年市井老太音", gender: "female", ageRange: [65, 88], category: "老年女性",
        desc: "年迈但嗓门大，语速快，爱八卦家长里短，市井烟火气", archetypes: ["八卦老太", "邻居奶奶"] },
];
// ---------------------------------------------------------------------------
// Male voices (50)
// ---------------------------------------------------------------------------
const MALE_VOICES = [
    // M01 男童声 (7-12)
    { id: "M01A", name: "正太清脆音", gender: "male", ageRange: [7, 12], category: "男童声",
        desc: "稚嫩偏高但不女化，清脆自然，带小男孩天真好奇感", archetypes: ["小男孩", "正太", "孩童"] },
    { id: "M01B", name: "男童调皮音", gender: "male", ageRange: [8, 12], category: "男童声",
        desc: "清脆偏亮，语速略快，带淘气机灵感", archetypes: ["调皮男孩", "熊孩子"] },
    { id: "M01C", name: "男童怯弱音", gender: "male", ageRange: [7, 12], category: "男童声",
        desc: "偏高但音量低，语速偏慢，吐字小心，害怕犹豫", archetypes: ["怯弱男孩"] },
    { id: "M01D", name: "男童活泼音", gender: "male", ageRange: [8, 12], category: "男童声",
        desc: "清脆明亮，语速快，活力十足，像刚放学满院子跑", archetypes: ["活泼男孩", "熊孩子"] },
    { id: "M01E", name: "男童哭腔音", gender: "male", ageRange: [7, 12], category: "男童声",
        desc: "稚嫩带哭腔，吸鼻子，断断续续，委屈或害怕", archetypes: ["哭戏男孩", "受委屈小男孩"] },
    { id: "M01F", name: "男童认真音", gender: "male", ageRange: [9, 12], category: "男童声",
        desc: "清脆但语气认真严肃，像小大人一本正经说道理", archetypes: ["认真男孩", "小大人"] },
    // M02 少年声 (13-22)
    { id: "M02A", name: "少年清朗音", gender: "male", ageRange: [13, 18], category: "少年声",
        desc: "清亮干净，带少年稚气，情绪真诚，有青春热血感", archetypes: ["少年男主", "学长", "少年"] },
    { id: "M02B", name: "少年热血音", gender: "male", ageRange: [15, 20], category: "少年声",
        desc: "明亮有冲劲，语速偏快，咬字有力，积极冲动充满斗志", archetypes: ["热血少年", "运动少年"] },
    { id: "M02C", name: "少年倔强音", gender: "male", ageRange: [15, 20], category: "少年声",
        desc: "清亮带紧绷感，语速中等偏快，咬字有力，压着愤怒不甘", archetypes: ["倔强少年", "叛逆少年"] },
    { id: "M02D", name: "少年阴郁音", gender: "male", ageRange: [15, 22], category: "少年声",
        desc: "偏低但有少年感，语速偏慢，吐字轻，句尾下沉，压抑冷淡", archetypes: ["阴郁少年", "问题少年"] },
    { id: "M02E", name: "少年干净纯粹音", gender: "male", ageRange: [13, 18], category: "少年声",
        desc: "干净清澈无杂质，语速中等，真诚纯粹，像白纸一样干净", archetypes: ["纯净少年", "初恋学长"] },
    { id: "M02F", name: "少年痞气不羁音", gender: "male", ageRange: [16, 22], category: "少年声",
        desc: "略偏低带痞气，语速略快，玩世不恭，不羁嚣张", archetypes: ["痞气少年", "校霸", "坏男孩"] },
    { id: "M02G", name: "少年学霸斯文音", gender: "male", ageRange: [15, 20], category: "少年声",
        desc: "干净温和，语速中慢，吐字斯文有理，理性克制", archetypes: ["学霸少年", "优等生"] },
    { id: "M02H", name: "少年哭腔压抑音", gender: "male", ageRange: [15, 20], category: "少年声",
        desc: "压着哭腔，声音紧绷颤抖，强忍不哭出来，倔强委屈", archetypes: ["受委屈少年", "哭戏少年"] },
    // M03 青年声 (20-35)
    { id: "M03A", name: "青年温润音", gender: "male", ageRange: [20, 30], category: "青年声",
        desc: "干净温和，语速中慢，吐字柔和，情绪稳定有亲和力", archetypes: ["温柔男二", "暖男", "学长"] },
    { id: "M03B", name: "青年阳光音", gender: "male", ageRange: [20, 28], category: "青年声",
        desc: "明亮自然，语速中等偏快，带笑意，开朗积极", archetypes: ["阳光男主", "运动男", "男孩"] },
    { id: "M03C", name: "青年痞帅音", gender: "male", ageRange: [20, 32], category: "青年声",
        desc: "语速略快，吐字自然，语气带笑，尾音微扬，玩世不恭", archetypes: ["痞帅男", "坏男孩", "浪子"] },
    { id: "M03D", name: "青年书卷音", gender: "male", ageRange: [20, 32], category: "青年声",
        desc: "干净温和，语速中慢，吐字雅致，理性有书生气", archetypes: ["书生", "学霸", "文弱男"] },
    { id: "M03E", name: "青年阴郁音", gender: "male", ageRange: [20, 35], category: "青年声",
        desc: "偏低，音量不大，语速慢，吐字轻但清楚，尾音下坠，压抑冷漠", archetypes: ["阴郁男主", "反派青年"] },
    { id: "M03F", name: "青年低沉磁性音", gender: "male", ageRange: [22, 32], category: "青年声",
        desc: "低沉有磁性，胸腔共鸣，语速中慢，沉稳好听有魅力", archetypes: ["磁性青年", "深情男", "男神"] },
    { id: "M03G", name: "青年玩世不恭音", gender: "male", ageRange: [22, 32], category: "青年声",
        desc: "慵懒带笑，语速中等，吐字随意，玩世不恭看透一切", archetypes: ["浪子", "纨绔", "花花公子"] },
    { id: "M03H", name: "青年学霸理性音", gender: "male", ageRange: [22, 32], category: "青年声",
        desc: "干净理性，语速中等，吐字精准有条理，书卷气重", archetypes: ["学霸", "研究员", "医生"] },
    { id: "M03I", name: "青年哭腔哽咽音", gender: "male", ageRange: [22, 32], category: "青年声",
        desc: "低沉带哽咽，声音紧绷，强忍哭泣，压抑的悲伤", archetypes: ["哭戏青年", "失意男主"] },
    { id: "M03J", name: "青年热血冲动音", gender: "male", ageRange: [20, 28], category: "青年声",
        desc: "明亮有冲劲，语速快，咬字有力，冲动热血不服输", archetypes: ["热血青年", "运动男", "冲动男主"] },
    { id: "M03K", name: "青年腹黑笑面音", gender: "male", ageRange: [24, 32], category: "青年声",
        desc: "温和带笑，语速中慢，表面儒雅实则腹黑算计，笑面虎", archetypes: ["腹黑青年", "心机男二", "伪君子"] },
    { id: "M03L", name: "青年慵懒散漫音", gender: "male", ageRange: [22, 32], category: "青年声",
        desc: "慵懒散漫，语速偏慢，尾音拖，漫不经心什么都不在乎", archetypes: ["慵懒青年", "散漫男"] },
    // M04 成熟男性 (28-48)
    { id: "M04A", name: "霸总低磁音", gender: "male", ageRange: [28, 40], category: "成熟男性",
        desc: "低沉有磁性，语速中慢，吐字清楚，句尾下沉，掌控感压迫感", archetypes: ["霸总", "总裁", "男主", "帝王", "大佬"] },
    { id: "M04B", name: "青叔克制音", gender: "male", ageRange: [32, 45], category: "成熟男性",
        desc: "低沉稳重不苍老，语速中慢，吐字有分量，压着疲惫责任感", archetypes: ["大叔", "成熟男主", "父亲"] },
    { id: "M04C", name: "成熟冷硬音", gender: "male", ageRange: [30, 45], category: "成熟男性",
        desc: "冷硬稳，语速偏慢，咬字利落，句尾下沉，克制有距离感", archetypes: ["军人", "保镖", "冷酷男", "反派"] },
    { id: "M04D", name: "成熟疲惫音", gender: "male", ageRange: [32, 48], category: "成熟男性",
        desc: "低沉带疲态，语速偏慢，吐字清楚，句尾轻沉，长期承压", archetypes: ["疲惫中年男", "失意男"] },
    { id: "M04E", name: "成熟腹黑笑面音", gender: "male", ageRange: [30, 45], category: "成熟男性",
        desc: "低沉温和带笑，语速中慢，表面儒雅实则城府极深，笑里藏刀", archetypes: ["腹黑男", "伪君子", "心机反派"] },
    { id: "M04F", name: "成熟温柔体贴音", gender: "male", ageRange: [30, 45], category: "成熟男性",
        desc: "低沉温柔，语速中慢，吐字柔和，体贴包容有安全感", archetypes: ["温柔大叔", "暖男爹系", "父亲"] },
    { id: "M04G", name: "成熟商贾圆滑音", gender: "male", ageRange: [35, 48], category: "成熟男性",
        desc: "圆滑精明，语速中等，吐字世故，带笑但算计，商人的精明", archetypes: ["商人", "老板", "中间人"] },
    { id: "M04H", name: "成熟军旅硬朗音", gender: "male", ageRange: [30, 45], category: "成熟男性",
        desc: "低沉硬朗，咬字短促有力，语速中等，军旅出身干脆利落", archetypes: ["军人", "教官", "硬汉"] },
    // M05 大叔声 (40-65)
    { id: "M05A", name: "硬汉大叔音", gender: "male", ageRange: [40, 55], category: "大叔声",
        desc: "低沉厚重，胸腔共鸣明显，略带沙哑，咬字有力，硬朗威慑", archetypes: ["硬汉", "江湖大哥", "军人"] },
    { id: "M05B", name: "商人大叔音", gender: "male", ageRange: [40, 58], category: "大叔声",
        desc: "低沉稳重，语速中慢，吐字圆滑，带笑但有审视算计感", archetypes: ["商人", "老板", "政客"] },
    { id: "M05C", name: "市井大叔音", gender: "male", ageRange: [40, 60], category: "大叔声",
        desc: "粗粝有生活感，语速中等偏快，咬字直接，现实圆滑带烟火气", archetypes: ["市井大叔", "邻居大叔", "司机"] },
    { id: "M05D", name: "慈父温厚音", gender: "male", ageRange: [45, 65], category: "大叔声",
        desc: "温暖厚实，语速偏慢，吐字柔和，慈爱中带疲惫无奈", archetypes: ["父亲", "爸爸", "慈父"] },
    { id: "M05E", name: "反派沙哑大叔音", gender: "male", ageRange: [40, 60], category: "大叔声",
        desc: "沙哑粗粝，语速偏慢，咬字重，句尾下沉，危险审问压迫感", archetypes: ["反派大叔", "黑老大", "恶人"] },
    { id: "M05F", name: "大叔豪爽大笑音", gender: "male", ageRange: [42, 60], category: "大叔声",
        desc: "低沉浑厚，豪爽爱大笑，语速中等，江湖义气粗犷", archetypes: ["豪爽大叔", "江湖大哥", "义气老哥"] },
    { id: "M05G", name: "大叔猥琐油腻音", gender: "male", ageRange: [40, 58], category: "大叔声",
        desc: "低沉带黏腻笑意，语速中慢，油腻猥琐，令人不适", archetypes: ["猥琐大叔", "油腻男", "反派配角"] },
    { id: "M05H", name: "大叔沧桑故事音", gender: "male", ageRange: [45, 62], category: "大叔声",
        desc: "沙哑低沉，语速慢，吐字带沧桑感，像经历过很多故事", archetypes: ["沧桑大叔", "退伍老兵", "失意男"] },
    { id: "M05I", name: "大叔唠叨碎念音", gender: "male", ageRange: [45, 62], category: "大叔声",
        desc: "低沉但话多，语速偏快，爱唠叨碎碎念，絮絮叨叨", archetypes: ["唠叨大叔", "邻居大叔"] },
    // M06 老年男性 (65+)
    { id: "M06A", name: "慈祥爷爷音", gender: "male", ageRange: [65, 90], category: "老年男性",
        desc: "年迈温和，气息略弱，语速慢，吐字清楚，慈爱平和", archetypes: ["爷爷", "外公", "老人"] },
    { id: "M06B", name: "权谋老者音", gender: "male", ageRange: [60, 90], category: "老年男性",
        desc: "低沉年迈，语速很慢，停顿明显，吐字清楚有压迫感，平静危险", archetypes: ["权谋老人", "老太爷", "反派老者"] },
    { id: "M06C", name: "病弱老人音", gender: "male", ageRange: [65, 90], category: "老年男性",
        desc: "气息弱，语速很慢，音量偏低，吐字轻但清楚，疲惫虚弱", archetypes: ["病弱老人"] },
    { id: "M06D", name: "老年唠叨爷爷音", gender: "male", ageRange: [65, 90], category: "老年男性",
        desc: "年迈温和，语速偏快但断续，爱唠叨讲过去的故事，反复叮嘱", archetypes: ["唠叨爷爷", "讲古老人"] },
    { id: "M06E", name: "老年威严老爷音", gender: "male", ageRange: [65, 90], category: "老年男性",
        desc: "年迈但中气足，吐字有力，语速偏慢，不怒自威有家族权威", archetypes: ["老太爷", "家族长辈", "威严老人"] },
    { id: "M06F", name: "老年沧桑沙哑音", gender: "male", ageRange: [68, 90], category: "老年男性",
        desc: "沙哑苍老，气息弱，语速慢，像饱经风霜的老者", archetypes: ["沧桑老人", "老兵", "老农"] },
];
// ---------------------------------------------------------------------------
// Special voices (72)
// ---------------------------------------------------------------------------
const SPECIAL_VOICES = [
    // S01 古风类
    { id: "S01A", name: "古风公子音", gender: "male", ageRange: [18, 30], category: "古风类",
        desc: "温润清贵，语速中慢，吐字雅致，从容克制，世家公子书卷气", archetypes: ["古风公子", "书生", "王爷"] },
    { id: "S01B", name: "古风贵女音", gender: "female", ageRange: [18, 30], category: "古风类",
        desc: "清冷端庄，语速中慢，吐字雅致，矜持克制，世家贵女教养骄傲", archetypes: ["古风贵女", "公主", "千金"] },
    { id: "S01C", name: "古风将军音", gender: "male", ageRange: [30, 50], category: "古风类",
        desc: "中低音区，沉稳有力，咬字重，语速中慢，军令感压迫感", archetypes: ["将军", "武将"] },
    { id: "S01D", name: "古风老臣音", gender: "male", ageRange: [55, 80], category: "古风类",
        desc: "年迈沉稳，语速慢，吐字清楚，恭谨但有城府，朝堂老臣审慎感", archetypes: ["老臣", "丞相", "太傅"] },
    { id: "S01E", name: "古风侠女飒爽音", gender: "female", ageRange: [18, 28], category: "古风类",
        desc: "清亮利落带英气，语速中等偏快，飒爽洒脱，江湖儿女不拘小节", archetypes: ["侠女", "女侠", "江湖女"] },
    { id: "S01F", name: "古风妖姬蛊惑音", gender: "female", ageRange: [20, 32], category: "古风类",
        desc: "柔媚低婉，尾音勾人，语速中慢，妖冶蛊惑危险迷人", archetypes: ["妖姬", "狐妖", "祸水红颜"] },
    { id: "S01G", name: "古风书生文弱音", gender: "male", ageRange: [18, 28], category: "古风类",
        desc: "清润偏柔，语速中慢，吐字雅致，文弱书生酸腐气", archetypes: ["书生", "穷酸文人", "秀才"] },
    { id: "S01H", name: "古风帝王威严音", gender: "male", ageRange: [30, 55], category: "古风类",
        desc: "低沉稳重有威仪，语速中慢，吐字有帝王之威，不怒自威", archetypes: ["帝王", "君王", "皇帝"] },
    // S02 系统与AI类
    { id: "S02A", name: "系统女声", gender: "special", ageRange: [0, 0], category: "系统AI",
        desc: "干净平稳，吐字极清晰，语速中等，冷静客观，轻微机械感", archetypes: ["系统", "AI", "机械音"] },
    { id: "S02B", name: "系统男声", gender: "special", ageRange: [0, 0], category: "系统AI",
        desc: "中音区，稳定理性，吐字极清晰，语速中等偏慢，客观冷静", archetypes: ["系统", "AI", "机械音"] },
    { id: "S02C", name: "中性AI声", gender: "special", ageRange: [0, 0], category: "系统AI",
        desc: "年龄性别感模糊，干净平稳无明显情绪，语速中等，吐字精准", archetypes: ["AI", "机器人"] },
    { id: "S02D", name: "萌系系统音", gender: "special", ageRange: [0, 0], category: "系统AI",
        desc: "甜软可爱带机械底色，语速中等，像萌系助手偶尔卖萌", archetypes: ["萌系系统", "AI助手"] },
    { id: "S02E", name: "冷酷系统音", gender: "special", ageRange: [0, 0], category: "系统AI",
        desc: "冰冷无情绪，吐字精准如金属，语速平稳，绝对理性无温度", archetypes: ["冷酷系统", "高级AI", "主脑"] },
    { id: "S02F", name: "量子AI音", gender: "special", ageRange: [0, 0], category: "系统AI",
        desc: "空灵带微弱电子混响，性别模糊，语速中等，高级科技感", archetypes: ["量子AI", "未来系统", "超级计算机"] },
    // S03 旁白类
    { id: "S03A", name: "短剧旁白男声", gender: "male", ageRange: [30, 45], category: "旁白",
        desc: "中低音区，吐字非常清楚，语速中等偏快，稳定有悬念感", archetypes: ["旁白", "解说"] },
    { id: "S03B", name: "情感旁白女声", gender: "female", ageRange: [25, 40], category: "旁白",
        desc: "中音区，柔和，语速中慢，带轻微气声和遗憾感，克制不煽情", archetypes: ["旁白", "情感解说"] },
    { id: "S03C", name: "纪录片旁白男声", gender: "male", ageRange: [35, 55], category: "旁白",
        desc: "成熟男性，中低音区，干净稳定克制，语速平稳，带厚重感", archetypes: ["旁白", "纪录片"] },
    { id: "S03D", name: "悬疑旁白音", gender: "special", ageRange: [30, 50], category: "旁白",
        desc: "中低音区，语速偏慢，吐字清楚，句尾下沉，紧张未知压迫感", archetypes: ["旁白", "悬疑解说"] },
    { id: "S03E", name: "悬疑紧张男旁白", gender: "male", ageRange: [30, 45], category: "旁白",
        desc: "低沉压低，语速偏慢，句尾带悬念停顿，紧张悬疑氛围感强", archetypes: ["悬疑旁白", "犯罪解说"] },
    { id: "S03F", name: "治愈温暖女旁白", gender: "female", ageRange: [25, 40], category: "旁白",
        desc: "柔和温暖，带气声，语速中慢，治愈系像在耳边轻声讲故事", archetypes: ["治愈旁白", "情感解说"] },
    { id: "S03G", name: "史诗磅礴旁白音", gender: "male", ageRange: [35, 55], category: "旁白",
        desc: "浑厚有力，胸腔共鸣，语速中慢，磅礴大气有史诗感", archetypes: ["史诗旁白", "大片解说"] },
    // S04 非人类声线
    { id: "S04A", name: "神明旁白音", gender: "special", ageRange: [0, 0], category: "非人类",
        desc: "庄重空灵，语速缓慢，吐字清楚，带遥远回响感和神秘威严感", archetypes: ["神明", "仙人"] },
    { id: "S04B", name: "恶魔低语音", gender: "male", ageRange: [0, 0], category: "非人类",
        desc: "低沉沙哑，语速很慢，音量压低像贴近耳边说话，蛊惑危险感", archetypes: ["恶魔", "反派"] },
    { id: "S04C", name: "怪物嘶哑音", gender: "special", ageRange: [0, 0], category: "非人类",
        desc: "低沉粗糙，带喉音和非人感，语速慢，吐字略不标准但能听清", archetypes: ["怪物", "妖怪"] },
    { id: "S04D", name: "幽灵空声音", gender: "special", ageRange: [0, 0], category: "非人类",
        desc: "音量偏低，轻而空，语速慢，带微弱回响感，飘忽冰冷遥远", archetypes: ["幽灵", "鬼魂"] },
    { id: "S04E", name: "精灵动听音", gender: "female", ageRange: [0, 0], category: "非人类",
        desc: "清灵空透，带微弱回响，语速中慢，精灵般不食人间烟火", archetypes: ["精灵", "仙灵"] },
    { id: "S04F", name: "龙威磅礴低音", gender: "male", ageRange: [0, 0], category: "非人类",
        desc: "极低沉浑厚，胸腔共鸣强烈，语速慢，带龙族威严压迫感", archetypes: ["龙族", "上古神兽"] },
    { id: "S04G", name: "机械合成音", gender: "special", ageRange: [0, 0], category: "非人类",
        desc: "金属质感的合成声，带电子杂音，语速平稳，机器人说话感", archetypes: ["机器人", "机甲"] },
    // S05 情绪极端声
    { id: "S05A", name: "极度愤怒咆哮音", gender: "special", ageRange: [20, 50], category: "情绪极端声",
        desc: "嘶吼咆哮，音量极大，气息猛烈，愤怒到失控爆发", archetypes: ["暴怒", "发狂", "爆发戏"] },
    { id: "S05B", name: "极度悲伤嚎哭音", gender: "special", ageRange: [20, 50], category: "情绪极端声",
        desc: "嚎啕大哭，气息断续，鼻音重，悲痛到无法自持", archetypes: ["嚎哭", "崩溃", "丧亲戏"] },
    { id: "S05C", name: "歇斯底里尖叫音", gender: "female", ageRange: [18, 40], category: "情绪极端声",
        desc: "尖锐高亢尖叫，气息急促，歇斯底里失控，极度惊恐或崩溃", archetypes: ["尖叫", "惊恐", "崩溃"] },
    { id: "S05D", name: "疯狂大笑音", gender: "special", ageRange: [20, 50], category: "情绪极端声",
        desc: "狂笑不止，笑声尖锐或低沉，癫狂失控，病态疯狂", archetypes: ["狂笑", "疯癫", "反派爆发"] },
    { id: "S05E", name: "极度惊恐尖叫音", gender: "special", ageRange: [18, 45], category: "情绪极端声",
        desc: "尖叫带颤音，气息急促短浅，极度恐惧到失声", archetypes: ["惊恐", "恐怖戏", "遇险"] },
    { id: "S05F", name: "悲愤嘶吼音", gender: "male", ageRange: [20, 50], category: "情绪极端声",
        desc: "低沉嘶吼转咆哮，愤怒中夹杂悲痛，压到极致后爆发", archetypes: ["悲愤", "爆发", "复仇戏"] },
    { id: "S05G", name: "崩溃大哭音", gender: "female", ageRange: [18, 40], category: "情绪极端声",
        desc: "嚎哭带抽泣，断断续续，崩溃到说不出完整的话", archetypes: ["崩溃", "哭戏", "绝望"] },
    { id: "S05H", name: "癫狂喃喃音", gender: "special", ageRange: [25, 55], category: "情绪极端声",
        desc: "低声喃喃自语，语速忽快忽慢，癫狂神经质，自言自语", archetypes: ["癫狂", "疯子", "神经质"] },
    { id: "S05I", name: "绝望低语音", gender: "special", ageRange: [20, 50], category: "情绪极端声",
        desc: "气若游丝，音量极低，语速很慢，万念俱灰的绝望低语", archetypes: ["绝望", "临终", "心死"] },
    { id: "S05J", name: "狂热亢奋音", gender: "special", ageRange: [20, 45], category: "情绪极端声",
        desc: "语速极快，音调偏高，亢奋到失控，狂热偏执像邪教布道", archetypes: ["狂热", "邪教", "洗脑"] },
    // S06 外语/口音声
    { id: "S06A", name: "日式中文女音", gender: "female", ageRange: [18, 30], category: "外语口音",
        desc: "带日语口音的中文，句尾上扬带卡哇伊感，发音略平", archetypes: ["日系角色", "留学生", "二次元"] },
    { id: "S06B", name: "日式中文男音", gender: "male", ageRange: [20, 35], category: "外语口音",
        desc: "带日语口音的中文，发音略硬，句式短促，动漫男主感", archetypes: ["日系角色", "留学生"] },
    { id: "S06C", name: "韩式中文女音", gender: "female", ageRange: [18, 30], category: "外语口音",
        desc: "带韩语口音的中文，气声重，句尾带撒娇感，韩剧女主味", archetypes: ["韩系角色", "留学生"] },
    { id: "S06D", name: "韩式中文男音", gender: "male", ageRange: [22, 35], category: "外语口音",
        desc: "带韩语口音的中文，低沉略闷，韩剧男主霸道感", archetypes: ["韩系角色", "留学生"] },
    { id: "S06E", name: "欧美口音女音", gender: "female", ageRange: [22, 40], category: "外语口音",
        desc: "带欧美口音的中文，声调起伏大，卷舌明显，外籍华人感", archetypes: ["外籍角色", "海归", "混血"] },
    { id: "S06F", name: "欧美口音男音", gender: "male", ageRange: [25, 45], category: "外语口音",
        desc: "带欧美口音的中文，低沉浑厚，发音略硬，外籍商人感", archetypes: ["外籍角色", "海归", "混血"] },
    { id: "S06G", name: "东南亚口音女音", gender: "female", ageRange: [20, 35], category: "外语口音",
        desc: "带东南亚口音的中文，语调上扬，发音软糯带地方味", archetypes: ["东南亚角色", "侨民"] },
    { id: "S06H", name: "东南亚口音男音", gender: "male", ageRange: [25, 40], category: "外语口音",
        desc: "带东南亚口音的中文，语调平直，发音略含糊", archetypes: ["东南亚角色", "侨民"] },
    { id: "S06I", name: "港台腔女音", gender: "female", ageRange: [18, 30], category: "外语口音",
        desc: "港台腔中文，尾音上扬带撒娇，嗲声嗲气，偶像剧女主感", archetypes: ["港台角色", "偶像剧"] },
    { id: "S06J", name: "港台腔男音", gender: "male", ageRange: [22, 35], category: "外语口音",
        desc: "港台腔中文，温柔带气声，偶像剧男主霸道又深情", archetypes: ["港台角色", "偶像剧"] },
    // S07 新闻/播音声
    { id: "S07A", name: "央视新闻男声", gender: "male", ageRange: [35, 55], category: "新闻播音",
        desc: "标准普通话，中低音区，吐字字正腔圆，语速平稳庄重", archetypes: ["新闻主播", "播音员"] },
    { id: "S07B", name: "央视新闻女声", gender: "female", ageRange: [30, 50], category: "新闻播音",
        desc: "标准普通话，中音区明亮，吐字字正腔圆，端庄大气", archetypes: ["新闻主播", "播音员"] },
    { id: "S07C", name: "体育解说男声", gender: "male", ageRange: [28, 50], category: "新闻播音",
        desc: "语速快有激情，高亢时拉长音，进球时爆发，体育解说感", archetypes: ["体育解说", "解说员"] },
    { id: "S07D", name: "体育解说女声", gender: "female", ageRange: [25, 45], category: "新闻播音",
        desc: "清亮有活力，语速快，专业又不失激情，女体育解说感", archetypes: ["体育解说", "解说员"] },
    { id: "S07E", name: "娱乐主持男声", gender: "male", ageRange: [25, 40], category: "新闻播音",
        desc: "活泼带笑意，语速中等偏快，会调动气氛，综艺主持感", archetypes: ["综艺主持", "娱乐主播"] },
    { id: "S07F", name: "娱乐主持女声", gender: "female", ageRange: [22, 38], category: "新闻播音",
        desc: "甜美明亮带笑意，语速偏快，活泼会接梗，综艺女主持感", archetypes: ["综艺主持", "娱乐主播"] },
    { id: "S07G", name: "电台DJ女声", gender: "female", ageRange: [24, 38], category: "新闻播音",
        desc: "温暖慵懒带气声，语速中慢，深夜电台DJ娓娓道来感", archetypes: ["电台DJ", "深夜主播"] },
    { id: "S07H", name: "电台DJ男声", gender: "male", ageRange: [28, 45], category: "新闻播音",
        desc: "低沉磁性带慵懒，语速中慢，深夜电台男DJ有故事感", archetypes: ["电台DJ", "深夜主播"] },
    { id: "S07I", name: "纪录片播音男声", gender: "male", ageRange: [40, 60], category: "新闻播音",
        desc: "浑厚沉稳，吐字有力，语速平稳中慢，纪录片配音厚重感", archetypes: ["纪录片配音", "播音员"] },
    { id: "S07J", name: "纪录片播音女声", gender: "female", ageRange: [35, 55], category: "新闻播音",
        desc: "沉稳大气，吐字清楚，语速平稳，纪录片女配音知性厚重", archetypes: ["纪录片配音", "播音员"] },
    // S08 ASMR/低语声
    { id: "S08A", name: "耳语轻柔女声", gender: "female", ageRange: [20, 35], category: "ASMR低语",
        desc: "气声极轻，贴近耳边耳语，语速很慢，酥麻轻柔", archetypes: ["耳语", "ASMR", "亲密"] },
    { id: "S08B", name: "耳语低沉男声", gender: "male", ageRange: [25, 40], category: "ASMR低语",
        desc: "低沉气声贴近耳边，语速很慢，磁性酥麻，男声耳语", archetypes: ["耳语", "ASMR", "亲密"] },
    { id: "S08C", name: "助眠呢喃女声", gender: "female", ageRange: [22, 35], category: "ASMR低语",
        desc: "柔和呢喃，气声绵长，语速极慢，像哄人入睡的助眠声", archetypes: ["助眠", "ASMR", "哄睡"] },
    { id: "S08D", name: "助眠呢喃男声", gender: "male", ageRange: [28, 42], category: "ASMR低语",
        desc: "低沉呢喃，气声舒缓，语速极慢，男声哄睡助眠", archetypes: ["助眠", "ASMR", "哄睡"] },
    { id: "S08E", name: "ASMR气声女声", gender: "female", ageRange: [20, 32], category: "ASMR低语",
        desc: "气声为主，带唇齿音和轻啧声，酥麻感强，典型ASMR女声", archetypes: ["ASMR", "助眠", "亲密"] },
    { id: "S08F", name: "ASMR低音男声", gender: "male", ageRange: [28, 42], category: "ASMR低语",
        desc: "低沉气声，胸腔共鸣，带轻啧和呼吸声，ASMR男声", archetypes: ["ASMR", "助眠", "亲密"] },
    { id: "S08G", name: "催眠低语音", gender: "special", ageRange: [25, 45], category: "ASMR低语",
        desc: "空灵低沉带回响，语速极慢有节奏，催眠引导感", archetypes: ["催眠", "ASMR", "引导"] },
    { id: "S08H", name: "气声诱惑女声", gender: "female", ageRange: [22, 35], category: "ASMR低语",
        desc: "气声暧昧，尾音勾人，语速慢，诱惑低语带魅惑感", archetypes: ["诱惑", "魅惑", "亲密"] },
    { id: "S08I", name: "温柔哄睡音", gender: "female", ageRange: [22, 35], category: "ASMR低语",
        desc: "极温柔柔和，像哄孩子睡觉，语速很慢，轻声细语", archetypes: ["哄睡", "温柔", "母亲"] },
    { id: "S08J", name: "治愈轻语音", gender: "special", ageRange: [20, 40], category: "ASMR低语",
        desc: "轻柔温暖带气声，语速慢，治愈系轻语像在耳边安慰", archetypes: ["治愈", "ASMR", "安慰"] },
];
// ---------------------------------------------------------------------------
// Dialect voices (120)
// ---------------------------------------------------------------------------
const DIALECT_VOICES = [
    // D01 广东话/粤语
    { id: "D01A", name: "粤语少女清甜音", gender: "female", ageRange: [15, 22], category: "粤语",
        desc: "粤语，清甜软糯，语速中等偏快，带港风少女的灵动感", archetypes: ["港风少女", "广东女主", "学生"] },
    { id: "D01B", name: "粤语少御知性音", gender: "female", ageRange: [20, 30], category: "粤语",
        desc: "粤语，干净知性，语速中慢，吐字利落，港风白领干练感", archetypes: ["港风知性女", "广东白领"] },
    { id: "D01C", name: "粤语御姐风情音", gender: "female", ageRange: [25, 40], category: "粤语",
        desc: "粤语，沉稳带风情，语速中慢，慵懒有故事感，港片御姐味", archetypes: ["港风御姐", "广东熟女"] },
    { id: "D01D", name: "粤语中年师奶音", gender: "female", ageRange: [38, 55], category: "粤语",
        desc: "粤语，音量偏大语速快，市井师奶感，精打细算爱八卦", archetypes: ["广东师奶", "市井大妈"] },
    { id: "D01E", name: "粤语老年阿婆音", gender: "female", ageRange: [65, 90], category: "粤语",
        desc: "粤语，年迈温和气息弱，语速慢，慈祥广东阿婆讲古感", archetypes: ["广东阿婆", "奶奶"] },
    { id: "D01F", name: "粤语少女活泼音", gender: "female", ageRange: [16, 22], category: "粤语",
        desc: "粤语，明亮活泼，语速快，带笑意，元气广东少女", archetypes: ["活泼广东少女", "学生"] },
    { id: "D01G", name: "粤语少萝甜音", gender: "female", ageRange: [11, 15], category: "粤语",
        desc: "粤语，甜软稚嫩，带港风小妹妹的可爱撒娇感", archetypes: ["广东妹妹", "少萝"] },
    { id: "D01H", name: "粤语幼女奶音", gender: "female", ageRange: [6, 10], category: "粤语",
        desc: "粤语，奶声奶气，甜软稚嫩，像香港小女孩撒娇", archetypes: ["广东小女孩", "幼女"] },
    { id: "D01I", name: "粤语少年阳光音", gender: "male", ageRange: [15, 20], category: "粤语",
        desc: "粤语，清亮干净，带少年感，阳光真诚港风少年", archetypes: ["广东少年", "学生"] },
    { id: "D01J", name: "粤语青年痞帅音", gender: "male", ageRange: [20, 32], category: "粤语",
        desc: "粤语，略低带痞气，语速中等，玩世不恭港片古惑仔感", archetypes: ["港风青年", "痞帅男"] },
    { id: "D01K", name: "粤语霸总低音", gender: "male", ageRange: [28, 40], category: "粤语",
        desc: "粤语，低沉有磁性，语速中慢，港片大佬掌控压迫感", archetypes: ["港风霸总", "广东大佬"] },
    { id: "D01L", name: "粤语大叔市井音", gender: "male", ageRange: [40, 60], category: "粤语",
        desc: "粤语，粗粝有烟火气，语速中等偏快，市井广东大叔", archetypes: ["广东大叔", "市井男"] },
    { id: "D01M", name: "粤语老年阿伯音", gender: "male", ageRange: [65, 90], category: "粤语",
        desc: "粤语，年迈沙哑，语速慢，慈祥广东阿伯讲过去的故事", archetypes: ["广东阿伯", "爷爷"] },
    { id: "D01N", name: "粤语男童活泼音", gender: "male", ageRange: [7, 12], category: "粤语",
        desc: "粤语，清脆活泼，语速快，像广东小男孩调皮捣蛋", archetypes: ["广东小男孩", "男童"] },
    { id: "D01O", name: "粤语少女倔强音", gender: "female", ageRange: [16, 22], category: "粤语",
        desc: "粤语，清亮带紧绷，吐字有力，倔强不服输的港风少女", archetypes: ["倔强广东少女", "女主"] },
    { id: "D01P", name: "粤语青年温润音", gender: "male", ageRange: [20, 30], category: "粤语",
        desc: "粤语，干净温和，语速中慢，吐字柔和，港风暖男学长", archetypes: ["广东暖男", "学长"] },
    // D02 四川话/西南官话
    { id: "D02A", name: "川妹泼辣音", gender: "female", ageRange: [20, 30], category: "四川话",
        desc: "四川话，清亮带泼辣，语速快，咬字利落，辣妹子嘴不饶人", archetypes: ["川妹", "泼辣女", "辣妹子"] },
    { id: "D02B", name: "川妹娇俏音", gender: "female", ageRange: [16, 22], category: "四川话",
        desc: "四川话，甜软带娇俏，语速中等，川渝少女的娇憨可爱", archetypes: ["川妹", "娇俏少女"] },
    { id: "D02C", name: "川渝御姐音", gender: "female", ageRange: [25, 40], category: "四川话",
        desc: "四川话，沉稳带风情，语速中慢，川渝御姐的飒爽与妩媚", archetypes: ["川渝御姐", "熟女"] },
    { id: "D02D", name: "川渝中年嬢嬢音", gender: "female", ageRange: [38, 55], category: "四川话",
        desc: "四川话，音量偏大语速快，热情爱唠叨，川渝嬢嬢烟火气", archetypes: ["川渝嬢嬢", "市井大妈"] },
    { id: "D02E", name: "川渝老太音", gender: "female", ageRange: [65, 90], category: "四川话",
        desc: "四川话，年迈温和气息弱，语速慢，慈祥川渝老太讲古", archetypes: ["川渝奶奶", "老人"] },
    { id: "D02F", name: "川渝少萝音", gender: "female", ageRange: [11, 15], category: "四川话",
        desc: "四川话，甜软稚嫩，带川渝小妹妹的机灵撒娇", archetypes: ["川渝妹妹", "少萝"] },
    { id: "D02G", name: "川渝青年痞帅音", gender: "male", ageRange: [20, 32], category: "四川话",
        desc: "四川话，略低带痞气，语速中等，川渝青年的江湖痞帅", archetypes: ["川渝青年", "痞帅男"] },
    { id: "D02H", name: "川渝霸总音", gender: "male", ageRange: [28, 40], category: "四川话",
        desc: "四川话，低沉有磁性，语速中慢，川渝大佬的沉稳霸气", archetypes: ["川渝霸总", "大佬"] },
    { id: "D02I", name: "川渝大叔豪爽音", gender: "male", ageRange: [40, 60], category: "四川话",
        desc: "四川话，浑厚豪爽，语速中等，爱大声说话，川渝大叔江湖气", archetypes: ["川渝大叔", "豪爽男"] },
    { id: "D02J", name: "川渝老年大爷音", gender: "male", ageRange: [65, 90], category: "四川话",
        desc: "四川话，年迈沙哑，语速慢，慈祥川渝大爷喝茶摆龙门阵", archetypes: ["川渝爷爷", "老人"] },
    { id: "D02K", name: "川渝少年热血音", gender: "male", ageRange: [15, 20], category: "四川话",
        desc: "四川话，明亮有冲劲，语速快，川渝少年的热血江湖气", archetypes: ["川渝少年", "热血男"] },
    { id: "D02L", name: "川渝男童音", gender: "male", ageRange: [7, 12], category: "四川话",
        desc: "四川话，清脆活泼，语速快，川渝小男孩的调皮机灵", archetypes: ["川渝小男孩", "男童"] },
    // D03 河南话/中原官话
    { id: "D03A", name: "河南大妞音", gender: "female", ageRange: [20, 30], category: "河南话",
        desc: "河南话，爽朗大方，语速中等偏快，中原大妞的实在泼辣", archetypes: ["河南大妞", "爽朗女"] },
    { id: "D03B", name: "河南少御音", gender: "female", ageRange: [25, 35], category: "河南话",
        desc: "河南话，沉稳干练，语速中慢，中原少御的踏实稳重", archetypes: ["河南少御", "干练女"] },
    { id: "D03C", name: "河南中年妇女音", gender: "female", ageRange: [38, 55], category: "河南话",
        desc: "河南话，音量偏大语速快，市井烟火气，中原大妈爱唠叨", archetypes: ["河南大妈", "市井女"] },
    { id: "D03D", name: "河南老太音", gender: "female", ageRange: [65, 90], category: "河南话",
        desc: "河南话，年迈温和气息弱，语速慢，慈祥中原老太", archetypes: ["河南奶奶", "老人"] },
    { id: "D03E", name: "河南少女音", gender: "female", ageRange: [16, 22], category: "河南话",
        desc: "河南话，清亮干净，语速中等，中原少女的朴实真诚", archetypes: ["河南少女", "学生"] },
    { id: "D03F", name: "河南青年音", gender: "male", ageRange: [20, 32], category: "河南话",
        desc: "河南话，干净温厚，语速中等，中原青年的踏实肯干", archetypes: ["河南青年", "踏实男"] },
    { id: "D03G", name: "河南大叔音", gender: "male", ageRange: [40, 60], category: "河南话",
        desc: "河南话，粗粝厚实，语速中等，中原大叔的豪爽实在", archetypes: ["河南大叔", "市井男"] },
    { id: "D03H", name: "河南霸总音", gender: "male", ageRange: [28, 40], category: "河南话",
        desc: "河南话，低沉稳重，语速中慢，中原大佬的踏实霸气", archetypes: ["河南霸总", "大佬"] },
    { id: "D03I", name: "河南老年大爷音", gender: "male", ageRange: [65, 90], category: "河南话",
        desc: "河南话，年迈沙哑，语速慢，慈祥中原大爷讲古", archetypes: ["河南爷爷", "老人"] },
    { id: "D03J", name: "河南少年音", gender: "male", ageRange: [15, 20], category: "河南话",
        desc: "河南话，清亮有冲劲，语速中等，中原少年的朴实热血", archetypes: ["河南少年", "学生"] },
    { id: "D03K", name: "河南少女泼辣音", gender: "female", ageRange: [16, 22], category: "河南话",
        desc: "河南话，清亮泼辣，语速快，中原少女的嘴利不饶人", archetypes: ["河南辣妹", "泼辣少女"] },
    { id: "D03L", name: "河南男童音", gender: "male", ageRange: [7, 12], category: "河南话",
        desc: "河南话，清脆活泼，语速快，中原小男孩的调皮实在", archetypes: ["河南小男孩", "男童"] },
    // D04 京腔/北方官话
    { id: "D04A", name: "京腔大妞音", gender: "female", ageRange: [20, 32], category: "京腔",
        desc: "北京话，爽利大方带儿化音，语速偏快，京城大妞的飒爽贫嘴", archetypes: ["北京大妞", "爽利女"] },
    { id: "D04B", name: "京腔少女音", gender: "female", ageRange: [16, 22], category: "京腔",
        desc: "北京话，清亮带儿化，语速中等偏快，京城少女的机灵贫嘴", archetypes: ["北京少女", "学生"] },
    { id: "D04C", name: "京腔中年大妈音", gender: "female", ageRange: [38, 55], category: "京腔",
        desc: "北京话，音量大语速快，爱唠叨儿化音重，京城大妈烟火气", archetypes: ["北京大妈", "市井女"] },
    { id: "D04D", name: "京腔老太音", gender: "female", ageRange: [65, 90], category: "京腔",
        desc: "北京话，年迈温和，语速慢，慈祥京城老太讲老北京故事", archetypes: ["北京奶奶", "老人"] },
    { id: "D04E", name: "京腔少御音", gender: "female", ageRange: [25, 35], category: "京腔",
        desc: "北京话，干练知性带儿化，语速中等，京城少御的飒爽利落", archetypes: ["北京少御", "白领"] },
    { id: "D04F", name: "京腔爷们儿音", gender: "male", ageRange: [28, 45], category: "京腔",
        desc: "北京话，低沉浑厚带儿化，语速中等，京城爷们儿的局气范儿", archetypes: ["北京爷们儿", "局气男"] },
    { id: "D04G", name: "京腔青年音", gender: "male", ageRange: [20, 32], category: "京腔",
        desc: "北京话，干净带儿化，语速偏快，京城青年的贫嘴机灵", archetypes: ["北京青年", "贫嘴男"] },
    { id: "D04H", name: "京腔大爷音", gender: "male", ageRange: [55, 80], category: "京腔",
        desc: "北京话，沙哑浑厚，语速中等，京城大爷提笼架鸟侃大山", archetypes: ["北京大爷", "老人"] },
    { id: "D04I", name: "京腔大叔音", gender: "male", ageRange: [40, 60], category: "京腔",
        desc: "北京话，低沉稳重带儿化，语速中等，京城大叔的市井烟火", archetypes: ["北京大叔", "市井男"] },
    { id: "D04J", name: "京腔少年音", gender: "male", ageRange: [15, 20], category: "京腔",
        desc: "北京话，清亮带儿化，语速偏快，京城少年的贫嘴热血", archetypes: ["北京少年", "学生"] },
    { id: "D04K", name: "京腔少女傲娇音", gender: "female", ageRange: [16, 22], category: "京腔",
        desc: "北京话，清亮傲娇带儿化，语速快，京城少女的傲娇贫嘴", archetypes: ["北京傲娇少女"] },
    { id: "D04L", name: "京腔男童音", gender: "male", ageRange: [7, 12], category: "京腔",
        desc: "北京话，清脆带儿化，语速快，京城小男孩的调皮贫嘴", archetypes: ["北京小男孩", "男童"] },
    // D05 东北话
    { id: "D05A", name: "东北大姐音", gender: "female", ageRange: [25, 40], category: "东北话",
        desc: "东北话，爽朗大方嗓门大，语速快，东北大姐的热心豪爽", archetypes: ["东北大姐", "豪爽女"] },
    { id: "D05B", name: "东北小老妹儿音", gender: "female", ageRange: [16, 22], category: "东北话",
        desc: "东北话，清亮带口音，语速中等偏快，东北小老妹儿的机灵虎", archetypes: ["东北少女", "虎妞"] },
    { id: "D05C", name: "东北中年妇女音", gender: "female", ageRange: [38, 55], category: "东北话",
        desc: "东北话，音量大语速快，热情爱张罗，东北大妈烟火气十足", archetypes: ["东北大妈", "市井女"] },
    { id: "D05D", name: "东北老太音", gender: "female", ageRange: [65, 90], category: "东北话",
        desc: "东北话，年迈温和，语速慢，慈祥东北老太唠嗑讲故事", archetypes: ["东北奶奶", "老人"] },
    { id: "D05E", name: "东北少女虎音", gender: "female", ageRange: [16, 22], category: "东北话",
        desc: "东北话，清亮泼辣带虎劲儿，语速快，东北少女的虎气豪爽", archetypes: ["东北虎妞", "泼辣少女"] },
    { id: "D05F", name: "东北大哥音", gender: "male", ageRange: [28, 45], category: "东北话",
        desc: "东北话，低沉浑厚嗓门大，语速中等，东北大哥的豪爽义气", archetypes: ["东北大哥", "豪爽男"] },
    { id: "D05G", name: "东北青年音", gender: "male", ageRange: [20, 32], category: "东北话",
        desc: "东北话，干净带口音，语速偏快，东北青年的机灵贫嘴", archetypes: ["东北青年", "贫嘴男"] },
    { id: "D05H", name: "东北大叔豪爽音", gender: "male", ageRange: [40, 60], category: "东北话",
        desc: "东北话，浑厚豪爽嗓门大，语速中等，东北大叔的江湖豪爽", archetypes: ["东北大叔", "豪爽男"] },
    { id: "D05I", name: "东北大爷音", gender: "male", ageRange: [65, 90], category: "东北话",
        desc: "东北话，沙哑浑厚，语速中等，东北大爷唠嗑讲过去的故事", archetypes: ["东北爷爷", "老人"] },
    { id: "D05J", name: "东北少年音", gender: "male", ageRange: [15, 20], category: "东北话",
        desc: "东北话，清亮带口音，语速偏快，东北少年的虎气热血", archetypes: ["东北少年", "学生"] },
    { id: "D05K", name: "东北少萝音", gender: "female", ageRange: [11, 15], category: "东北话",
        desc: "东北话，甜软带口音，语速中等，东北小妹妹的机灵虎萌", archetypes: ["东北妹妹", "少萝"] },
    { id: "D05L", name: "东北男童音", gender: "male", ageRange: [7, 12], category: "东北话",
        desc: "东北话，清脆带口音，语速快，东北小男孩的调皮虎气", archetypes: ["东北小男孩", "男童"] },
    // D06 上海话/吴语
    { id: "D06A", name: "上海囡囡音", gender: "female", ageRange: [16, 22], category: "上海话",
        desc: "上海话，软糯嗲气，语速中等，上海囡囡的精致娇嗲", archetypes: ["上海囡囡", "嗲妹"] },
    { id: "D06B", name: "上海少御音", gender: "female", ageRange: [25, 35], category: "上海话",
        desc: "上海话，知性干练带嗲，语速中慢，上海少御的精致精明", archetypes: ["上海少御", "白领"] },
    { id: "D06C", name: "上海阿姨音", gender: "female", ageRange: [38, 55], category: "上海话",
        desc: "上海话，音量中等语速快，精明爱算计，上海阿姨的市井精致", archetypes: ["上海阿姨", "市井女"] },
    { id: "D06D", name: "上海老太音", gender: "female", ageRange: [65, 90], category: "上海话",
        desc: "上海话，年迈温和，语速慢，慈祥上海老太讲老上海故事", archetypes: ["上海奶奶", "老人"] },
    { id: "D06E", name: "上海少女嗲音", gender: "female", ageRange: [16, 22], category: "上海话",
        desc: "上海话，甜软嗲气，语速中等偏快，上海少女的精致娇嗲", archetypes: ["上海少女", "嗲妹"] },
    { id: "D06F", name: "上海先生音", gender: "male", ageRange: [28, 45], category: "上海话",
        desc: "上海话，干净温厚带口音，语速中等，上海先生的精致体面", archetypes: ["上海先生", "体面男"] },
    { id: "D06G", name: "上海青年音", gender: "male", ageRange: [20, 32], category: "上海话",
        desc: "上海话，干净带口音，语速中等偏快，上海青年的精明干练", archetypes: ["上海青年", "白领"] },
    { id: "D06H", name: "上海大叔音", gender: "male", ageRange: [40, 60], category: "上海话",
        desc: "上海话，低沉稳重带口音，语速中等，上海大叔的精明市井", archetypes: ["上海大叔", "市井男"] },
    { id: "D06I", name: "上海大爷音", gender: "male", ageRange: [65, 90], category: "上海话",
        desc: "上海话，沙哑温和，语速慢，慈祥上海大爷讲弄堂故事", archetypes: ["上海爷爷", "老人"] },
    { id: "D06J", name: "上海少年音", gender: "male", ageRange: [15, 20], category: "上海话",
        desc: "上海话，清亮带口音，语速中等偏快，上海少年的精致机灵", archetypes: ["上海少年", "学生"] },
    { id: "D06K", name: "上海幼女奶音", gender: "female", ageRange: [6, 10], category: "上海话",
        desc: "上海话，奶声奶气嗲嗲的，语速慢，上海小囡的软糯可爱", archetypes: ["上海小女孩", "幼女"] },
    { id: "D06L", name: "上海男童音", gender: "male", ageRange: [7, 12], category: "上海话",
        desc: "上海话，清脆带口音，语速中等，上海小男孩的精致机灵", archetypes: ["上海小男孩", "男童"] },
    // D07 陕西话/西北话
    { id: "D07A", name: "陕西妹子音", gender: "female", ageRange: [20, 30], category: "陕西话",
        desc: "陕西话，爽朗厚实，语速中等，西北妹子的朴实大方", archetypes: ["陕西妹子", "爽朗女"] },
    { id: "D07B", name: "陕西中年妇女音", gender: "female", ageRange: [38, 55], category: "陕西话",
        desc: "陕西话，音量大语速快，热情泼辣，西北大妈的烟火气", archetypes: ["陕西大妈", "市井女"] },
    { id: "D07C", name: "陕西老太音", gender: "female", ageRange: [65, 90], category: "陕西话",
        desc: "陕西话，年迈温和，语速慢，慈祥西北老太讲古", archetypes: ["陕西奶奶", "老人"] },
    { id: "D07D", name: "陕西少女音", gender: "female", ageRange: [16, 22], category: "陕西话",
        desc: "陕西话，清亮带口音，语速中等，西北少女的朴实真诚", archetypes: ["陕西少女", "学生"] },
    { id: "D07E", name: "陕西汉子音", gender: "male", ageRange: [28, 45], category: "陕西话",
        desc: "陕西话，低沉浑厚，语速中等，西北汉子的粗犷豪爽", archetypes: ["陕西汉子", "豪爽男"] },
    { id: "D07F", name: "陕西青年音", gender: "male", ageRange: [20, 32], category: "陕西话",
        desc: "陕西话，干净厚实带口音，语速中等，西北青年的朴实肯干", archetypes: ["陕西青年", "踏实男"] },
    { id: "D07G", name: "陕西大叔音", gender: "male", ageRange: [40, 60], category: "陕西话",
        desc: "陕西话，粗粝浑厚，语速中等，西北大叔的粗犷市井", archetypes: ["陕西大叔", "市井男"] },
    { id: "D07H", name: "陕西大爷音", gender: "male", ageRange: [65, 90], category: "陕西话",
        desc: "陕西话，沙哑浑厚，语速慢，慈祥西北大爷讲黄土地故事", archetypes: ["陕西爷爷", "老人"] },
    { id: "D07I", name: "陕西少御音", gender: "female", ageRange: [25, 35], category: "陕西话",
        desc: "陕西话，沉稳干练带口音，语速中慢，西北少御的踏实稳重", archetypes: ["陕西少御", "干练女"] },
    { id: "D07J", name: "陕西少年音", gender: "male", ageRange: [15, 20], category: "陕西话",
        desc: "陕西话，清亮带口音，语速中等，西北少年的朴实热血", archetypes: ["陕西少年", "学生"] },
    // D08 湖南话/湘语
    { id: "D08A", name: "湖南妹子音", gender: "female", ageRange: [20, 30], category: "湖南话",
        desc: "湖南话，清亮带口音，语速偏快，湘妹子的泼辣爽利", archetypes: ["湖南妹子", "辣妹子"] },
    { id: "D08B", name: "湖南少御音", gender: "female", ageRange: [25, 35], category: "湖南话",
        desc: "湖南话，干练知性带口音，语速中慢，湘少御的精明干练", archetypes: ["湖南少御", "白领"] },
    { id: "D08C", name: "湖南中年妇女音", gender: "female", ageRange: [38, 55], category: "湖南话",
        desc: "湖南话，音量大语速快，热情泼辣，湘大妈的烟火气", archetypes: ["湖南大妈", "市井女"] },
    { id: "D08D", name: "湖南老太音", gender: "female", ageRange: [65, 90], category: "湖南话",
        desc: "湖南话，年迈温和，语速慢，慈祥湘老太讲古", archetypes: ["湖南奶奶", "老人"] },
    { id: "D08E", name: "湖南满哥音", gender: "male", ageRange: [28, 45], category: "湖南话",
        desc: "湖南话，干净带口音，语速中等偏快，湖南满哥的爽利机灵", archetypes: ["湖南满哥", "爽朗男"] },
    { id: "D08F", name: "湖南青年音", gender: "male", ageRange: [20, 32], category: "湖南话",
        desc: "湖南话，干净带口音，语速偏快，湘青年的机灵干练", archetypes: ["湖南青年", "白领"] },
    { id: "D08G", name: "湖南大叔音", gender: "male", ageRange: [40, 60], category: "湖南话",
        desc: "湖南话，浑厚带口音，语速中等，湘大叔的市井烟火", archetypes: ["湖南大叔", "市井男"] },
    { id: "D08H", name: "湖南大爷音", gender: "male", ageRange: [65, 90], category: "湖南话",
        desc: "湖南话，沙哑温和，语速慢，慈祥湘大爷讲古", archetypes: ["湖南爷爷", "老人"] },
    { id: "D08I", name: "湖南少女音", gender: "female", ageRange: [16, 22], category: "湖南话",
        desc: "湖南话，清亮带口音，语速中等偏快，湘少女的泼辣机灵", archetypes: ["湖南少女", "辣妹"] },
    { id: "D08J", name: "湖南少年音", gender: "male", ageRange: [15, 20], category: "湖南话",
        desc: "湖南话，清亮带口音，语速偏快，湘少年的机灵热血", archetypes: ["湖南少年", "学生"] },
    // D09 福建话/闽南语
    { id: "D09A", name: "闽南少女音", gender: "female", ageRange: [16, 22], category: "闽南语",
        desc: "闽南话，软糯带口音，语速中等，闽南少女的温柔软甜", archetypes: ["闽南少女", "软妹"] },
    { id: "D09B", name: "闽南少御音", gender: "female", ageRange: [25, 35], category: "闽南语",
        desc: "闽南话，知性温婉带口音，语速中慢，闽南少御的温柔干练", archetypes: ["闽南少御", "白领"] },
    { id: "D09C", name: "闽南中年妇女音", gender: "female", ageRange: [38, 55], category: "闽南语",
        desc: "闽南话，音量中等语速快，热情爱唠叨，闽南大妈烟火气", archetypes: ["闽南大妈", "市井女"] },
    { id: "D09D", name: "闽南老太音", gender: "female", ageRange: [65, 90], category: "闽南语",
        desc: "闽南话，年迈温和，语速慢，慈祥闽南老太讲古", archetypes: ["闽南奶奶", "老人"] },
    { id: "D09E", name: "闽南青年音", gender: "male", ageRange: [20, 32], category: "闽南语",
        desc: "闽南话，干净温厚带口音，语速中等，闽南青年的踏实肯干", archetypes: ["闽南青年", "踏实男"] },
    { id: "D09F", name: "闽南大叔音", gender: "male", ageRange: [40, 60], category: "闽南语",
        desc: "闽南话，浑厚带口音，语速中等，闽南大叔的市井烟火", archetypes: ["闽南大叔", "市井男"] },
    { id: "D09G", name: "闽南大爷音", gender: "male", ageRange: [65, 90], category: "闽南语",
        desc: "闽南话，沙哑温和，语速慢，慈祥闽南大爷讲古", archetypes: ["闽南爷爷", "老人"] },
    { id: "D09H", name: "闽南汉子音", gender: "male", ageRange: [28, 45], category: "闽南语",
        desc: "闽南话，低沉稳重带口音，语速中等，闽南汉子的踏实豪爽", archetypes: ["闽南汉子", "豪爽男"] },
    { id: "D09I", name: "闽南少女泼辣音", gender: "female", ageRange: [16, 22], category: "闽南语",
        desc: "闽南话，清亮泼辣带口音，语速快，闽南少女的嘴利不饶人", archetypes: ["闽南辣妹", "泼辣少女"] },
    { id: "D09J", name: "闽南少年音", gender: "male", ageRange: [15, 20], category: "闽南语",
        desc: "闽南话，清亮带口音，语速中等，闽南少年的踏实热血", archetypes: ["闽南少年", "学生"] },
    // D10 山东话
    { id: "D10A", name: "山东大嫚音", gender: "female", ageRange: [20, 30], category: "山东话",
        desc: "山东话，爽朗大方嗓门亮，语速中等偏快，山东大嫚的实在爽利", archetypes: ["山东大嫚", "爽朗女"] },
    { id: "D10B", name: "山东少御音", gender: "female", ageRange: [25, 35], category: "山东话",
        desc: "山东话，干练稳重带口音，语速中慢，山东少御的踏实干练", archetypes: ["山东少御", "干练女"] },
    { id: "D10C", name: "山东中年妇女音", gender: "female", ageRange: [38, 55], category: "山东话",
        desc: "山东话，音量大语速快，热情实在，山东大妈的烟火气", archetypes: ["山东大妈", "市井女"] },
    { id: "D10D", name: "山东老太音", gender: "female", ageRange: [65, 90], category: "山东话",
        desc: "山东话，年迈温和，语速慢，慈祥山东老太讲古", archetypes: ["山东奶奶", "老人"] },
    { id: "D10E", name: "山东大汉音", gender: "male", ageRange: [28, 45], category: "山东话",
        desc: "山东话，低沉浑厚嗓门大，语速中等，山东大汉的豪爽魁梧", archetypes: ["山东大汉", "豪爽男"] },
    { id: "D10F", name: "山东青年音", gender: "male", ageRange: [20, 32], category: "山东话",
        desc: "山东话，干净厚实带口音，语速中等，山东青年的踏实肯干", archetypes: ["山东青年", "踏实男"] },
    { id: "D10G", name: "山东大叔音", gender: "male", ageRange: [40, 60], category: "山东话",
        desc: "山东话，浑厚粗粝，语速中等，山东大叔的豪爽市井", archetypes: ["山东大叔", "市井男"] },
    { id: "D10H", name: "山东大爷音", gender: "male", ageRange: [65, 90], category: "山东话",
        desc: "山东话，沙哑浑厚，语速慢，慈祥山东大爷讲古", archetypes: ["山东爷爷", "老人"] },
    { id: "D10I", name: "山东少女音", gender: "female", ageRange: [16, 22], category: "山东话",
        desc: "山东话，清亮带口音，语速中等，山东少女的朴实爽利", archetypes: ["山东少女", "学生"] },
    { id: "D10J", name: "山东少年音", gender: "male", ageRange: [15, 20], category: "山东话",
        desc: "山东话，清亮带口音，语速中等，山东少年的朴实热血", archetypes: ["山东少年", "学生"] },
    // D11 客家话
    { id: "D11A", name: "客家少女音", gender: "female", ageRange: [16, 22], category: "客家话",
        desc: "客家话，清亮带口音，语速中等，客家少女的朴实温婉", archetypes: ["客家少女", "学生"] },
    { id: "D11B", name: "客家少御音", gender: "female", ageRange: [25, 35], category: "客家话",
        desc: "客家话，干练温厚带口音，语速中慢，客家少御的踏实稳重", archetypes: ["客家少御", "干练女"] },
    { id: "D11C", name: "客家中年妇女音", gender: "female", ageRange: [38, 55], category: "客家话",
        desc: "客家话，音量中等语速快，热情勤俭，客家大妈的烟火气", archetypes: ["客家大妈", "市井女"] },
    { id: "D11D", name: "客家老太音", gender: "female", ageRange: [65, 90], category: "客家话",
        desc: "客家话，年迈温和，语速慢，慈祥客家老太讲古", archetypes: ["客家奶奶", "老人"] },
    { id: "D11E", name: "客家汉子音", gender: "male", ageRange: [28, 45], category: "客家话",
        desc: "客家话，低沉稳重带口音，语速中等，客家汉子的踏实硬朗", archetypes: ["客家汉子", "硬朗男"] },
    { id: "D11F", name: "客家青年音", gender: "male", ageRange: [20, 32], category: "客家话",
        desc: "客家话，干净厚实带口音，语速中等，客家青年的踏实肯干", archetypes: ["客家青年", "踏实男"] },
    { id: "D11G", name: "客家大叔音", gender: "male", ageRange: [40, 60], category: "客家话",
        desc: "客家话，浑厚带口音，语速中等，客家大叔的市井烟火", archetypes: ["客家大叔", "市井男"] },
    { id: "D11H", name: "客家大爷音", gender: "male", ageRange: [65, 90], category: "客家话",
        desc: "客家话，沙哑温和，语速慢，慈祥客家大爷讲古", archetypes: ["客家爷爷", "老人"] },
];
// ---------------------------------------------------------------------------
// All voices combined
// ---------------------------------------------------------------------------
export const ALL_VOICES = [
    ...FEMALE_VOICES,
    ...MALE_VOICES,
    ...SPECIAL_VOICES,
    ...DIALECT_VOICES,
];
export const VOICE_CATEGORIES = [
    ...new Set(ALL_VOICES.map((v) => v.category)),
];
/**
 * Auto-match a voice profile to a character based on gender/age/archetype hints.
 * Returns the best matching voice with a ready-to-use anchor sentence.
 */
export function matchVoice(hints) {
    const gender = normalizeGender(hints.gender);
    const age = typeof hints.age === "number" ? hints.age : estimateAge(hints.age, hints.role, hints.archetype);
    const archetype = (hints.archetype ?? hints.role ?? hints.personality ?? "").toLowerCase();
    // Score every voice
    let best = null;
    for (const profile of ALL_VOICES) {
        let score = 0;
        // Gender match is the strongest signal
        if (gender && profile.gender === gender) {
            score += 50;
        }
        else if (gender === "special" && profile.gender === "special") {
            score += 50;
        }
        // Age range match
        if (age > 0) {
            const [minAge, maxAge] = profile.ageRange;
            if (minAge === 0 && maxAge === 0) {
                // Special/AI voices — neutral age score
            }
            else if (age >= minAge && age <= maxAge) {
                score += 30;
            }
            else {
                const distance = Math.min(Math.abs(age - minAge), Math.abs(age - maxAge));
                score += Math.max(0, 20 - distance);
            }
        }
        // Archetype keyword match
        if (archetype) {
            for (const a of profile.archetypes) {
                if (archetype.includes(a.toLowerCase()) || a.toLowerCase().includes(archetype)) {
                    score += 25;
                    break;
                }
            }
            // Archetype-specific heuristics
            if (archetype.includes("霸总") || archetype.includes("总裁") || archetype.includes("帝王") || archetype.includes("大佬")) {
                if (profile.id === "M04A")
                    score += 20;
            }
            if (archetype.includes("女主") && gender === "female") {
                if (profile.id === "F03A")
                    score += 10; // default young female lead
            }
            if (archetype.includes("反派") || archetype.includes("恶")) {
                if (profile.id.startsWith("F05D") || profile.id.startsWith("M05E") || profile.id.startsWith("M04C"))
                    score += 10;
            }
            if (archetype.includes("母") || archetype.includes("妈")) {
                if (profile.id === "F06B" || profile.id === "M05D")
                    score += 15;
            }
            if (archetype.includes("父") || archetype.includes("爸")) {
                if (profile.id === "M05D")
                    score += 15;
            }
            if (archetype.includes("奶") || archetype.includes("婆") || archetype.includes("老太")) {
                if (profile.id === "F07A")
                    score += 15;
            }
            if (archetype.includes("爷") || archetype.includes("老头")) {
                if (profile.id === "M06A")
                    score += 15;
            }
            if (archetype.includes("系统") || archetype.includes("ai")) {
                if (profile.id === "S02A")
                    score += 20;
            }
            if (archetype.includes("旁白") || archetype.includes("解说")) {
                if (profile.id === "S03A")
                    score += 15;
            }
        }
        if (!best || score > best.score) {
            best = { profile, score };
        }
    }
    const profile = best?.profile ?? FEMALE_VOICES[5]; // default to 少女清亮音
    return {
        profile,
        anchorSentence: buildAnchorSentence(profile),
    };
}
/**
 * Build a voice-anchoring sentence in Chinese that can be appended to a video
 * prompt. Format: "角色声音为[年龄范围][声线名]，[描述]。"
 */
export function buildAnchorSentence(profile) {
    const ageLabel = profile.ageRange[0] === 0 ? "" : `${profile.ageRange[0]}-${profile.ageRange[1]}岁`;
    return `角色声音为${ageLabel}${profile.name}，${profile.desc}。口型与台词自然同步，禁止新增台词。`;
}
/**
 * Build a short voice tag for English-language providers (Grok Imagine).
 * Returns an English description suitable for Grok voice prompts.
 */
export function buildEnglishVoiceTag(profile) {
    const englishMap = {
        // Female
        "F01A": "soft cute little girl voice, sweet and childish",
        "F01B": "clear bright little girl voice, lively",
        "F01C": "soft shy little girl voice, timid and quiet",
        "F02A": "tsundere young teen girl voice, slightly sassy",
        "F02B": "soft cute teen girl voice, sweet and gentle",
        "F03A": "clear bright young woman voice, energetic and sincere",
        "F03B": "soft sweet young woman voice, warm and gentle",
        "F03C": "bright energetic young woman voice, cheerful and fast",
        "F03D": "soft shy young woman voice, timid and breathy",
        "F03E": "stubborn young woman voice, holding back tears and anger",
        "F03F": "cold calm young woman voice, rational and distant",
        "F04A": "cold elegant young woman voice, restrained and distant",
        "F04B": "noble elegant woman voice, graceful and proud",
        "F04C": "intellectual mature woman voice, rational and warm",
        "F05A": "mature cold woman voice, authoritative and in control",
        "F05B": "warm mature woman voice, gentle and comforting",
        "F05C": "husky mature woman voice, lazy and story-rich",
        "F06A": "elegant middle-aged woman voice, wealthy and sharp",
        "F06B": "warm middle-aged mother voice, caring and tired",
        "F07A": "kind elderly grandmother voice, gentle and slow",
        // Male
        "M01A": "clear young boy voice, innocent and curious",
        "M02A": "clear bright teenage boy voice, sincere and warm",
        "M02B": "energetic teenage boy voice, hot-blooded",
        "M03A": "warm gentle young man voice, soft and kind",
        "M03B": "bright cheerful young man voice, sunny and outgoing",
        "M03C": "playful young man voice, slightly cocky with a smirk",
        "M04A": "deep magnetic mature man voice, authoritative CEO-like, in control",
        "M04B": "deep restrained mature man voice, heavy with responsibility",
        "M04C": "cold hard mature man voice, stoic and distant",
        "M05A": "deep tough middle-aged man voice, gruff and commanding",
        "M05D": "warm kind father voice, gentle and loving",
        "M06A": "kind elderly grandfather voice, gentle and slow",
        // Special
        "S02A": "calm female system AI voice, clear and slightly robotic",
        "S03A": "deep male narrator voice, clear and suspenseful",
        "S03C": "deep mature documentary narrator voice, steady and authoritative",
    };
    return englishMap[profile.id] ?? "clear natural voice, matching the character's age and gender";
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizeGender(g) {
    if (!g)
        return "";
    const s = g.toLowerCase();
    if (s.includes("男") || s === "male" || s === "m")
        return "male";
    if (s.includes("女") || s === "female" || s === "f")
        return "female";
    if (s.includes("系统") || s.includes("ai") || s.includes("旁白") || s.includes("非人类"))
        return "special";
    return "";
}
function estimateAge(ageStr, role, archetype) {
    if (typeof ageStr === "number")
        return ageStr;
    const text = `${ageStr ?? ""} ${role ?? ""} ${archetype ?? ""}`.toLowerCase();
    if (text.includes("幼女") || text.includes("女童") || text.includes("小女孩") || text.includes("孩童"))
        return 8;
    if (text.includes("正太") || text.includes("男童") || text.includes("小男孩"))
        return 9;
    if (text.includes("少女") || text.includes("少年") || text.includes("学生") || text.includes("女孩") || text.includes("男孩"))
        return 17;
    if (text.includes("御姐") || text.includes("少御") || text.includes("青年") || text.includes("白领"))
        return 26;
    if (text.includes("霸总") || text.includes("总裁") || text.includes("男主"))
        return 32;
    if (text.includes("母") || text.includes("妈") || text.includes("阿姨") || text.includes("中年"))
        return 45;
    if (text.includes("父") || text.includes("爸") || text.includes("大叔") || text.includes("叔叔"))
        return 45;
    if (text.includes("奶") || text.includes("婆") || text.includes("老太") || text.includes("爷") || text.includes("老"))
        return 70;
    return 18; // default young adult
}
//# sourceMappingURL=voice-library.js.map