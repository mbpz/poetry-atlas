#!/usr/bin/env python3
"""Generate multi-dimensional poetry dataset. Output valid JSON."""
import json

places = []
def p(pid, name, typ, lng, lat, poems):
    places.append({"id": pid, "name": name, "type": typ, "lng": lng, "lat": lat, "poems": poems})

# === 城市 ===
p("hangzhou","杭州","city",120.15,30.25,[
  {"title":"饮湖上初晴后雨","author":"苏轼","dynasty":"宋","content":"水光潋滟晴方好, 山色空蒙雨亦奇。\n欲把西湖比西子, 淡妆浓抹总相宜。"},
  {"title":"题临安邸","author":"林升","dynasty":"宋","content":"山外青山楼外楼, 西湖歌舞几时休。\n暖风熏得游人醉, 直把杭州作汴州。"},
  {"title":"晓出净慈寺送林子方","author":"杨万里","dynasty":"宋","content":"毕竟西湖六月中, 风光不与四时同。\n接天莲叶无穷碧, 映日荷花别样红。"},
  {"title":"钱塘湖春行","author":"白居易","dynasty":"唐","content":"孤山寺北贾亭西, 水面初平云脚低。\n几处早莺争暖树, 谁家新燕啄春泥。\n乱花渐欲迷人眼, 浅草才能没马蹄。\n最爱湖东行不足, 绿杨阴里白沙堤。"},
  {"title":"忆江南","author":"白居易","dynasty":"唐","content":"江南好, 风景旧曾谙。\n日出江花红胜火, 春来江水绿如蓝。\n能不忆江南？"},
  {"title":"望海潮","author":"柳永","dynasty":"宋","content":"东南形胜, 三吴都会, 钱塘自古繁华。\n烟柳画桥, 风帘翠幕, 参差十万人家。\n云树绕堤沙, 怒涛卷霜雪, 天堑无涯。"},
  {"title":"山园小梅","author":"林逋","dynasty":"宋","content":"众芳摇落独暄妍, 占尽风情向小园。\n疏影横斜水清浅, 暗香浮动月黄昏。"},
  {"title":"临安春雨初霁","author":"陆游","dynasty":"宋","content":"世味年来薄似纱, 谁令骑马客京华。\n小楼一夜听春雨, 深巷明朝卖杏花。"}
])

p("xian","西安","city",108.94,34.26,[
  {"title":"过华清宫绝句","author":"杜牧","dynasty":"唐","content":"长安回望绣成堆, 山顶千门次第开。\n一骑红尘妃子笑, 无人知是荔枝来。"},
  {"title":"子夜吴歌·秋歌","author":"李白","dynasty":"唐","content":"长安一片月, 万户捣衣声。\n秋风吹不尽, 总是玉关情。"},
  {"title":"登科后","author":"孟郊","dynasty":"唐","content":"春风得意马蹄疾, 一日看尽长安花。"},
  {"title":"长相思","author":"李白","dynasty":"唐","content":"长相思, 在长安。\n络纬秋啼金井阑, 微霜凄凄簟色寒。\n孤灯不明思欲绝, 卷帷望月空长叹。"},
  {"title":"玄都观看花","author":"刘禹锡","dynasty":"唐","content":"紫陌红尘拂面来, 无人不道看花回。\n玄都观里桃千树, 尽是刘郎去后栽。"},
  {"title":"丽人行","author":"杜甫","dynasty":"唐","content":"三月三日天气新, 长安水边多丽人。\n态浓意远淑且真, 肌理细腻骨肉匀。"},
  {"title":"送元二使安西","author":"王维","dynasty":"唐","content":"渭城朝雨浥轻尘, 客舍青青柳色新。\n劝君更尽一杯酒, 西出阳关无故人。"}
])

