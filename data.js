const OFES_DEFAULT_DATA={
 year:"2026",eventDate:"2026-11-21",notice:"試作品 Ver.0.2 です。内容はサンプルです。",adminPassword:"ofes2026",
 places:[
  {id:"gym",name:"体育館",x:5,y:56,w:30,h:34},{id:"early1",name:"前期棟1階",x:41,y:63,w:23,h:20},{id:"early2",name:"前期棟2階",x:41,y:38,w:23,h:20},{id:"late1",name:"後期棟1階",x:69,y:63,w:26,h:20},{id:"late2",name:"後期棟2階",x:69,y:38,w:26,h:20},{id:"late3",name:"後期棟3階",x:69,y:13,w:26,h:20}
 ],
 program:[
  {id:1,start:"09:00",end:"09:20",title:"オープニング",placeId:"gym"},{id:2,start:"09:30",end:"09:40",title:"英語スキット",placeId:"gym"},{id:3,start:"09:45",end:"10:30",title:"作品展示",placeId:"late3"},{id:4,start:"10:00",end:"10:30",title:"学習発表",placeId:"gym"},{id:5,start:"10:40",end:"11:10",title:"体験コーナー",placeId:"early1"},{id:6,start:"11:15",end:"11:45",title:"有志発表",placeId:"gym"}
 ],
 stamps:[
  {id:1,hint:"大きなステージがある場所を探してみよう！",message:"体育館まで来てくれてありがとう！"},{id:2,hint:"上の階にも作品があるかも？",message:"展示を見つけました！"},{id:3,hint:"みんなの作品が集まっている場所です。",message:"作品をじっくり見てみよう！"},{id:4,hint:"少し寄り道してみよう。",message:"4つ目のスタンプGET！"},{id:5,hint:"最後のスタンプはどこかな？",message:"全部集めてくれてありがとう！"}
 ],
 movies:[{title:"おおフェス紹介",description:"事前撮影した紹介動画を掲載できます。",url:"#"},{title:"発表紹介",description:"YouTubeの限定公開URLなどに差し替えてください。",url:"#"}],
 posters:[1,2,3,4,5,6].map(n=>({title:`ポスター ${n}`,src:`images/poster0${n}.svg`}))
};
