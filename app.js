const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function showPage(id){$$(".page").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");window.scrollTo({top:0,behavior:"smooth"})}
$$(".menu-card").forEach(b=>b.onclick=()=>showPage(b.dataset.page));$$(".back").forEach(b=>b.onclick=()=>showPage("home"));
$("#noticeText").textContent=OFES_DATA.notice;

function mins(t){const [h,m]=t.split(":").map(Number);return h*60+m}
function renderProgram(){
 const now=new Date(), n=now.getHours()*60+now.getMinutes(); let current=null,next=null;
 $("#programList").innerHTML=OFES_DATA.program.map(p=>{
  const is=n>=mins(p.time)&&n<mins(p.end); if(is) current=p;
  if(!next&&n<mins(p.time)) next=p;
  return `<div class="program-item ${is?"current":""}"><div class="program-time">${p.time}</div><div><div class="program-title">${p.title}${is?'<span class="tag">開催中</span>':""}</div><div class="program-place">${p.place} · ${p.time}–${p.end}</div></div></div>`
 }).join("");
 if(current) $("#nowBox").innerHTML=`<b>ただいま開催中</b><br>${current.title} ／ ${current.place}`;
 else if(next) $("#nowBox").innerHTML=`<b>次の発表</b><br>${next.time} ${next.title} ／ ${next.place}`;
}
renderProgram();

function distance(a,b,c,d){const R=6371000,rad=x=>x*Math.PI/180;const x=rad(c-a),y=rad(d-b);const q=Math.sin(x/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function showPlace(p,extra=""){ $("#placeGuide").classList.remove("hidden");$("#placeGuide").innerHTML=`<h3>${p.name}</h3><p>${p.guide}</p>${extra}` }
$("#manualPlaces").innerHTML=OFES_DATA.places.map((p,i)=>`<button data-i="${i}">${p.name}</button>`).join("");
$("#manualPlaces").onclick=e=>{if(e.target.dataset.i!==undefined)showPlace(OFES_DATA.places[+e.target.dataset.i])};
$("#locateBtn").onclick=()=>{
 const out=$("#locationResult");
 if(!navigator.geolocation){out.textContent="この端末では位置情報を利用できません。";return}
 out.textContent="現在地を確認しています…";
 navigator.geolocation.getCurrentPosition(pos=>{
  const {latitude:lat,longitude:lng,accuracy}=pos.coords;
  const usable=OFES_DATA.places.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  out.innerHTML=`緯度: ${lat.toFixed(6)}<br>経度: ${lng.toFixed(6)}<br>精度の目安: ±${Math.round(accuracy)}m`;
  if(!usable.length){out.innerHTML+=`<br><b>試作品：</b>data.js に各会場の緯度・経度を登録すると会場判定ができます。`;return}
  const ranked=usable.map(p=>({p,d:distance(lat,lng,p.lat,p.lng)})).sort((a,b)=>a.d-b.d);
  const best=ranked[0]; showPlace(best.p,`<p>現在地から約 ${Math.round(best.d)}m</p>`);
 },err=>out.textContent="位置情報を取得できませんでした。位置情報の許可設定をご確認ください。",{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
};

const stampKey="ofes-stamps";
function got(){try{return JSON.parse(localStorage.getItem(stampKey)||"[]")}catch{return []}}
function save(a){localStorage.setItem(stampKey,JSON.stringify([...new Set(a)]))}
function renderStamps(){
 const a=got(), total=OFES_DATA.stamps.length;
 $("#stampList").innerHTML=OFES_DATA.stamps.map(s=>`<div class="stamp-card ${a.includes(s.id)?"got":""}"><div class="stamp-icon">⭐</div><h3>STAMP ${s.id}</h3><div>${a.includes(s.id)?"GET!":"未獲得"}</div><button class="hint-btn" data-h="${s.id}">ヒントを見る</button><p id="hint${s.id}" class="hint hidden">${s.hint}</p></div>`).join("");
 $("#stampCount").textContent=`${a.length} / ${total} スタンプ`;
 $("#stampProgress").style.width=`${total?a.length/total*100:0}%`;
 $("#completeBox").classList.toggle("hidden",a.length<total);
}
$("#stampList").onclick=e=>{if(e.target.dataset.h){$("#hint"+e.target.dataset.h).classList.toggle("hidden")}};
$("#resetStamps").onclick=()=>{if(confirm("試作用スタンプをすべてリセットしますか？")){localStorage.removeItem(stampKey);renderStamps()}};
const stampParam=Number(new URLSearchParams(location.search).get("stamp"));
if(OFES_DATA.stamps.some(s=>s.id===stampParam)){const a=got();if(!a.includes(stampParam)){a.push(stampParam);save(a);setTimeout(()=>{showPage("stamp");alert(`STAMP ${stampParam} GET!`)},150)}}
renderStamps();

$("#movieList").innerHTML=OFES_DATA.movies.map(m=>`<article class="movie-card"><h3>${m.title}</h3><p>${m.description}</p><a href="${m.url}" ${m.url==="#"?'onclick="event.preventDefault();alert(\'data.js にYouTube URLを設定してください。\')"':'target="_blank" rel="noopener"'}>動画を見る</a></article>`).join("");

$("#galleryGrid").innerHTML=OFES_DATA.posters.map((p,i)=>`<button class="poster" data-i="${i}"><img src="${p.src}" alt="${p.title}"><span>${p.title}</span></button>`).join("");
$("#galleryGrid").onclick=e=>{const b=e.target.closest(".poster");if(!b)return;const p=OFES_DATA.posters[+b.dataset.i];$("#dialogImage").src=p.src;$("#dialogCaption").textContent=p.title;$("#imageDialog").showModal()};
$("#closeDialog").onclick=()=>$("#imageDialog").close();$("#imageDialog").onclick=e=>{if(e.target===$("#imageDialog"))$("#imageDialog").close()};