p("nanjing","南京","city",118.80,32.06,[
  {"title":"泊秦淮","author":"杜牧","dynasty":"唐","content":"烟笼寒水月笼沙, 夜泊秦淮近酒家。\n商女不知亡国恨, 隔江犹唱后庭花。"},
  {"title":"乌衣巷","author":"刘禹锡","dynasty":"唐","content":"朱雀桥边野草花, 乌衣巷口夕阳斜。\n旧时王谢堂前燕, 飞入寻常百姓家。"},
  {"title":"江南春","author":"杜牧","dynasty":"唐","content":"千里莺啼绿映红, 水村山郭酒旗风。\n南朝四百八十寺, 多少楼台烟雨中。"},
  {"title":"桂枝香·金陵怀古","author":"王安石","dynasty":"宋","content":"登临送目, 正故国晚秋, 天气初肃。\n千里澄江似练, 翠峰如簇。\n彩舟云淡, 星河鹭起, 画图难足。\n念往昔、繁华竞逐, 叹门外楼头, 悲恨相续。"},
  {"title":"台城","author":"韦庄","dynasty":"唐","content":"江雨霏霏江草齐, 六朝如梦鸟空啼。\n无情最是台城柳, 依旧烟笼十里堤。"},
  {"title":"石头城","author":"刘禹锡","dynasty":"唐","content":"山围故国周遭在, 潮打空城寂寞回。\n淮水东边旧时月, 夜深还过女墙来。"}
])

p("chengdu","成都","city",104.07,30.65,[
  {"title":"春夜喜雨","author":"杜甫","dynasty":"唐","content":"好雨知时节, 当春乃发生。\n随风潜入夜, 润物细无声。\n野径云俱黑, 江船火独明。\n晓看红湿处, 花重锦官城。"},
  {"title":"蜀相","author":"杜甫","dynasty":"唐","content":"丞相祠堂何处寻, 锦官城外柏森森。\n映阶碧草自春色, 隔叶黄鹂空好音。\n三顾频烦天下计, 两朝开济老臣心。\n出师未捷身先死, 长使英雄泪满襟。"},
  {"title":"上皇西巡南京歌","author":"李白","dynasty":"唐","content":"九天开出一成都, 万户千门入画图。\n草树云山如锦绣, 秦川得及此间无。"},
  {"title":"成都曲","author":"张籍","dynasty":"唐","content":"锦江近西烟水绿, 新雨山头荔枝熟。\n万里桥边多酒家, 游人爱向谁家宿？"}
])

p("suzhou","苏州","city",120.62,31.32,[
  {"title":"枫桥夜泊","author":"张继","dynasty":"唐","content":"月落乌啼霜满天, 江枫渔火对愁眠。\n姑苏城外寒山寺, 夜半钟声到客船。"},
  {"title":"送人游吴","author":"杜荀鹤","dynasty":"唐","content":"君到姑苏见, 人家尽枕河。\n古宫闲地少, 水港小桥多。"},
  {"title":"青玉案","author":"贺铸","dynasty":"宋","content":"凌波不过横塘路, 但目送、芳尘去。\n锦瑟华年谁与度？月桥花院, 琐窗朱户。"}
])

p("yangzhou","扬州","city",119.42,32.39,[
  {"title":"遣怀","author":"杜牧","dynasty":"唐","content":"落魄江湖载酒行, 楚腰纤细掌中轻。\n十年一觉扬州梦, 赢得青楼薄幸名。"},
  {"title":"寄扬州韩绰判官","author":"杜牧","dynasty":"唐","content":"青山隐隐水迢迢, 秋尽江南草未凋。\n二十四桥明月夜, 玉人何处教吹箫？"},
  {"title":"忆扬州","author":"徐凝","dynasty":"唐","content":"萧娘脸薄难胜泪, 桃叶眉长易觉愁。\n天下三分明月夜, 二分无赖是扬州。"},
  {"title":"扬州慢","author":"姜夔","dynasty":"宋","content":"淮左名都, 竹西佳处, 解鞍少驻初程。\n过春风十里, 尽荠麦青青。\n自胡马窥江去后, 废池乔木, 犹厌言兵。"}
])

