const OFES_DEFAULT_DATA = {
  year: "2026",
  eventDate: "2026-11-21",
  notice: "時間は昨年度（2025）のプログラムを参考にした試作です。管理者画面から変更できます。",
  adminPassword: "ofes2026",
  previewEnabled: false,
  previewDateTime: "2026-11-21T09:25",

  floors: [
    { id:"zenki1", name:"前期棟1F", image:"images/zenki1.png" },
    { id:"zenki2", name:"前期棟2F", image:"images/zenki2.png" },
    { id:"koki1", name:"後期棟1F", image:"images/koki1.png" },
    { id:"koki2", name:"後期棟2F", image:"images/koki2.png" },
    { id:"koki3", name:"後期棟3F", image:"images/koki3.png" }
  ],

  rooms: [
    {id:"gym",name:"体育館（配置図は後日）",floorId:null},
    {id:"parking",name:"駐車場（配置図は後日）",floorId:null},
    {id:"various",name:"校内各教室",floorId:null},

    {id:"z1_library",name:"図書室",floorId:"zenki1",x:1,y:8,w:16,h:31},
    {id:"z1_self",name:"自習室",floorId:"zenki1",x:1,y:39,w:6,h:31},
    {id:"z1_staff",name:"職員室",floorId:"zenki1",x:17,y:8,w:16,h:61},
    {id:"z1_principal",name:"校長室",floorId:"zenki1",x:38,y:8,w:6,h:31},
    {id:"z1_meeting",name:"大会議室",floorId:"zenki1",x:44,y:8,w:11,h:31},
    {id:"z1_multipurpose",name:"多目的ホール",floorId:"zenki1",x:60,y:39,w:11,h:31},
    {id:"z1_kitchen",name:"学校給食調理場",floorId:"zenki1",x:77,y:8,w:20,h:72},

    {id:"z2_grade2",name:"2年生",floorId:"zenki2",x:6,y:5,w:13,h:31},
    {id:"z2_grade1",name:"1年生",floorId:"zenki2",x:6,y:36,w:13,h:31},
    {id:"z2_grade3",name:"3年生",floorId:"zenki2",x:35,y:5,w:13,h:31},
    {id:"z2_tsukushi",name:"つくし",floorId:"zenki2",x:35,y:36,w:13,h:18},
    {id:"z2_tanpopo",name:"たんぽぽ",floorId:"zenki2",x:35,y:54,w:13,h:14},
    {id:"z2_grade5",name:"5年生",floorId:"zenki2",x:64,y:5,w:13,h:31},
    {id:"z2_grade6",name:"6年生",floorId:"zenki2",x:64,y:36,w:13,h:31},

    {id:"k1_science",name:"前期理科室",floorId:"koki1",x:27,y:43,w:16,h:27},
    {id:"k1_grade7",name:"7年生",floorId:"koki1",x:58,y:43,w:13,h:27},
    {id:"k1_grade6",name:"6年生",floorId:"koki1",x:71,y:43,w:12,h:27},
    {id:"k1_cooking",name:"調理室",floorId:"koki1",x:2,y:77,w:19,h:19},
    {id:"k1_tech",name:"技術室",floorId:"koki1",x:86,y:0,w:10,h:24},

    {id:"k2_science",name:"理科室",floorId:"koki2",x:2,y:60,w:19,h:25},
    {id:"k2_grade9",name:"9年生",floorId:"koki2",x:58,y:38,w:13,h:22},
    {id:"k2_grade8",name:"8年生",floorId:"koki2",x:71,y:38,w:12,h:22},
    {id:"k2_english",name:"English Cafe",floorId:"koki2",x:46,y:34,w:6,h:25},

    {id:"k3_music",name:"音楽室",floorId:"koki3",x:2,y:67,w:22,h:21},
    {id:"k3_art",name:"美術室",floorId:"koki3",x:21,y:33,w:12,h:28},
    {id:"k3_sewing",name:"被服室",floorId:"koki3",x:33,y:33,w:13,h:28},
    {id:"k3_pc",name:"パソコン室",floorId:"koki3",x:46,y:33,w:19,h:28},
    {id:"k3_multi",name:"多目的室",floorId:"koki3",x:65,y:33,w:18,h:28}
  ],

  program: [
    {id:1,start:"08:45",end:"09:05",title:"開会行事・アトラクション",roomId:"gym"},
    {id:2,start:"09:05",end:"09:20",title:"移動・準備",roomId:"various"},
    {id:3,start:"09:20",end:"09:40",title:"セッション①",roomId:"various"},
    {id:4,start:"09:40",end:"09:50",title:"移動・準備",roomId:"various"},
    {id:5,start:"09:50",end:"10:10",title:"セッション②",roomId:"various"},
    {id:6,start:"10:10",end:"10:20",title:"移動・準備",roomId:"various"},
    {id:7,start:"10:20",end:"10:40",title:"セッション③",roomId:"various"},
    {id:8,start:"10:40",end:"10:50",title:"移動・準備",roomId:"various"},
    {id:9,start:"10:50",end:"11:10",title:"セッション④",roomId:"various"},
    {id:10,start:"11:10",end:"11:25",title:"移動・準備",roomId:"various"},
    {id:11,start:"11:25",end:"11:40",title:"午前の発表",roomId:"gym"},
    {id:12,start:"11:40",end:"11:50",title:"講評",roomId:"gym"},
    {id:13,start:"11:50",end:"12:40",title:"昼休み・スライド上映",roomId:"gym"},
    {id:14,start:"12:40",end:"12:43",title:"午後の部　開始のあいさつ",roomId:"gym"},
    {id:15,start:"12:43",end:"12:53",title:"演劇発表",roomId:"gym"},
    {id:16,start:"12:53",end:"13:00",title:"特別発表",roomId:"gym"},
    {id:17,start:"13:00",end:"13:10",title:"実行委員会・ステージ準備",roomId:"gym"},
    {id:18,start:"13:10",end:"13:17",title:"部活動発表",roomId:"gym"},
    {id:19,start:"13:17",end:"13:32",title:"ステージ準備・休憩",roomId:"gym"},
    {id:20,start:"13:32",end:"13:38",title:"英語発表",roomId:"gym"},
    {id:21,start:"13:38",end:"13:44",title:"ダンス",roomId:"gym"},
    {id:22,start:"13:44",end:"13:50",title:"歌",roomId:"gym"},
    {id:23,start:"13:50",end:"13:56",title:"歌・ダンス",roomId:"gym"},
    {id:24,start:"13:56",end:"14:02",title:"ステージ準備",roomId:"gym"},
    {id:25,start:"14:02",end:"14:08",title:"演奏・ダンス",roomId:"gym"},
    {id:26,start:"14:08",end:"14:14",title:"劇・ダンス",roomId:"gym"},
    {id:27,start:"14:14",end:"14:20",title:"サックス演奏",roomId:"gym"},
    {id:28,start:"14:20",end:"14:30",title:"実行委員会・ステージ準備",roomId:"gym"},
    {id:29,start:"14:30",end:"14:50",title:"吹奏楽",roomId:"gym"},
    {id:30,start:"14:50",end:"15:00",title:"閉会行事",roomId:"gym"}
  ],

  stamps: [
    {id:1,hint:"大きなステージがある場所を探してみよう！",message:"スタンプ1 GET！"},
    {id:2,hint:"上の階にも展示があるかも？",message:"スタンプ2 GET！"},
    {id:3,hint:"みんなの作品が集まる場所を探してみよう！",message:"スタンプ3 GET！"},
    {id:4,hint:"少し寄り道してみよう。",message:"スタンプ4 GET！"},
    {id:5,hint:"最後のスタンプはどこかな？",message:"5つ全部集めてくれてありがとう！"}
  ],

  movies: [
    {title:"おおフェス紹介",description:"事前撮影した紹介動画を掲載できます。",url:"#"},
    {title:"発表紹介",description:"YouTubeの限定公開URLなどに差し替えてください。",url:"#"}
  ],

  posters: [
    {title:"ポスター 1",src:"images/poster01.svg"},
    {title:"ポスター 2",src:"images/poster02.svg"},
    {title:"ポスター 3",src:"images/poster03.svg"},
    {title:"ポスター 4",src:"images/poster04.svg"},
    {title:"ポスター 5",src:"images/poster05.svg"},
    {title:"ポスター 6",src:"images/poster06.svg"}
  ]
};