"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const MAPS = [
 {id:'campus', name:'学校全体図', src:'assets/maps/campus.svg', prefix:'A', building:'campus'},
 {id:'zenki1', name:'前期棟1F', src:'assets/maps/zenki1.svg', prefix:'Z1', building:'zenki',floor:1},
 {id:'zenki2', name:'前期棟2F', src:'assets/maps/zenki2.svg', prefix:'Z2', building:'zenki',floor:2},
 {id:'koki1', name:'後期棟1F', src:'assets/maps/koki1.svg', prefix:'K1', building:'koki',floor:1},
 {id:'koki2', name:'後期棟2F', src:'assets/maps/koki2.svg', prefix:'K2', building:'koki',floor:2},
 {id:'koki3', name:'後期棟3F', src:'assets/maps/koki3.svg', prefix:'K3', building:'koki',floor:3}
];
const STORAGE_KEY='ofes-prototype-v08';
const STAMP_KEY='ofes-stamp-v08';
// 試作版の画面ロックのみ。Firebaseの安全な認証には使用しない。
const DEMO_ADMIN_PASSWORD='ofes0034';
const DEFAULT_DATA = {
 year:'2026', eventDate:'2026-11-21', slogan:'挑戦・協働・創造',
 test:{enabled:true,date:'2026-11-21',time:'09:25'},
 zones:[],nextIds:{campus:1,zenki1:1,zenki2:1,koki1:1,koki2:1,koki3:1},
 programs:[
  {id:'p1',session:'other',start:'08:45',end:'09:05',title:'開会行事・アトラクション',zoneId:''},
  {id:'p2',session:'s1',start:'09:20',end:'09:40',title:'セッション①（発表内容を登録）',zoneId:''},
  {id:'p3',session:'s2',start:'09:50',end:'10:10',title:'セッション②（発表内容を登録）',zoneId:''},
  {id:'p4',session:'s3',start:'10:20',end:'10:40',title:'セッション③（発表内容を登録）',zoneId:''},
  {id:'p5',session:'s4',start:'10:50',end:'11:10',title:'セッション④（発表内容を登録）',zoneId:''},
  {id:'p6',session:'afternoon',start:'13:32',end:'13:38',title:'午後のステージ発表（仮）',zoneId:''}
 ]
};
const clone = (v)=>JSON.parse(JSON.stringify(v));
const esc = (v)=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const byId=(id)=>document.getElementById(id);
function getSaved(){try {const a=localStorage.getItem(STORAGE_KEY);return a?validData(JSON.parse(a)):clone(DEFAULT_DATA)}catch(e){console.warn(e);return clone(DEFAULT_DATA)}}
function validData(v){
 if(!v || typeof v!=='object'||!Array.isArray(v.zones)||!Array.isArray(v.programs))throw Error('データ形式が不正です');
 const out={...clone(DEFAULT_DATA), ...v};
 out.zones=v.zones.filter(z=>z && typeof z.id==='string' && MAPS.some(m=>m.id===z.mapId)).map(z=>({id:z.id,mapId:z.mapId,name:String(z.name||'会場'),note:String(z.note||''),kind:String(z.kind||'classroom'),x:bound(z.x,0,100),y:bound(z.y,0,100),w:bound(z.w,.1,100),h:bound(z.h,.1,100)}));
 out.programs=v.programs.filter(p=>p&&typeof p.id==='string').map(p=>({id:p.id,session:String(p.session||'other'),start:String(p.start||'09:00'),end:String(p.end||'09:20'),title:String(p.title||'発表'),zoneId:String(p.zoneId||'')}));
 out.nextIds={...clone(DEFAULT_DATA.nextIds),...(v.nextIds||{})};
 out.test={...clone(DEFAULT_DATA.test),...(v.test||{})};
 delete out.gallery; // Legacy backups may still contain gallery data; ignore it.
 return out;
}
function bound(v,a,b){const n=Number(v);return Number.isFinite(n)?Math.max(a,Math.min(b,n)):a}
let state=getSaved();
let visitorBuilding='campus',session='current',visitorSelected='';
const visitorZoom=Object.fromEntries(MAPS.map(m=>[m.id,100]));
let adminMap='campus',editId='',editDraft=null,drawMode='',dragStart=null,dragRect=null;
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true}catch(e){alert('ブラウザに保存できませんでした。容量・設定をご確認ください。');return false}}
function toast(msg){byId('saveToast').textContent=msg;}
function getZone(id){return state.zones.find(z=>z.id===id)}
function getMap(id){return MAPS.find(m=>m.id===id)||MAPS[0]}
function timeNum(t){const [h,m]=String(t).split(':').map(Number);return h*60+m}
function dateISO(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${dd}`}
function viewTime(){if(state.test.enabled){return {date:state.test.date,time:state.test.time,minute:timeNum(state.test.time),demo:true}}
 const d=new Date();return{date:dateISO(d),time:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,minute:d.getHours()*60+d.getMinutes(),demo:false};}
function activePrograms(){const t=viewTime();return state.programs.filter(p=>t.date===state.eventDate && timeNum(p.start)<=t.minute && t.minute<timeNum(p.end))}
function scheduledPrograms(){if(session==='current')return activePrograms();return state.programs.filter(p=>p.session===session)}
function orderedPrograms(){return [...state.programs].sort((a,b)=>timeNum(a.start)-timeNum(b.start)||String(a.id).localeCompare(b.id))}
function roomLabel(p){return getZone(p.zoneId)?.name||'会場未登録'}
function renderHeader(){
 byId('heroYear').textContent=state.year;
 byId('heroSlogan').textContent=state.slogan;
 const today=new Date(),end=new Date(state.eventDate+'T00:00:00'), start=new Date(dateISO(today)+'T00:00:00');
 const dif=Math.round((end.getTime()-start.getTime())/86400000);
 byId('countdown').textContent=dif>0?`開催まであと ${dif} 日`:dif===0?'いよいよ本日！':'今年のおおフェスは終了しました';
 const v=viewTime();byId('previewTag').hidden=!v.demo;byId('previewTag').textContent=`TEST ${v.date} ${v.time}`;
}
function setTab(tab,opts={}){$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$$('.tab-view').forEach(v=>v.classList.toggle('active',v.id===`tab-${tab}`));if(tab==='venues')renderVisitorMap();if(opts.scrollTop!==false)window.scrollTo({top:0,behavior:'smooth'});}
$$('.nav').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function renderProgram(){
 const v=viewTime(),active=activePrograms();let text=`現在の判定時刻：<strong>${esc(v.date)} ${esc(v.time)}</strong>`;
 if(v.date!==state.eventDate)text+='　<span class="muted">開催日以外のため、開催中のプログラムはありません。</span>';
 else text+=active.length?`<br>ただいま開催中：${active.map(p=>esc(p.title)).join('・')}`:'<br>現在開催中のプログラムはありません。';
 byId('timeStatus').innerHTML=text;
 byId('programList').innerHTML=orderedPrograms().map(p=>`<div class="program-row ${active.some(x=>x.id===p.id)?'on':''}">
 <div class="time">${esc(p.start)}</div><div><strong>${esc(p.title)}</strong>${active.some(x=>x.id===p.id)?'<span class="tag">開催中</span>':''}
 <div class="where">${esc(p.start)}〜${esc(p.end)}　${esc(roomLabel(p))} <button type="button" class="minilink" data-see="${esc(p.zoneId)}" ${p.zoneId?'':'disabled'}>会場を見る</button></div></div></div>`).join('');
 $$('[data-see]').forEach(b=>b.onclick=()=>{
  if(!b.dataset.see)return;
  const z=getZone(b.dataset.see);if(!z)return;
  visitorBuilding=getMap(z.mapId).building;visitorSelected=z.id;session='current';
  setTab('venues',{scrollTop:false});
  requestAnimationFrame(()=>byId(`floor-${z.mapId}`)?.scrollIntoView({behavior:'smooth',block:'start'}));
 });
}
function visibleMaps(){
 if(visitorBuilding==='campus')return MAPS.filter(m=>m.id==='campus');
 return MAPS.filter(m=>m.building===visitorBuilding).sort((a,b)=>b.floor-a.floor);
}
function renderBuildingTabs(){
 $$('#buildingTabs [data-building]').forEach(b=>{
  const active=b.dataset.building===visitorBuilding;
  b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
 });
}
$$('#buildingTabs [data-building]').forEach(b=>b.onclick=()=>{
 visitorBuilding=b.dataset.building;visitorSelected='';renderVisitorMap();
 byId('buildingTabs').scrollIntoView({behavior:'smooth',block:'start'});
});
function renderSessionButtons(){
 const entries=[['current','現在'],['s1','S①'],['s2','S②'],['s3','S③'],['s4','S④']];
 byId('sessionSwitch').innerHTML=entries.map(([id,label])=>`<button data-session="${id}" class="${id===session?'active':''}" aria-pressed="${id===session}">${label}</button>`).join('');
 $$('[data-session]').forEach(b=>b.onclick=()=>{session=b.dataset.session;renderVisitorMap();});
}
function zStyle(z){return `left:${bound(z.x,0,100)}%;top:${bound(z.y,0,100)}%;width:${bound(z.w,.1,100)}%;height:${bound(z.h,.1,100)}%;`}
function zoneHtml(z,active,selected){const label=(z.w<12||z.h<12)?String(z.id).split('-').pop():z.name;return `<button type="button" class="zone ${active?'on':''} ${selected?'selected':''}" style="${zStyle(z)}" data-zone="${esc(z.id)}" title="${esc(z.name)}" aria-label="${esc(z.name)}"><span class="zone-caption">${esc(label)}</span></button>`}
function floorLabel(m){return m.floor?`${m.floor}階`:'学校全体図'}
function floorDetailHtml(m){
 const z=getZone(visitorSelected);
 if(!z||z.mapId!==m.id)return '';
 const ps=orderedPrograms().filter(p=>p.zoneId===z.id);
 return `<h4>${esc(z.name)} <span class="pill">${esc(z.id)}</span></h4>${z.note?`<p>${esc(z.note)}</p>`:''}
 <p class="muted">${esc(m.name)}　${ps.length}件のプログラム</p>
 ${ps.length?`<ul>${ps.map(p=>`<li><strong>${esc(p.start)}〜${esc(p.end)}</strong>　${esc(p.title)}</li>`).join('')}</ul>`:'<p>この会場のプログラムはまだ登録されていません。</p>'}
 <p class="caption">リアクションボタンは次の開発段階で追加予定です。</p>`;
}
function updateSelectedFloorDetails(){
 $$('#visitorMaps [data-zone]').forEach(b=>{
  const selected=b.dataset.zone===visitorSelected;
  b.classList.toggle('selected',selected);
 });
 for(const m of visibleMaps()){
  const el=byId(`floor-detail-${m.id}`);if(!el)continue;
  const html=floorDetailHtml(m);
  el.hidden=!html;el.innerHTML=html;
 }
}
// Keep an entire floor map visible without an inner scrollbar at 100%.
// The source SVG proportions are fixed; using their natural aspect ratios also
// keeps all saved percentage-based clickable room coordinates aligned.
const FIT_MAP_RATIOS = {campus:602/1022, zenki1:782/742};
function baseMapWidth(mapId, win){
 const availableWidth=win.clientWidth;
 if(!availableWidth)return 0; // The venues page may currently be hidden.
 const aspect=FIT_MAP_RATIOS[mapId];
 if(!aspect)return availableWidth;
 const maxHeight=Math.min(window.innerHeight*.62,650);
 return Math.min(availableWidth,maxHeight*aspect);
}
function sizeFloorMap(mapId, focus){
 const win=byId(`window-${mapId}`),stage=byId(`stage-${mapId}`),out=byId(`zoom-${mapId}`);
 if(!win||!stage)return;
 const baseWidth=baseMapWidth(mapId,win);
 if(!baseWidth)return;
 const prevWidth=stage.getBoundingClientRect().width||baseWidth;
 const prevScrollLeft=win.scrollLeft,prevScrollTop=win.scrollTop;
 const rect=win.getBoundingClientRect();
 const fx=focus?.clientX??(rect.left+win.clientWidth/2);
 const fy=focus?.clientY??(rect.top+Math.min(win.clientHeight/2,130));
 const localX=fx-rect.left,localY=fy-rect.top;
 const newWidth=baseWidth*(visitorZoom[mapId]/100);
 // Scrollable only when enlarged. At default size there is NO internal scroll.
 win.classList.toggle('is-zoomed',visitorZoom[mapId]>100);
 stage.style.width=`${newWidth}px`;
 if(out)out.textContent=`${visitorZoom[mapId]}%`;
 if(visitorZoom[mapId]===100){win.scrollLeft=0;win.scrollTop=0;return;}
 const scale=newWidth/Math.max(prevWidth,1);
 win.scrollLeft=Math.max(0,(prevScrollLeft+localX)*scale-localX);
 win.scrollTop=Math.max(0,(prevScrollTop+localY)*scale-localY);
}
function updateFloorZoom(mapId, zoom, focus){
 const next=Math.round(bound(zoom,100,275));
 if(next===visitorZoom[mapId])return;
 visitorZoom[mapId]=next;
 sizeFloorMap(mapId,focus);
}
function sizeVisibleFloorMaps(){
 for(const m of visibleMaps())sizeFloorMap(m.id);
}
function enableMapPinch(){
 $$('#visitorMaps .floor-map-window').forEach(win=>{
  let gesture=null;
  const touchDistance=ts=>Math.hypot(ts[0].clientX-ts[1].clientX,ts[0].clientY-ts[1].clientY);
  const center=ts=>({clientX:(ts[0].clientX+ts[1].clientX)/2,clientY:(ts[0].clientY+ts[1].clientY)/2});
  win.addEventListener('touchstart',e=>{
   if(e.touches.length===2){gesture={distance:touchDistance(e.touches),zoom:visitorZoom[win.dataset.map]};}
  },{passive:true});
  win.addEventListener('touchmove',e=>{
   if(e.touches.length!==2||!gesture)return;
   e.preventDefault();
   updateFloorZoom(win.dataset.map,gesture.zoom*touchDistance(e.touches)/Math.max(gesture.distance,1),center(e.touches));
  },{passive:false});
  win.addEventListener('touchend',e=>{if(e.touches.length<2)gesture=null;},{passive:true});
  win.addEventListener('touchcancel',()=>{gesture=null;},{passive:true});
 });
}
function renderVisitorMap(){
 renderBuildingTabs();renderSessionButtons();
 const maps=visibleMaps();
 const programs=scheduledPrograms(),activeIds=new Set(programs.map(p=>p.zoneId).filter(Boolean));
 const count=state.zones.filter(z=>maps.some(m=>m.id===z.mapId)&&activeIds.has(z.id)).length;
 const buildingName={campus:'学校全体',zenki:'前期棟',koki:'後期棟'}[visitorBuilding];
 byId('mapSummary').textContent=session==='current'?`現在：${viewTime().time}　${buildingName}で使用中の会場：${count}か所`:`セッション${{s1:'①',s2:'②',s3:'③',s4:'④'}[session]}　${buildingName}で使用する会場：${count}か所`;
 byId('visitorMaps').innerHTML=maps.map(m=>{
  const zones=state.zones.filter(z=>z.mapId===m.id),floorCount=zones.filter(z=>activeIds.has(z.id)).length;
  return `<article class="floor-card" id="floor-${esc(m.id)}">
   <div class="floor-card-header"><div><h3>${esc(floorLabel(m))}</h3><span class="floor-subtitle">${esc(m.name)}</span></div><span class="floor-count">${floorCount}か所 使用</span></div>
   <div class="floor-tools"><span>図を拡大して会場をタップ</span><div class="floor-zoom"><button type="button" data-zoom-map="${m.id}" data-zoom-action="out" aria-label="${esc(m.name)}を縮小">−</button><span id="zoom-${m.id}">${visitorZoom[m.id]}%</span><button type="button" data-zoom-map="${m.id}" data-zoom-action="in" aria-label="${esc(m.name)}を拡大">＋</button><button type="button" class="zoom-reset" data-zoom-map="${m.id}" data-zoom-action="reset">戻す</button></div></div>
   <div class="floor-map-window" id="window-${m.id}" data-map="${m.id}">
    <div class="map-stage" id="stage-${m.id}" style="width:${visitorZoom[m.id]}%">
     <img src="${esc(m.src)}" draggable="false" alt="${esc(m.name)}">
     <div class="map-zone-layer">${zones.map(z=>zoneHtml(z,activeIds.has(z.id),z.id===visitorSelected)).join('')}</div>
    </div>
   </div>
   <div class="floor-detail" id="floor-detail-${m.id}" hidden></div>
  </article>`;
 }).join('');
 byId('visitorMaps').querySelectorAll('[data-zone]').forEach(b=>b.addEventListener('click',()=>{
  visitorSelected=b.dataset.zone;
  updateSelectedFloorDetails();
  const detail=byId(`floor-detail-${getZone(visitorSelected)?.mapId}`);
  if(detail && !detail.hidden){detail.scrollIntoView({behavior:'smooth',block:'nearest'});}
 }));
 byId('visitorMaps').querySelectorAll('[data-zoom-map]').forEach(b=>b.addEventListener('click',()=>{
  const m=b.dataset.zoomMap,a=b.dataset.zoomAction;
  updateFloorZoom(m,a==='reset'?100:visitorZoom[m]+(a==='in'?25:-25));
 }));
 enableMapPinch();sizeVisibleFloorMaps();updateSelectedFloorDetails();
}
function stampList(){try{return JSON.parse(localStorage.getItem(STAMP_KEY)||'[]')}catch{return[]}}
function renderStamps(){const a=stampList();byId('stampProgress').textContent=`獲得スタンプ：${a.length} / 5`;
 byId('stampCards').innerHTML=[1,2,3,4,5].map(i=>`<div class="stamp-item ${a.includes(i)?'got':''}"><div class="star">⭐</div><b>STAMP ${i}</b><small>${a.includes(i)?'取得済み':'未取得'}</small></div>`).join('');}
function readStampFromUrl(){const v=new URLSearchParams(location.search).get('stamp'), n=Number(v);if(!Number.isInteger(n)||n<1||n>5)return;
 const current=stampList();if(!current.includes(n)){current.push(n);localStorage.setItem(STAMP_KEY,JSON.stringify(current));}
 renderStamps();setTab('stamp');}
function renderPublic(){renderHeader();renderProgram();renderVisitorMap();renderStamps();}

// 管理画面へのアクセスはブラウザ試作用の簡易パスワード。外部の書込権限には用いない。
byId('openAdmin').onclick=()=>{byId('loginModal').hidden=false;byId('adminPassword').value='';byId('loginError').textContent='';byId('adminPassword').focus()};
byId('cancelLogin').onclick=()=>byId('loginModal').hidden=true;
byId('loginForm').onsubmit=e=>{e.preventDefault();if(byId('adminPassword').value!==DEMO_ADMIN_PASSWORD){byId('loginError').textContent='パスワードが違います。';return}
 byId('loginModal').hidden=true;byId('adminPanel').hidden=false;renderAdmin();};
byId('closeAdmin').onclick=()=>{byId('adminPanel').hidden=true;drawMode='';renderPublic()};
$$('#adminNav button').forEach(b=>b.onclick=()=>{const t=b.dataset.admin;$$('#adminNav button').forEach(x=>x.classList.toggle('active',x===b));$$('.admin-page').forEach(x=>x.classList.toggle('active',x.id===`admin-${t}`));if(t==='venues')renderEditor();if(t==='program')renderAdminPrograms();if(t==='basic')renderBasic();});
function renderAdmin(){byId('adminMapSelect').innerHTML=MAPS.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');byId('adminMapSelect').value=adminMap;renderEditor();renderAdminPrograms();renderBasic();}
byId('adminMapSelect').onchange=e=>{adminMap=e.target.value;editId='';editDraft=null;drawMode='';renderEditor()};
function renderEditor(){
 const m=getMap(adminMap);byId('adminMapSelect').value=adminMap;byId('adminMapImage').src=m.src;byId('adminMapImage').alt=m.name;
 const stage=byId('adminStage');stage.classList.toggle('drawing',Boolean(drawMode));
 byId('drawGuide').textContent=drawMode?`${drawMode==='new'?'新しい会場':'位置の再指定'}：図面上で教室の枠をドラッグして囲んでください。`:'登録済みの会場をタップすると、名前や位置を編集できます。';
 const zones=state.zones.filter(z=>z.mapId===adminMap);
 byId('adminZoneLayer').innerHTML=zones.map(z=>zoneHtml(z,false,z.id===editId)).join('')+(editDraft&&editDraft.mapId===adminMap&&!zones.some(z=>z.id===editDraft.id)?zoneHtml(editDraft,false,true):'');
 $$('#adminZoneLayer [data-zone]').forEach(el=>{el.onclick=()=>selectZone(el.dataset.zone);});
 byId('mapZoneList').innerHTML=zones.length?zones.map(z=>`<button type="button" class="${z.id===editId?'current':''}" data-list-zone="${esc(z.id)}"><b>${esc(z.name)}</b><small>${esc(z.id)}</small></button>`).join(''):'<p class="muted">まだ登録はありません。</p>';
 $$('[data-list-zone]').forEach(b=>b.onclick=()=>selectZone(b.dataset.listZone));
 renderEditForm();
}
function selectZone(id){const z=getZone(id);if(!z)return;drawMode='';editDraft=clone(z);editId=z.id;renderEditor()}
function renderEditForm(){const v=editDraft;
 byId('venueForm').hidden=!v;byId('emptyVenueNote').hidden=!!v;
 if(!v)return;
 byId('zoneId').value=v.id;byId('zoneName').value=v.name;byId('zoneNote').value=v.note||'';byId('zoneKind').value=v.kind||'classroom';
 for(const [k,el] of [['x','zoneX'],['y','zoneY'],['w','zoneW'],['h','zoneH']])byId(el).value=Number(v[k]).toFixed(1);
 byId('deleteVenue').disabled=!getZone(v.id);
 byId('redrawVenue').disabled=false;
}
function newId(mapId){const map=getMap(mapId);const next=Math.max(1,Number(state.nextIds[mapId])||1);const id=map.prefix+'-'+String(next).padStart(2,'0');state.nextIds[mapId]=next+1;return id}
byId('newVenue').onclick=()=>{editId='';editDraft=null;drawMode='new';renderEditor()};
byId('redrawVenue').onclick=()=>{if(!editDraft){toast('先に会場を選んでください');return;}drawMode='redraw';renderEditor()};
byId('cancelDrawing').onclick=()=>{drawMode='';editDraft=null;editId='';renderEditor()};
const drawLayer=byId('drawLayer');
function pointOf(e){const box=byId('adminStage').getBoundingClientRect();return {x:bound((e.clientX-box.left)/box.width*100,0,100),y:bound((e.clientY-box.top)/box.height*100,0,100)}}
function rectFrom(a,b){let x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);return{x:+x.toFixed(2),y:+y.toFixed(2),w:+w.toFixed(2),h:+h.toFixed(2)}}
function drawPreview(rect){drawLayer.innerHTML=`<div class="draw-preview" style="${zStyle(rect)}"></div>`}
drawLayer.addEventListener('pointerdown',e=>{if(!drawMode)return;e.preventDefault();dragStart=pointOf(e);dragRect=null;drawLayer.setPointerCapture(e.pointerId);drawPreview({...dragStart,w:.1,h:.1});});
drawLayer.addEventListener('pointermove',e=>{if(!dragStart)return;e.preventDefault();dragRect=rectFrom(dragStart,pointOf(e));drawPreview(dragRect);});
function finishDraw(e){if(!dragStart)return;const r=rectFrom(dragStart,pointOf(e));dragStart=null;drawLayer.innerHTML='';if(r.w<.9||r.h<.9){toast('枠をもう少し大きくドラッグしてください');return}
 if(drawMode==='new'){editDraft={id:newId(adminMap),mapId:adminMap,name:'新しい会場',note:'',kind:'classroom',...r};editId='';}
 else if(drawMode==='redraw'&&editDraft){Object.assign(editDraft,r)}
 drawMode='';renderEditor();toast('位置を指定しました。会場名を入力して保存してください。');}
drawLayer.addEventListener('pointerup',finishDraw);
drawLayer.addEventListener('pointercancel',()=>{dragStart=null;drawLayer.innerHTML=''});
function readVenueForm(){if(!editDraft)return null;
 const r={...editDraft,name:byId('zoneName').value.trim(),note:byId('zoneNote').value.trim(),kind:byId('zoneKind').value};
 for(const [k,el] of [['x','zoneX'],['y','zoneY'],['w','zoneW'],['h','zoneH']])r[k]=bound(byId(el).value,k==='w'||k==='h'?.1:0,100);
 if(r.x+r.w>100)r.w=+(100-r.x).toFixed(2);if(r.y+r.h>100)r.h=+(100-r.y).toFixed(2);
 if(!r.name||r.w<.1||r.h<.1)return null;return r;}
byId('venueForm').onsubmit=e=>{e.preventDefault();const r=readVenueForm();if(!r){alert('会場名と位置・サイズを確認してください。');return;}
 const idx=state.zones.findIndex(z=>z.id===r.id);if(idx>=0)state.zones[idx]=r;else state.zones.push(r);
 persist();editId=r.id;editDraft=clone(r);renderEditor();renderAdminPrograms();renderPublic();toast(`${r.name} を保存しました`);};
byId('deleteVenue').onclick=()=>{const z=getZone(editDraft?.id);if(!z||!confirm(`「${z.name}」を削除しますか？この会場に割り当てられたプログラムの会場は未設定になります。`))return;
 state.zones=state.zones.filter(x=>x.id!==z.id);state.programs.forEach(p=>{if(p.zoneId===z.id)p.zoneId=''});editId='';editDraft=null;persist();renderEditor();renderAdminPrograms();renderPublic();toast('削除しました');};
for(const id of ['zoneX','zoneY','zoneW','zoneH'])byId(id).addEventListener('input',()=>{if(!editDraft)return;const r=readVenueForm();if(!r)return;Object.assign(editDraft,r);renderZoneGeometryOnly();});
function renderZoneGeometryOnly(){const layer=byId('adminZoneLayer');const active=layer.querySelector(`.zone.selected`);if(active&&editDraft)active.style.cssText=zStyle(editDraft);}
byId('attachDemo').onclick=()=>{const r=readVenueForm();if(!r)return alert('先に会場名・位置を入力してください。');
 const idx=state.zones.findIndex(x=>x.id===r.id);if(idx>=0)state.zones[idx]=r;else state.zones.push(r);
 const p=state.programs.find(x=>x.session==='s1');if(p)p.zoneId=r.id;
 persist();editId=r.id;editDraft=clone(r);state.test.enabled=true;state.test.date=state.eventDate;state.test.time='09:25';renderAdmin();renderPublic();toast('セッション①（09:25）の表示テストを設定しました');};

function roomOptions(sel){return `<option value="">（会場未登録）</option>`+state.zones.map(z=>`<option value="${esc(z.id)}" ${z.id===sel?'selected':''}>${esc(z.id)}｜${esc(z.name)}</option>`).join('')}
function renderAdminPrograms(){byId('adminPrograms').innerHTML=`<div class="admin-program-list">${orderedPrograms().map(p=>`<div class="admin-program-row" data-program="${esc(p.id)}">
 <label>開始<input type="time" data-pfield="start" value="${esc(p.start)}"></label><label>終了<input type="time" data-pfield="end" value="${esc(p.end)}"></label>
 <label>内容<input data-pfield="title" maxlength="120" value="${esc(p.title)}"></label>
 <label>会場<select data-pfield="zoneId">${roomOptions(p.zoneId)}</select></label>
 <label>区分<select data-pfield="session"><option value="s1" ${p.session==='s1'?'selected':''}>セッション①</option><option value="s2" ${p.session==='s2'?'selected':''}>セッション②</option><option value="s3" ${p.session==='s3'?'selected':''}>セッション③</option><option value="s4" ${p.session==='s4'?'selected':''}>セッション④</option><option value="other" ${p.session==='other'?'selected':''}>その他</option><option value="afternoon" ${p.session==='afternoon'?'selected':''}>午後</option></select></label>
 <button class="btn danger" data-del-program="${esc(p.id)}">削除</button></div>`).join('')}</div>`;
 $$('[data-pfield]').forEach(el=>el.addEventListener('change',e=>{const row=e.target.closest('[data-program]'),p=state.programs.find(x=>x.id===row.dataset.program);if(!p)return;p[e.target.dataset.pfield]=e.target.value;persist();renderPublic();toast('プログラムを保存しました')}));
 $$('[data-del-program]').forEach(el=>el.onclick=()=>{if(!confirm('このプログラムを削除しますか？'))return;state.programs=state.programs.filter(p=>p.id!==el.dataset.delProgram);persist();renderAdminPrograms();renderPublic()});
}
byId('addProgram').onclick=()=>{state.programs.push({id:'p'+Date.now(),session:'s1',start:'09:20',end:'09:40',title:'新しい発表',zoneId:''});persist();renderAdminPrograms();renderPublic()};
function renderBasic(){byId('settingYear').value=state.year;byId('settingDate').value=state.eventDate;byId('settingSlogan').value=state.slogan;
 byId('testEnabled').checked=!!state.test.enabled;byId('testDate').value=state.test.date;byId('testTime').value=state.test.time;byId('testSlider').value=timeNum(state.test.time);byId('testTimeText').textContent=state.test.time;}
byId('saveBasic').onclick=()=>{const year=byId('settingYear').value.trim(),date=byId('settingDate').value;if(!year||!date)return alert('年度と開催日を入力してください');
 state.year=year;state.eventDate=date;state.slogan=byId('settingSlogan').value.trim();persist();renderPublic();toast('年度設定を保存しました');};
function updateTest(){state.test.enabled=byId('testEnabled').checked;state.test.date=byId('testDate').value||state.eventDate;state.test.time=byId('testTime').value||'09:25';
 byId('testTimeText').textContent=state.test.time;byId('testSlider').value=timeNum(state.test.time);persist();renderPublic();}
byId('testEnabled').onchange=updateTest;byId('testDate').onchange=updateTest;byId('testTime').oninput=updateTest;
byId('testSlider').oninput=e=>{const n=Number(e.target.value);byId('testTime').value=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;byId('testEnabled').checked=true;updateTest();};
$$('[data-quick]').forEach(b=>b.onclick=()=>{byId('testTime').value=b.dataset.quick;byId('testDate').value=state.eventDate;byId('testEnabled').checked=true;updateTest();});
byId('exportJson').onclick=()=>{const blob=new Blob([JSON.stringify({version:9,data:state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`OFES_${state.year}_backup.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);};
byId('importJson').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const parsed=JSON.parse(await f.text());const next=validData(parsed.data||parsed);if(!confirm('現在の設定を読み込んだデータで置き換えますか？'))return;state=next;persist();adminMap='campus';editId='';editDraft=null;renderAdmin();renderPublic();toast('読み込みました')}catch(error){console.error(error);alert('JSON形式を確認してください。')}finally{e.target.value=''}};
byId('resetAll').onclick=()=>{if(!confirm('登録した会場・プログラムなどの試作データをすべて初期化しますか？'))return;state=clone(DEFAULT_DATA);persist();adminMap='campus';editId='';editDraft=null;renderAdmin();renderPublic();toast('初期化しました')};
renderPublic();readStampFromUrl();
// 外部SDKが読み込めない場合も、接続タブで理由が分かるようにする。
setTimeout(()=>{
 const node=byId('firebaseSdkStatus');
 if(node && node.textContent.includes('読み込み中')){
   node.textContent='SDKを読み込めませんでした';
   byId('firebaseAuthStatus').textContent='利用不可';
   byId('firebaseAuthMessage').textContent='通信環境を確認し、GitHub Pages（https://）で開いてください。ローカルファイルからは認証できません。';
 }
},16000);
window.addEventListener('resize',()=>{if($('#tab-venues').classList.contains('active'))sizeVisibleFloorMaps();});
setInterval(()=>{if(!state.test.enabled){renderHeader();renderProgram();if($('#tab-venues').classList.contains('active'))renderVisitorMap();}},30000);