p("beijing","北京","city",116.41,39.90,[
  {"title":"登幽州台歌","author":"陈子昂","dynasty":"唐","content":"前不见古人, 后不见来者。\n念天地之悠悠, 独怆然而涕下。"},
  {"title":"蓟丘览古","author":"陈子昂","dynasty":"唐","content":"南登碣石馆, 遥望黄金台。\n丘陵尽乔木, 昭王安在哉？"}
])

p("luoyang","洛阳","city",112.45,34.62,[
  {"title":"春夜洛城闻笛","author":"李白","dynasty":"唐","content":"谁家玉笛暗飞声, 散入春风满洛城。\n此夜曲中闻折柳, 何人不起故园情。"},
  {"title":"洛阳女儿行","author":"王维","dynasty":"唐","content":"洛阳女儿对门居, 才可容颜十五余。\n良人玉勒乘骢马, 侍女金盘脍鲤鱼。"},
  {"title":"浪淘沙","author":"欧阳修","dynasty":"宋","content":"把酒祝东风, 且共从容。\n垂杨紫陌洛城东。\n总是当时携手处, 游遍芳丛。"}
])

p("nanchang","南昌","city",115.86,28.68,[
  {"title":"滕王阁序","author":"王勃","dynasty":"唐","content":"落霞与孤鹜齐飞, 秋水共长天一色。"},
  {"title":"滕王阁诗","author":"王勃","dynasty":"唐","content":"滕王高阁临江渚, 佩玉鸣鸾罢歌舞。\n画栋朝飞南浦云, 珠帘暮卷西山雨。\n闲云潭影日悠悠, 物换星移几度秋。\n阁中帝子今何在？槛外长江空自流。"}
])

p("yueyang","岳阳","city",113.13,29.37,[
  {"title":"登岳阳楼","author":"杜甫","dynasty":"唐","content":"昔闻洞庭水, 今上岳阳楼。\n吴楚东南坼, 乾坤日夜浮。\n亲朋无一字, 老病有孤舟。\n戎马关山北, 凭轩涕泗流。"},
  {"title":"岳阳楼记","author":"范仲淹","dynasty":"宋","content":"先天下之忧而忧, 后天下之乐而乐。\n不以物喜, 不以己悲。"}
])

p("dunhuang","敦煌","city",94.66,40.14,[
  {"title":"凉州词","author":"王之涣","dynasty":"唐","content":"黄河远上白云间, 一片孤城万仞山。\n羌笛何须怨杨柳, 春风不度玉门关。"},
  {"title":"使至塞上","author":"王维","dynasty":"唐","content":"大漠孤烟直, 长河落日圆。\n萧关逢候骑, 都护在燕然。"},
  {"title":"出塞","author":"王昌龄","dynasty":"唐","content":"秦时明月汉时关, 万里长征人未还。\n但使龙城飞将在, 不教胡马度阴山。"}
])

p("chongqing","重庆","city",106.55,29.56,[
  {"title":"早发白帝城","author":"李白","dynasty":"唐","content":"朝辞白帝彩云间, 千里江陵一日还。\n两岸猿声啼不住, 轻舟已过万重山。"},
  {"title":"离思五首·其四","author":"元稹","dynasty":"唐","content":"曾经沧海难为水, 除却巫山不是云。\n取次花丛懒回顾, 半缘修道半缘君。"}
])

p("changsha","长沙","city",112.94,28.23,[
  {"title":"沁园春·长沙","author":"毛泽东","dynasty":"当代","content":"独立寒秋, 湘江北去, 橘子洲头。\n看万山红遍, 层林尽染；漫江碧透, 百舸争流。\n鹰击长空, 鱼翔浅底, 万类霜天竞自由。\n怅寥廓, 问苍茫大地, 谁主沉浮？"}
])

