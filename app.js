const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const ADMIN_PASSWORD="ofes0034";
const CONFIG_KEY="ofes-config-v05", STAMP_KEY="ofes-stamps-v05";
let data=JSON.parse(JSON.stringify(OFES_DEFAULT_DATA));
let selectedMapId="campus";
let db=null, storage=null, firebaseReady=false;

function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}
function attr(v){return esc(v).replaceAll('"',"&quot;")}
function isFirebaseConfigured(){
 const c=window.OFES_FIREBASE_CONFIG||{};
 return !!(c.apiKey&&c.projectId&&c.storageBucket&&c.appId);
}
async function initBackend(){
 if(isFirebaseConfigured()&&window.firebase){
   try{
     if(!firebase.apps.length) firebase.initializeApp(window.OFES_FIREBASE_CONFIG);
     db=firebase.firestore(); storage=firebase.storage(); firebaseReady=true;
     const snap=await db.collection("ofes").doc("current").get();
     if(snap.exists) data={...data,...snap.data()};
   }catch(e){console.warn(e);firebaseReady=false;loadLocal();}
 }else loadLocal();
 $("#firebaseState").textContent=firebaseReady?"Firebase接続中（共有設定）":"ローカル試作モード（Firebase未設定）";
 renderAll();
}
function loadLocal(){try{const x=localStorage.getItem(CONFIG_KEY);if(x)data=JSON.parse(x)}catch{}}
async function saveConfig(){
 localStorage.setItem(CONFIG_KEY,JSON.stringify(data));
 if(firebaseReady) await db.collection("ofes").doc("current").set(data);
}
function showPage(id){$$(".page").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");if(id==="map")autoSelectMap();window.scrollTo({top:0,behavior:"smooth"})}
$$(".menu-card").forEach(b=>b.onclick=()=>showPage(b.dataset.page));$$(".back").forEach(b=>b.onclick=()=>showPage("home"));$$(".back-home").forEach(b=>b.onclick=()=>showPage("home"));

function currentClock(){if(data.previewEnabled&&data.previewDateTime){const d=new Date(data.previewDateTime);if(!Number.isNaN(d.getTime()))return d}return new Date()}
function dateISO(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function mins(t){const [h,m]=(t||"00:00").split(":").map(Number);return h*60+m}
function room(id){return data.rooms.find(r=>r.id===id)}
function roomName(id){return room(id)?.name||"場所未設定"}
function sortedProgram(){return [...data.program].sort((a,b)=>mins(a.start)-mins(b.start)||(a.id-b.id))}
function nowState(){const now=currentClock(),n=now.getHours()*60+now.getMinutes(),isEvent=dateISO(now)===data.eventDate,all=sortedProgram();return{now,n,isEvent,all,current:isEvent?all.filter(p=>n>=mins(p.start)&&n<mins(p.end)):[],upcoming:isEvent?all.filter(p=>n<mins(p.start)):[],finished:isEvent?all.filter(p=>n>=mins(p.end)):[]}}

function renderHome(){
 $("#noticeText").textContent=data.notice||"";
 $("#testBadge").classList.toggle("hidden",!data.previewEnabled);
 const s=nowState(),box=$("#todaySummary");
 if(!s.isEvent){box.innerHTML=`<div class="summary-card summary-next"><b>開催日：${data.eventDate}</b></div>`;return}
 let h=s.current.length?`<div class="summary-card"><small>ただいま開催中</small><br>${s.current.map(p=>`<b>${p.start}–${p.end} ${esc(p.title)}</b> ／ ${esc(roomName(p.roomId))}`).join("<br>")}</div>`:`<div class="summary-card">現在開催中のプログラムはありません。</div>`;
 if(s.upcoming.length){const p=s.upcoming[0];h+=`<div class="summary-card summary-next"><small>次のプログラム</small><br><b>${p.start} ${esc(p.title)}</b> ／ ${esc(roomName(p.roomId))}</div>`}
 box.innerHTML=h;
}
function renderProgram(){
 const s=nowState();
 $("#programStatus").innerHTML=s.isEvent?`<div class="status-block"><h3>ただいま開催中</h3>${s.current.length?`<ul>${s.current.map(p=>`<li>${p.start}–${p.end} ${esc(p.title)} ／ ${esc(roomName(p.roomId))}</li>`).join("")}</ul>`:"<p>ありません。</p>"}</div><div class="status-block"><h3>このあと</h3>${s.upcoming.length?`<ul>${s.upcoming.slice(0,6).map(p=>`<li>${p.start} ${esc(p.title)} ／ ${esc(roomName(p.roomId))}</li>`).join("")}</ul>`:"<p>終了しました。</p>"}</div>`:`<div class="status-block">開催日：${data.eventDate}</div>`;
 $("#programList").innerHTML=s.all.map(p=>`<div class="program-item ${s.current.some(x=>x.id===p.id)?"current":""} ${s.finished.some(x=>x.id===p.id)?"finished":""}"><div class="program-time">${p.start}</div><div><div class="program-title">${esc(p.title)}${s.current.some(x=>x.id===p.id)?'<span class="tag">開催中</span>':""}</div><div class="program-place">${esc(roomName(p.roomId))} · ${p.start}–${p.end}</div></div></div>`).join("");
}
function autoSelectMap(){const s=nowState(),p=s.current[0]||s.upcoming[0];if(p&&room(p.roomId)?.mapId)selectedMapId=room(p.roomId).mapId;renderMap()}
function campusZone(id){return{id,name:id==="zenki"?"前期課程棟":id==="koki"?"後期課程棟":id==="gym"?"体育館":"駐車場",x:id==="zenki"?55.4:id==="koki"?14.2:id==="gym"?33.3:10.8,y:id==="zenki"?39:id==="koki"?39:id==="gym"?71.9:14.6,w:id==="zenki"?30:id==="koki"?30:id==="gym"?33.4:78.4,h:id==="parking"?16.5:id==="gym"?20.7:27}}
function renderMap(){
 const s=nowState(),m=data.maps.find(x=>x.id===selectedMapId)||data.maps[0];
 $("#mapTabs").innerHTML=data.maps.map(x=>`<button class="${x.id===m.id?"active":""}" data-map="${x.id}">${esc(x.name)}</button>`).join("");
 $("#mapImage").src=m.image;
 const cur=[],next=[];
 function add(list,target){
  list.forEach(p=>{const r=room(p.roomId);if(!r)return;
   if(m.id==="campus"){if(!r.campusGroup)return;const z=campusZone(r.campusGroup);target.push({...z,label:p.title});}
   else if(r.mapId===m.id)target.push({...r,label:p.title});
  });
 }
 add(s.current,cur);add(s.upcoming.slice(0,5),next);
 const curIds=new Set(cur.map(z=>z.id));
 $("#mapOverlay").innerHTML=cur.map(z=>`<div class="map-zone now" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%"><span class="zone-label">${esc(z.name)}<br>${esc(z.label)}</span></div>`).join("")+next.filter(z=>!curIds.has(z.id)).map(z=>`<div class="map-zone next" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%"><span class="zone-label">${esc(z.name)}<br>${esc(z.label)}</span></div>`).join("");
 $("#mapStatus").innerHTML=s.current.length?`<b>現在開催中</b><br>${s.current.map(p=>`${esc(p.title)} → ${esc(roomName(p.roomId))}`).join("<br>")}`:`<b>現在開催中のプログラムはありません。</b>`;
}
$("#mapTabs").onclick=e=>{const b=e.target.closest("[data-map]");if(b){selectedMapId=b.dataset.map;renderMap()}};

function got(){try{return JSON.parse(localStorage.getItem(STAMP_KEY)||"[]")}catch{return[]}}
function renderStamps(){const a=got();$("#stampList").innerHTML=data.stamps.map(s=>`<div class="stamp-card ${a.includes(s.id)?"got":""}"><div class="stamp-icon">⭐</div><h3>STAMP ${s.id}</h3><div>${a.includes(s.id)?"GET!":"未獲得"}</div><button class="hint-btn" data-h="${s.id}">ヒントを見る</button><p id="hint${s.id}" class="hint hidden">${esc(s.hint)}</p></div>`).join("");$("#stampCount").textContent=`${a.length} / 5 スタンプ`;$("#stampProgress").style.width=`${a.length/5*100}%`;$("#completeBox").classList.toggle("hidden",a.length<5)}
$("#stampList").onclick=e=>{if(e.target.dataset.h)$("#hint"+e.target.dataset.h).classList.toggle("hidden")};$("#resetStamps").onclick=()=>{if(confirm("リセットしますか？")){localStorage.removeItem(STAMP_KEY);renderStamps()}};
function renderMovies(){$("#movieList").innerHTML=data.movies.map(m=>`<article class="movie-card"><h3>${esc(m.title)}</h3><p>${esc(m.description||"")}</p><a href="${attr(m.url||"#")}" target="_blank" rel="noopener">動画を見る</a></article>`).join("")}
function renderGallery(){$("#galleryGrid").innerHTML=data.posters.map((p,i)=>`<button class="poster" data-i="${i}"><img src="${attr(p.src)}"><span>${esc(p.title)}</span></button>`).join("")}
$("#galleryGrid").onclick=e=>{const b=e.target.closest(".poster");if(!b)return;const p=data.posters[+b.dataset.i];$("#dialogImage").src=p.src;$("#dialogCaption").textContent=p.title;$("#imageDialog").showModal()};$("#closeImageDialog").onclick=()=>$("#imageDialog").close();

function renderAll(){renderHome();renderProgram();renderMap();renderStamps();renderMovies();renderGallery()}
const stampParam=Number(new URLSearchParams(location.search).get("stamp"));if(stampParam>=1&&stampParam<=5){const a=got();if(!a.includes(stampParam)){a.push(stampParam);localStorage.setItem(STAMP_KEY,JSON.stringify(a))}}

$("#adminOpenBtn").onclick=()=>{$("#loginPassword").value="";$("#loginError").textContent="";$("#loginDialog").showModal()};$("#loginCancel").onclick=()=>$("#loginDialog").close();$("#loginForm").onsubmit=e=>{e.preventDefault();if($("#loginPassword").value===ADMIN_PASSWORD){$("#loginDialog").close();populateAdmin();showPage("admin")}else $("#loginError").textContent="パスワードが違います。"};
$("#logoutAdmin").onclick=()=>showPage("home");$$(".admin-nav button").forEach(b=>b.onclick=()=>{$$(".admin-nav button").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".admin-tab").forEach(x=>x.classList.remove("active"));$("#admin-"+b.dataset.adminTab).classList.add("active")});
function roomOptions(sel){return data.rooms.map(r=>`<option value="${r.id}" ${r.id===sel?"selected":""}>${esc(r.name)}</option>`).join("")}
function populateAdmin(){$("#aYear").value=data.year;$("#aDate").value=data.eventDate;$("#aNotice").value=data.notice;$("#aPreviewEnabled").checked=!!data.previewEnabled;{
  const pv=(data.previewDateTime||`${data.eventDate}T09:25`).split("T");
  $("#aPreviewDate").value=pv[0]||data.eventDate;
  $("#aPreviewTime").value=(pv[1]||"09:25").slice(0,5);
  const [hh,mm]=($("#aPreviewTime").value||"09:25").split(":").map(Number);
  $("#aPreviewRange").value=hh*60+mm;
  $("#aPreviewClockLabel").textContent=$("#aPreviewTime").value;
}renderAdminPrograms();renderAdminStamps();renderAdminMovies();renderAdminPosters()}
function renderAdminPrograms(){$("#adminProgramRows").innerHTML=data.program.map((p,i)=>`<div class="admin-row" data-type="program"><label>開始<input class="p-start" type="time" value="${p.start}"></label><label>終了<input class="p-end" type="time" value="${p.end}"></label><label class="wide">内容<input class="p-title" value="${attr(p.title)}"></label><label class="wide">場所<select class="p-room">${roomOptions(p.roomId)}</select></label><div class="row-actions"><button class="move-btn" data-up="${i}">↑</button><button class="move-btn" data-down="${i}">↓</button><button class="remove-btn" data-rp="${i}">削除</button></div></div>`).join("")}
function renderAdminStamps(){$("#adminStampRows").innerHTML=data.stamps.map((s,i)=>`<div class="admin-row" data-type="stamp"><label>番号<input value="${s.id}" disabled></label><label class="wide">ヒント<input class="s-hint" value="${attr(s.hint)}"></label><label class="wide">獲得時メッセージ<input class="s-msg" value="${attr(s.message)}"></label></div>`).join("")}
function renderAdminMovies(){$("#adminMovieRows").innerHTML=data.movies.map((m,i)=>`<div class="admin-row" data-type="movie"><label class="wide">タイトル<input class="m-title" value="${attr(m.title)}"></label><label class="wide">説明<input class="m-desc" value="${attr(m.description||"")}"></label><label class="wide">URL<input class="m-url" value="${attr(m.url||"")}"></label><div class="row-actions"><button class="remove-btn" data-rm="${i}">削除</button></div></div>`).join("")}
function renderAdminPosters(){$("#adminPosterRows").innerHTML=data.posters.map((p,i)=>`<div class="admin-row"><label class="wide">タイトル<input value="${attr(p.title)}" disabled></label><label class="wide">画像URL<input value="${attr(p.src)}" disabled></label><div class="row-actions"><button class="remove-btn" data-rg="${i}">削除</button></div></div>`).join("")}
function syncAdmin(){data.year=$("#aYear").value;data.eventDate=$("#aDate").value;data.notice=$("#aNotice").value;data.previewEnabled=$("#aPreviewEnabled").checked;data.previewDateTime=($("#aPreviewDate").value||data.eventDate)+"T"+($("#aPreviewTime").value||"09:25");data.program=[...$$('[data-type="program"]')].map((r,i)=>({id:data.program[i]?.id||Date.now()+i,start:r.querySelector(".p-start").value,end:r.querySelector(".p-end").value,title:r.querySelector(".p-title").value,roomId:r.querySelector(".p-room").value}));data.stamps=[...$$('[data-type="stamp"]')].map((r,i)=>({id:i+1,hint:r.querySelector(".s-hint").value,message:r.querySelector(".s-msg").value}));data.movies=[...$$('[data-type="movie"]')].map(r=>({title:r.querySelector(".m-title").value,description:r.querySelector(".m-desc").value,url:r.querySelector(".m-url").value}))}
$("#saveAdmin").onclick=async()=>{syncAdmin();await saveConfig();renderAll();alert(firebaseReady?"Firebaseへ保存しました。":"この端末に保存しました。")};
$("#addProgram").onclick=()=>{syncAdmin();data.program.push({id:Date.now(),start:"15:00",end:"15:10",title:"新しいプログラム",roomId:"gym"});renderAdminPrograms()};$("#addMovie").onclick=()=>{syncAdmin();data.movies.push({title:"新しい動画",description:"",url:"#"});renderAdminMovies()};
document.addEventListener("click",e=>{if(e.target.dataset.testMinute!==undefined){
  $("#aPreviewEnabled").checked=true;
  const n=+e.target.dataset.testMinute, h=String(Math.floor(n/60)).padStart(2,"0"), m=String(n%60).padStart(2,"0");
  $("#aPreviewTime").value=`${h}:${m}`; $("#aPreviewRange").value=n; $("#aPreviewClockLabel").textContent=`${h}:${m}`;
}
if(e.target.dataset.rp!==undefined){syncAdmin();data.program.splice(+e.target.dataset.rp,1);renderAdminPrograms()}if(e.target.dataset.rm!==undefined){syncAdmin();data.movies.splice(+e.target.dataset.rm,1);renderAdminMovies()}if(e.target.dataset.rg!==undefined){data.posters.splice(+e.target.dataset.rg,1);renderAdminPosters()}if(e.target.dataset.up!==undefined){syncAdmin();let i=+e.target.dataset.up;if(i>0)[data.program[i-1],data.program[i]]=[data.program[i],data.program[i-1]];renderAdminPrograms()}if(e.target.dataset.down!==undefined){syncAdmin();let i=+e.target.dataset.down;if(i<data.program.length-1)[data.program[i+1],data.program[i]]=[data.program[i],data.program[i+1]];renderAdminPrograms()}});
$("#uploadPoster").onclick=async()=>{const f=$("#posterUploadFile").files[0],title=$("#posterUploadTitle").value||f?.name;if(!f){$("#uploadStatus").textContent="画像ファイルを選択してください。";return}if(!firebaseReady){$("#uploadStatus").textContent="Firebase未設定です。firebase-config.js を設定してください。";return}try{$("#uploadStatus").textContent="アップロード中…";const ref=storage.ref().child(`ofes/posters/${data.year}/${Date.now()}_${f.name}`);await ref.put(f);const url=await ref.getDownloadURL();data.posters.push({title,src:url});await saveConfig();renderAdminPosters();renderGallery();$("#posterUploadFile").value="";$("#posterUploadTitle").value="";$("#uploadStatus").textContent="アップロードしました。"}catch(e){console.error(e);$("#uploadStatus").textContent="アップロードに失敗しました。Firebase設定・権限を確認してください。"}};
$("#exportData").onclick=()=>{syncAdmin();const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`OFES_${data.year}.json`;a.click()};$("#importData").onchange=async e=>{try{data=JSON.parse(await e.target.files[0].text());await saveConfig();populateAdmin();renderAll()}catch{alert("読み込めませんでした。")}};$("#resetData").onclick=async()=>{if(confirm("初期設定に戻しますか？")){data=JSON.parse(JSON.stringify(OFES_DEFAULT_DATA));await saveConfig();populateAdmin();renderAll()}};

function syncPreviewControlsFromRange(){
 const n=+$("#aPreviewRange").value,h=String(Math.floor(n/60)).padStart(2,"0"),m=String(n%60).padStart(2,"0");
 $("#aPreviewTime").value=`${h}:${m}`; $("#aPreviewClockLabel").textContent=`${h}:${m}`;
 data.previewEnabled=$("#aPreviewEnabled").checked; data.previewDateTime=($("#aPreviewDate").value||data.eventDate)+`T${h}:${m}`;
 renderAll();
}
$("#aPreviewRange").addEventListener("input",syncPreviewControlsFromRange);
$("#aPreviewTime").addEventListener("input",()=>{const [h,m]=($("#aPreviewTime").value||"00:00").split(":").map(Number);$("#aPreviewRange").value=h*60+m;$("#aPreviewClockLabel").textContent=$("#aPreviewTime").value;syncPreviewControlsFromRange()});
$("#aPreviewDate").addEventListener("change",syncPreviewControlsFromRange);
$("#aPreviewEnabled").addEventListener("change",syncPreviewControlsFromRange);

initBackend(); setInterval(()=>{renderHome();renderProgram();renderMap()},30000);