const OFES_DEFAULT_DATA = {
  year: "2026",
  eventDate: "2026-11-21",
  notice: "試作品 Ver.0.5。簡略校内マップ＋Firebase連携対応版です。",
  previewEnabled: true,
  previewDateTime: "2026-11-21T09:25",

  maps: [
    {id:"campus",name:"校内全体",image:"images/campus.svg"},
    {id:"zenki1",name:"前期棟1F",image:"images/zenki1.svg"},
    {id:"zenki2",name:"前期棟2F",image:"images/zenki2.svg"},
    {id:"koki1",name:"後期棟1F",image:"images/koki1.svg"},
    {id:"koki2",name:"後期棟2F",image:"images/koki2.svg"},
    {id:"koki3",name:"後期棟3F",image:"images/koki3.svg"}
  ],

  rooms: [
    {id:"gym",name:"体育館",mapId:"campus",campusGroup:"gym",x:33.3,y:71.9,w:33.4,h:20.7},
    {id:"parking",name:"駐車場",mapId:"campus",campusGroup:"parking",x:10.8,y:14.6,w:78.4,h:16.5},
    {id:"various",name:"校内各教室",mapId:null,campusGroup:null},

    {id:"z1_library",name:"図書室",mapId:"zenki1",campusGroup:"zenki",x:6.7,y:22.2,w:19.2,h:29.2},
    {id:"z1_self",name:"自習室",mapId:"zenki1",campusGroup:"zenki",x:27.5,y:22.2,w:16.7,h:29.2},
    {id:"z1_meeting",name:"大会議室",mapId:"zenki1",campusGroup:"zenki",x:45.8,y:22.2,w:21.7,h:29.2},
    {id:"z1_hall",name:"多目的ホール",mapId:"zenki1",campusGroup:"zenki",x:69.2,y:22.2,w:24.1,h:29.2},
    {id:"z1_entrance",name:"玄関・ホール",mapId:"zenki1",campusGroup:"zenki",x:15,y:61.1,w:22.5,h:20.8},
    {id:"z1_health",name:"保健室",mapId:"zenki1",campusGroup:"zenki",x:41.7,y:61.1,w:22.5,h:20.8},

    {id:"z2_2",name:"2年生",mapId:"zenki2",campusGroup:"zenki",x:5.8,y:20.8,w:19.6,h:25.7},
    {id:"z2_1",name:"1年生",mapId:"zenki2",campusGroup:"zenki",x:5.8,y:50.7,w:19.6,h:25.7},
    {id:"z2_3",name:"3年生",mapId:"zenki2",campusGroup:"zenki",x:29.6,y:20.8,w:19.6,h:25.7},
    {id:"z2_tsukushi",name:"つくし",mapId:"zenki2",campusGroup:"zenki",x:29.6,y:50.7,w:19.6,h:11.8},
    {id:"z2_tanpopo",name:"たんぽぽ",mapId:"zenki2",campusGroup:"zenki",x:29.6,y:64.6,w:19.6,h:11.8},
    {id:"z2_5",name:"5年生",mapId:"zenki2",campusGroup:"zenki",x:53.3,y:20.8,w:19.6,h:25.7},
    {id:"z2_6",name:"6年生",mapId:"zenki2",campusGroup:"zenki",x:53.3,y:50.7,w:19.6,h:25.7},

    {id:"k1_science",name:"前期理科室",mapId:"koki1",campusGroup:"koki",x:8.3,y:23.6,w:21.7,h:25},
    {id:"k1_7",name:"7年生",mapId:"koki1",campusGroup:"koki",x:34.2,y:23.6,w:19.2,h:25},
    {id:"k1_6",name:"6年生",mapId:"koki1",campusGroup:"koki",x:57.5,y:23.6,w:19.2,h:25},
    {id:"k1_cooking",name:"調理室",mapId:"koki1",campusGroup:"koki",x:8.3,y:58.3,w:21.7,h:22.2},
    {id:"k1_tech",name:"技術室",mapId:"koki1",campusGroup:"koki",x:34.2,y:58.3,w:21.7,h:22.2},

    {id:"k2_science",name:"理科室",mapId:"koki2",campusGroup:"koki",x:7.5,y:23.6,w:23.3,h:26.4},
    {id:"k2_9",name:"9年生",mapId:"koki2",campusGroup:"koki",x:35.4,y:23.6,w:19.2,h:26.4},
    {id:"k2_8",name:"8年生",mapId:"koki2",campusGroup:"koki",x:58.8,y:23.6,w:19.2,h:26.4},
    {id:"k2_english",name:"English Cafe",mapId:"koki2",campusGroup:"koki",x:35.4,y:58.3,w:19.2,h:20.8},

    {id:"k3_music",name:"音楽室",mapId:"koki3",campusGroup:"koki",x:5.8,y:25,w:16.7,h:25},
    {id:"k3_art",name:"美術室",mapId:"koki3",campusGroup:"koki",x:25.8,y:25,w:16.7,h:25},
    {id:"k3_sewing",name:"被服室",mapId:"koki3",campusGroup:"koki",x:45.8,y:25,w:16.7,h:25},
    {id:"k3_pc",name:"パソコン室",mapId:"koki3",campusGroup:"koki",x:65.8,y:25,w:16.7,h:25},
    {id:"k3_multi",name:"多目的室",mapId:"koki3",campusGroup:"koki",x:35.8,y:59.7,w:28.4,h:22.2}
  ],

  program: [
    {id:1,start:"08:45",end:"09:05",title:"開会行事・アトラクション",roomId:"gym"},
    {id:2,start:"09:05",end:"09:20",title:"移動・準備",roomId:"various"},
    {id:3,start:"09:20",end:"09:40",title:"セッション①【テスト表示】",roomId:"k2_9"},
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
    {id:14,start:"12:40",end:"12:43",title:"午後の部 開始のあいさつ",roomId:"gym"},
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
    {title:"おおフェス紹介",description:"YouTube等のURLを管理者画面から設定できます。",url:"#"}
  ],

  posters: [
    {title:"サンプルポスター 1",src:"images/poster01.svg"},
    {title:"サンプルポスター 2",src:"images/poster02.svg"}
  ]
};