# === 楼阁 ===
p("yellow_crane_tower","黄鹤楼","tower",114.30,30.50,[
  {"title":"黄鹤楼送孟浩然之广陵","author":"李白","dynasty":"唐","content":"故人西辞黄鹤楼, 烟花三月下扬州。\n孤帆远影碧空尽, 唯见长江天际流。"},
  {"title":"黄鹤楼","author":"崔颢","dynasty":"唐","content":"昔人已乘黄鹤去, 此地空余黄鹤楼。\n黄鹤一去不复返, 白云千载空悠悠。\n晴川历历汉阳树, 芳草萋萋鹦鹉洲。\n日暮乡关何处是？烟波江上使人愁。"},
  {"title":"与史郎中钦听黄鹤楼上吹笛","author":"李白","dynasty":"唐","content":"一为迁客去长沙, 西望长安不见家。\n黄鹤楼中吹玉笛, 江城五月落梅花。"}
])

p("yueyang_tower","岳阳楼","tower",113.10,29.37,[
  {"title":"登岳阳楼","author":"杜甫","dynasty":"唐","content":"昔闻洞庭水, 今上岳阳楼。\n吴楚东南坼, 乾坤日夜浮。"},
  {"title":"岳阳楼记","author":"范仲淹","dynasty":"宋","content":"先天下之忧而忧, 后天下之乐而乐。\n不以物喜, 不以己悲。"}
])

p("tengwang_tower","滕王阁","tower",115.88,28.68,[
  {"title":"滕王阁序","author":"王勃","dynasty":"唐","content":"落霞与孤鹜齐飞, 秋水共长天一色。"},
  {"title":"滕王阁诗","author":"王勃","dynasty":"唐","content":"滕王高阁临江渚, 佩玉鸣鸾罢歌舞。\n画栋朝飞南浦云, 珠帘暮卷西山雨。"}
])

p("guanque_tower","鹳雀楼","tower",110.27,34.83,[
  {"title":"登鹳雀楼","author":"王之涣","dynasty":"唐","content":"白日依山尽, 黄河入海流。\n欲穷千里目, 更上一层楼。"}
])

p("tianyi_pavilion","天一阁","tower",121.55,29.88,[
  {"title":"天一阁","author":"全祖望","dynasty":"清","content":"藏书楼瞰月湖头, 一代风流天一阁。"}
])

# === 山川 ===
p("mount_tai","泰山","mountain",117.12,36.20,[
  {"title":"望岳","author":"杜甫","dynasty":"唐","content":"岱宗夫如何, 齐鲁青未了。\n造化钟神秀, 阴阳割昏晓。\n荡胸生曾云, 决眦入归鸟。\n会当凌绝顶, 一览众山小。"}
])

p("mount_hua","华山","mountain",110.09,34.48,[
  {"title":"西岳云台歌送丹丘子","author":"李白","dynasty":"唐","content":"西岳峥嵘何壮哉！黄河如丝天际来。\n黄河万里触山动, 盘涡毂转秦地雷。"}
])

p("mount_huang","黄山","mountain",118.17,30.13,[
  {"title":"黄山四千仞","author":"李白","dynasty":"唐","content":"黄山四千仞, 三十二莲峰。\n丹崖夹石柱, 菡萏金芙蓉。"},
  {"title":"题黄山","author":"吴龙翰","dynasty":"宋","content":"九十九峰秀色新, 峰峰峭削玉嶙峋。"}
])

p("mount_lu","庐山","mountain",115.98,29.55,[
  {"title":"题西林壁","author":"苏轼","dynasty":"宋","content":"横看成岭侧成峰, 远近高低各不同。\n不识庐山真面目, 只缘身在此山中。"},
  {"title":"望庐山瀑布","author":"李白","dynasty":"唐","content":"日照香炉生紫烟, 遥看瀑布挂前川。\n飞流直下三千尺, 疑是银河落九天。"},
  {"title":"登庐山","author":"李白","dynasty":"唐","content":"庐山秀出南斗傍, 屏风九叠云锦张。"}
])

p("mount_emei","峨眉山","mountain",103.35,29.52,[
  {"title":"登峨眉山","author":"李白","dynasty":"唐","content":"蜀国多仙山, 峨眉邈难匹。\n周流试登览, 绝怪安可悉？"},
  {"title":"峨眉山月歌","author":"李白","dynasty":"唐","content":"峨眉山月半轮秋, 影入平羌江水流。\n夜发清溪向三峡, 思君不见下渝州。"}
])

p("mount_wudang","武当山","mountain",111.00,32.40,[
  {"title":"武当山","author":"刘因","dynasty":"元","content":"青松翠竹伴幽居, 一望烟霞万里余。"}
])

p("mount_qingcheng","青城山","mountain",103.55,30.90,[
  {"title":"青城山","author":"杜甫","dynasty":"唐","content":"自为青城客, 不唾青城地。\n为爱丈人山, 丹梯近幽意。"}
])

p("mount_wuyi","武夷山","mountain",117.93,27.67,[
  {"title":"游武夷","author":"辛弃疾","dynasty":"宋","content":"蓬莱枉觅瑶池路, 不道人间有武夷。"}
])

p("mount_zhongnan","终南山","mountain",108.92,34.02,[
  {"title":"终南山","author":"王维","dynasty":"唐","content":"太乙近天都, 连山接海隅。\n白云回望合, 青霭入看无。\n分野中峰变, 阴晴众壑殊。\n欲投人处宿, 隔水问樵夫。"},
  {"title":"终南别业","author":"王维","dynasty":"唐","content":"中岁颇好道, 晚家南山陲。\n兴来每独往, 胜事空自知。\n行到水穷处, 坐看云起时。\n偶然值林叟, 谈笑无还期。"}
])

p("mount_heng_north","恒山","mountain",113.73,39.67,[
  {"title":"登恒山","author":"贾岛","dynasty":"唐","content":"天地有五岳, 恒岳居其北。\n岩峦叠万重, 诡怪浩难测。"}
])

p("mount_heng_south","衡山","mountain",112.70,27.25,[
  {"title":"望衡山","author":"朱熹","dynasty":"宋","content":"岌嶪湘江上, 青青衡山麓。"}
])

p("mount_tai_hang","太行山","mountain",113.60,36.00,[
  {"title":"行路难","author":"李白","dynasty":"唐","content":"欲渡黄河冰塞川, 将登太行雪满山。"}
])

# === 湖泊 ===
p("west_lake","西湖","lake",120.14,30.24,[
  {"title":"饮湖上初晴后雨","author":"苏轼","dynasty":"宋","content":"水光潋滟晴方好, 山色空蒙雨亦奇。\n欲把西湖比西子, 淡妆浓抹总相宜。"},
  {"title":"晓出净慈寺送林子方","author":"杨万里","dynasty":"宋","content":"毕竟西湖六月中, 风光不与四时同。\n接天莲叶无穷碧, 映日荷花别样红。"},
  {"title":"题临安邸","author":"林升","dynasty":"宋","content":"山外青山楼外楼, 西湖歌舞几时休。\n暖风熏得游人醉, 直把杭州作汴州。"},
  {"title":"钱塘湖春行","author":"白居易","dynasty":"唐","content":"孤山寺北贾亭西, 水面初平云脚低。\n几处早莺争暖树, 谁家新燕啄春泥。\n乱花渐欲迷人眼, 浅草才能没马蹄。\n最爱湖东行不足, 绿杨阴里白沙堤。"}
])

p("dongting_lake","洞庭湖","lake",112.90,29.30,[
  {"title":"望洞庭","author":"刘禹锡","dynasty":"唐","content":"湖光秋月两相和, 潭面无风镜未磨。\n遥望洞庭山水翠, 白银盘里一青螺。"},
  {"title":"登岳阳楼","author":"杜甫","dynasty":"唐","content":"昔闻洞庭水, 今上岳阳楼。\n吴楚东南坼, 乾坤日夜浮。"},
  {"title":"岳阳楼记","author":"范仲淹","dynasty":"宋","content":"衔远山, 吞长江, 浩浩汤汤, 横无际涯。\n朝晖夕阴, 气象万千。"}
])

p("poyang_lake","鄱阳湖","lake",116.30,29.10,[
  {"title":"彭蠡湖中望庐山","author":"孟浩然","dynasty":"唐","content":"太虚生月晕, 舟子知天风。\n挂席候明发, 渺漫平湖中。\n中流见匡阜, 势压九江雄。"}
])

p("tai_lake","太湖","lake",120.20,31.20,[
  {"title":"太湖","author":"范仲淹","dynasty":"宋","content":"有浪即山高, 无风还练静。"}
])

p("dian_lake","滇池","lake",102.67,25.04,[
  {"title":"大观楼","author":"孙髯翁","dynasty":"清","content":"五百里滇池, 奔来眼底, 披襟岸帻, 喜茫茫空阔无边。\n看: 东骧神骏, 西翥灵仪, 北走蜿蜒, 南翔缟素。\n高人韵士何妨选胜登临。"}
])

p("er_lake","洱海","lake",100.27,25.70,[
  {"title":"洱海","author":"杨慎","dynasty":"明","content: "风静浪平洱海秋, 几回升载几回留。"：}
])

# === 寺庙 ===
p("hanshan_temple","寒山寺","temple",120.57,31.31,[
  {"title":"枫桥夜泊","author":"张继","dynasty":"唐","content":"月落乌啼霜满天, 江枫渔火对愁眠。\n姑苏城外寒山寺, 夜半钟声到客船。"}
])

p("lingyin_temple","灵隐寺","temple",120.10,30.24,[
  {"title":"灵隐寺","author":"宋之问","dynasty":"唐","content":"鹫岭郁岧峣, 龙宫锁寂寥。\n沧海飞白雨, 江上喷红潮。"}
])

p("shaolin_temple","少林寺","temple",112.93,34.50,[
  {"title":"少林寺","author":"白居易","dynasty":"唐","content":"山青青兮水潺潺, 石磊磊兮松盘盘。"}
])

# === 关隘 ===
p("yang_pass","阳关","pass",94.28,39.90,[
  {"title":"送元二使安西","author":"王维","dynasty":"唐","content":"渭城朝雨浥轻尘, 客舍青青柳色新。\n劝君更尽一杯酒, 西出阳关无故人。"}
])

p("yumen_pass","玉门关","pass",93.88,40.35,[
  {"title":"凉州词","author":"王之涣","dynasty":"唐","content":"黄河远上白云间, 一片孤城万仞山。\n羌笛何须怨杨柳, 春风不度玉门关。"},
  {"title":"从军行","author":"王昌龄","dynasty":"唐","content":"青海长云暗雪山, 孤城遥望玉门关。"}
])

p("tong_pass","潼关","pass",110.24,34.55,[
  {"title":"潼关","author":"谭嗣同","dynasty":"清","content":"终古高云簇此城, 秋风吹散马蹄声。\n河流大野犹嫌束, 山入潼关不解平。"},
  {"title":"山坡羊·潼关怀古","author":"张养浩","dynasty":"元","content":"峰峦如聚, 波涛如怒, 山河表里潼关路。\n望西都, 意踌躇。\n伤心秦汉经行处, 宫阙万间都做了土。"}
])

p("shankou_pass","山海关","pass",119.76,40.00,[
  {"title":"山海关","author":"纳兰性德","dynasty":"清","content":"雄关阻塞戴萧森, 风起云飞万木阴。"
])

p("sword_gate","剑门关","pass",105.53,32.28,[
  {"title":"蜀道难","author":"