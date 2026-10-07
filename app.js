
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const CONFIG_KEY = "ofes-config-v04";
const STAMP_KEY = "ofes-stamps-v04";
let data = loadConfig();
let selectedMapId = (data.maps && data.maps[0] && data.maps[0].id) || "campus";

function clone(v){ return JSON.parse(JSON.stringify(v)); }
function loadConfig(){
  try {
    const x = localStorage.getItem(CONFIG_KEY);
    return x ? JSON.parse(x) : clone(OFES_DEFAULT_DATA);
  } catch {
    return clone(OFES_DEFAULT_DATA);
  }
}
function saveConfig(){ localStorage.setItem(CONFIG_KEY, JSON.stringify(data)); }
function esc(v){ return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function attr(v){ return esc(v).replaceAll('"',"&quot;"); }

function showPage(id){
  $$(".page").forEach(x => x.classList.remove("active"));
  $("#"+id).classList.add("active");
  if(id === "map") autoSelectMap();
  window.scrollTo({top:0, behavior:"smooth"});
}

$$(".menu-card").forEach(b => b.onclick = () => showPage(b.dataset.page));
$$(".back").forEach(b => b.onclick = () => showPage("home"));
$$(".back-home").forEach(b => b.onclick = () => showPage("home"));

function parseLocalDateTime(s){
  if(!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
function currentClock(){
  if(data.previewEnabled){
    const d = parseLocalDateTime(data.previewDateTime);
    if(d) return d;
  }
  return new Date();
}
function dateISO(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function mins(t){
  const [h,m] = (t || "00:00").split(":").map(Number);
  return h*60 + m;
}
function roomById(id){ return data.rooms.find(r => r.id === id); }
function roomName(id){ return roomById(id)?.name || "場所未設定"; }
function sortedProgram(){ return [...data.program].sort((a,b)=> mins(a.start)-mins(b.start) || (a.id-b.id)); }
function nowState(){
  const now = currentClock();
  const n = now.getHours()*60 + now.getMinutes();
  const isEvent = dateISO(now) === data.eventDate;
  const all = sortedProgram();
  return {
    now, n, isEvent, all,
    current: isEvent ? all.filter(p => n >= mins(p.start) && n < mins(p.end)) : [],
    upcoming: isEvent ? all.filter(p => n < mins(p.start)) : [],
    finished: isEvent ? all.filter(p => n >= mins(p.end)) : []
  };
}

function renderHome(){
  $("#noticeText").textContent = data.notice || "";
  const s = nowState();
  const box = $("#todaySummary");
  if(!s.isEvent){
    box.innerHTML = `<div class="summary-card summary-next"><b>開催日：${data.eventDate || "未設定"}</b><br><small>開催日当日は「ただいま開催中」と「次のプログラム」を自動表示します。</small></div>`;
    return;
  }
  let html = "";
  if(s.current.length){
    html += `<div class="summary-card"><small>ただいま開催中</small><br>${s.current.map(p=>`<b>${p.start}–${p.end} ${esc(p.title)}</b> ／ ${esc(roomName(p.roomId))}`).join("<br>")}</div>`;
  } else {
    html += `<div class="summary-card"><small>ただいま</small><br><b>現在開催中のプログラムはありません。</b></div>`;
  }
  if(s.upcoming.length){
    const p = s.upcoming[0];
    html += `<div class="summary-card summary-next"><small>次のプログラム</small><br><b>${p.start} ${esc(p.title)}</b> ／ ${esc(roomName(p.roomId))}</div>`;
  }
  box.innerHTML = html;
}

function renderProgram(){
  const s = nowState();
  const status = $("#programStatus");
  if(s.isEvent){
    const cur = s.current.map(p=>`<li><b>${p.start}–${p.end} ${esc(p.title)}</b> ／ ${esc(roomName(p.roomId))}</li>`).join("");
    const up = s.upcoming.slice(0,6).map(p=>`<li>${p.start} ${esc(p.title)} ／ ${esc(roomName(p.roomId))}</li>`).join("");
    status.innerHTML =
      `<div class="status-block"><h3>ただいま開催中</h3>${cur ? `<ul>${cur}</ul>` : "<p>現在開催中のプログラムはありません。</p>"}</div>` +
      `<div class="status-block"><h3>このあとのプログラム</h3>${up ? `<ul>${up}</ul>` : "<p>本日のプログラムは終了しました。</p>"}</div>`;
  } else {
    status.innerHTML = `<div class="status-block"><h3>開催日：${data.eventDate || "未設定"}</h3><p>開催日当日は、実際の時刻に合わせて自動で表示が切り替わります。</p></div>`;
  }

  $("#programList").innerHTML = s.all.map(p=>{
    const cur = s.isEvent && s.current.some(x=>x.id===p.id);
    const fin = s.isEvent && s.finished.some(x=>x.id===p.id);
    return `<div class="program-item ${cur ? "current" : ""} ${fin ? "finished" : ""}">
      <div class="program-time">${p.start}</div>
      <div>
        <div class="program-title">${esc(p.title)}${cur ? '<span class="tag">開催中</span>' : ""}</div>
        <div class="program-place">${esc(roomName(p.roomId))} · ${p.start}–${p.end}</div>
      </div>
    </div>`;
  }).join("");
}

function autoSelectMap(){
  const s = nowState();
  const first = s.current[0] || s.upcoming[0];
  if(first){
    const r = roomById(first.roomId);
    if(r?.mapId) selectedMapId = r.mapId;
  }
  if(!data.maps.some(m=>m.id===selectedMapId)) selectedMapId = data.maps[0]?.id || "campus";
  renderMap();
}

function campusZoneBase(zoneId){
  const base = {
    campus_gym: {id:"campus_gym", name:"体育館", x:28, y:52, w:19, h:20},
    campus_zenki: {id:"campus_zenki", name:"前期課程棟", x:49, y:45, w:20, h:38},
    campus_koki: {id:"campus_koki", name:"後期課程棟", x:48, y:18, w:20, h:20},
    campus_parking: {id:"campus_parking", name:"教職員駐車場", x:18, y:5, w:67, h:8}
  };
  return base[zoneId] || null;
}

function zonesForMap(mapId, entries){
  if(mapId === "campus"){
    const grouped = new Map();
    entries.forEach(p=>{
      const r = roomById(p.roomId);
      const key = r?.campusGroup || null;
      if(!key) return;
      if(!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(p);
    });
    return [...grouped.entries()].map(([zoneId, list])=>{
      const z = campusZoneBase(zoneId);
      return z ? {...z, label:list.map(p=>p.title).join(" / ")} : null;
    }).filter(Boolean);
  }

  return entries.map(p=>{
    const r = roomById(p.roomId);
    if(!r || r.mapId !== mapId) return null;
    return {...r, label:p.title};
  }).filter(Boolean);
}

function renderMap(){
  const s = nowState();
  $("#mapTabs").innerHTML = data.maps.map(m => `<button class="${m.id===selectedMapId ? "active" : ""}" data-map="${m.id}">${esc(m.name)}</button>`).join("");
  const map = data.maps.find(m=>m.id===selectedMapId);
  if(!map) return;
  $("#mapImage").src = map.image;
  $("#mapImage").alt = map.name;

  const currentZones = zonesForMap(selectedMapId, s.current);
  const nextZones = zonesForMap(selectedMapId, s.upcoming.slice(0,5));
  const currentIds = new Set(currentZones.map(z=>z.id));
  const overlay = [];

  currentZones.forEach(z=>{
    overlay.push(`<div class="map-zone now" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%"><span class="zone-label">${esc(z.name)}<br>${esc(z.label)}</span></div>`);
  });
  nextZones.forEach(z=>{
    if(currentIds.has(z.id)) return;
    overlay.push(`<div class="map-zone next" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%"><span class="zone-label">${esc(z.name)}<br>${esc(z.label)}</span></div>`);
  });
  $("#mapOverlay").innerHTML = overlay.join("");

  if(!s.isEvent){
    $("#mapStatus").innerHTML = `<b>開催日：${data.eventDate || "未設定"}</b><br>開催日には、現在開催中の場所を赤色、このあとの場所を点線で表示します。`;
  } else if(s.current.length){
    $("#mapStatus").innerHTML = `<b>現在開催中</b><br>${s.current.map(p=>`${esc(p.title)} → ${esc(roomName(p.roomId))}`).join("<br>")}`;
  } else {
    $("#mapStatus").innerHTML = `<b>現在開催中のプログラムはありません。</b><br>${s.upcoming[0] ? `次は ${s.upcoming[0].start} ${esc(s.upcoming[0].title)} です。` : "本日のプログラムは終了しました。"}`;
  }

  const unlisted = [...s.current, ...s.upcoming.slice(0,3)].filter(p => !roomById(p.roomId)?.mapId && p.roomId !== "various");
  const box = $("#unmappedActivities");
  if(unlisted.length){
    box.classList.remove("hidden");
    box.innerHTML = `<b>この図では位置を示していない会場</b><br>${unlisted.map(p=>`${p.start} ${esc(p.title)} ／ ${esc(roomName(p.roomId))}`).join("<br>")}`;
  } else {
    box.classList.add("hidden");
  }
}
$("#mapTabs").onclick = (e) => {
  const b = e.target.closest("[data-map]");
  if(!b) return;
  selectedMapId = b.dataset.map;
  renderMap();
};

function gotStamps(){ try{return JSON.parse(localStorage.getItem(STAMP_KEY) || "[]")} catch { return []; } }
function setStamps(a){ localStorage.setItem(STAMP_KEY, JSON.stringify([...new Set(a)])); }

function renderStamps(){
  const a = gotStamps();
  const total = 5;
  $("#stampList").innerHTML = data.stamps.slice(0,5).map(s=>`
    <div class="stamp-card ${a.includes(s.id) ? "got" : ""}">
      <div class="stamp-icon">⭐</div>
      <h3>STAMP ${s.id}</h3>
      <div>${a.includes(s.id) ? "GET!" : "未獲得"}</div>
      <button class="hint-btn" data-h="${s.id}">ヒントを見る</button>
      <p id="hint${s.id}" class="hint hidden">${esc(s.hint || "")}</p>
    </div>`).join("");
  $("#stampCount").textContent = `${a.length} / ${total} スタンプ`;
  $("#stampProgress").style.width = `${a.length / total * 100}%`;
  $("#completeBox").classList.toggle("hidden", a.length < total);
}
$("#stampList").onclick = (e) => {
  if(e.target.dataset.h) $("#hint"+e.target.dataset.h).classList.toggle("hidden");
};
$("#resetStamps").onclick = () => {
  if(confirm("試作用スタンプをすべてリセットしますか？")){
    localStorage.removeItem(STAMP_KEY);
    renderStamps();
  }
};

function renderMovies(){
  $("#movieList").innerHTML = data.movies.length ? data.movies.map(m => `
    <article class="movie-card">
      <h3>${esc(m.title || "タイトル未設定")}</h3>
      <p>${esc(m.description || "")}</p>
      <a href="${attr(m.url || "#")}" ${(!m.url || m.url === "#") ? 'data-empty="1"' : 'target="_blank" rel="noopener"'}>動画を見る</a>
    </article>`).join("") : "<p>動画はまだ登録されていません。</p>";
  $$("#movieList a[data-empty='1']").forEach(a => {
    a.onclick = (e) => { e.preventDefault(); alert("動画URLが未設定です。"); };
  });
}
function renderGallery(){
  $("#galleryGrid").innerHTML = data.posters.length ? data.posters.map((p,i)=>`
    <button class="poster" data-i="${i}">
      <img src="${attr(p.src)}" alt="${attr(p.title || "ポスター")}">
      <span>${esc(p.title || "ポスター")}</span>
    </button>`).join("") : "<p>ポスターはまだ登録されていません。</p>";
}
$("#galleryGrid").onclick = (e) => {
  const b = e.target.closest(".poster");
  if(!b) return;
  const p = data.posters[+b.dataset.i];
  $("#dialogImage").src = p.src;
  $("#dialogCaption").textContent = p.title || "";
  $("#imageDialog").showModal();
};
$("#closeImageDialog").onclick = () => $("#imageDialog").close();
$("#imageDialog").onclick = (e) => { if(e.target === $("#imageDialog")) $("#imageDialog").close(); };

function renderAll(){
  renderHome();
  renderProgram();
  renderMap();
  renderStamps();
  renderMovies();
  renderGallery();
}
renderAll();
setInterval(() => { renderHome(); renderProgram(); renderMap(); }, 30000);

const stampParam = Number(new URLSearchParams(location.search).get("stamp"));
if(Number.isInteger(stampParam) && stampParam >= 1 && stampParam <= 5){
  const a = gotStamps();
  if(!a.includes(stampParam)){
    a.push(stampParam);
    setStamps(a);
    renderStamps();
    const s = data.stamps.find(x=>x.id===stampParam);
    setTimeout(() => {
      showPage("stamp");
      alert(`STAMP ${stampParam} GET!\n${s?.message || ""}`);
    }, 120);
  }
}

/* admin */
$("#adminOpenBtn").onclick = () => {
  $("#loginPassword").value = "";
  $("#loginError").textContent = "";
  $("#loginDialog").showModal();
};
$("#loginCancel").onclick = () => $("#loginDialog").close();
$("#loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if($("#loginPassword").value === data.adminPassword){
    $("#loginDialog").close();
    openAdmin();
  } else {
    $("#loginError").textContent = "パスワードが違います。";
  }
});
function openAdmin(){ populateAdmin(); showPage("admin"); }
$("#logoutAdmin").onclick = () => showPage("home");

$$(".admin-nav button").forEach(b => b.onclick = () => {
  $$(".admin-nav button").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  $$(".admin-tab").forEach(x => x.classList.remove("active"));
  $("#admin-" + b.dataset.adminTab).classList.add("active");
});

function roomOptions(selected){
  return data.rooms.filter(r => !r.id.endsWith("_build")).map(r => `<option value="${attr(r.id)}" ${r.id===selected ? "selected" : ""}>${esc(r.name)}</option>`).join("");
}
function populateAdmin(){
  $("#aYear").value = data.year || "";
  $("#aDate").value = data.eventDate || "";
  $("#aNotice").value = data.notice || "";
  $("#aPassword").value = data.adminPassword || "";
  $("#aPreviewEnabled").checked = !!data.previewEnabled;
  $("#aPreviewDateTime").value = data.previewDateTime || "";
  renderAdminPrograms();
  renderAdminStamps();
  renderAdminMovies();
  renderAdminPosters();
}
function renderAdminPrograms(){
  $("#adminProgramRows").innerHTML = data.program.map((p,i) => `
    <div class="admin-row" data-type="program" data-i="${i}">
      <label>開始<input class="p-start" type="time" value="${attr(p.start || "")}"></label>
      <label>終了<input class="p-end" type="time" value="${attr(p.end || "")}"></label>
      <label class="wide">内容<input class="p-title" value="${attr(p.title || "")}"></label>
      <label class="wide">場所<select class="p-room">${roomOptions(p.roomId)}</select></label>
      <div class="row-actions">
        <button class="move-btn" data-up="${i}">↑</button>
        <button class="move-btn" data-down="${i}">↓</button>
        <button class="remove-btn" data-remove-program="${i}">削除</button>
      </div>
    </div>`).join("");
}
function renderAdminStamps(){
  $("#adminStampRows").innerHTML = data.stamps.slice(0,5).map((s,i) => `
    <div class="admin-row" data-type="stamp" data-i="${i}">
      <label>番号<input value="${s.id}" disabled></label>
      <label class="wide">ヒント<input class="s-hint" value="${attr(s.hint || "")}"></label>
      <label class="wide">獲得時メッセージ<input class="s-message" value="${attr(s.message || "")}"></label>
    </div>`).join("");
}
function renderAdminMovies(){
  $("#adminMovieRows").innerHTML = data.movies.map((m,i) => `
    <div class="admin-row" data-type="movie" data-i="${i}">
      <label class="wide">タイトル<input class="m-title" value="${attr(m.title || "")}"></label>
      <label class="wide">説明<input class="m-desc" value="${attr(m.description || "")}"></label>
      <label class="wide">YouTube / 動画URL<input class="m-url" value="${attr(m.url || "")}"></label>
      <div class="row-actions"><button class="remove-btn" data-remove-movie="${i}">削除</button></div>
    </div>`).join("");
}
function renderAdminPosters(){
  $("#adminPosterRows").innerHTML = data.posters.map((p,i) => `
    <div class="admin-row" data-type="poster" data-i="${i}">
      <label class="wide">タイトル<input class="g-title" value="${attr(p.title || "")}"></label>
      <label class="wide">画像パス / URL<input class="g-src" value="${attr(p.src || "")}"></label>
      <div class="row-actions"><button class="remove-btn" data-remove-poster="${i}">削除</button></div>
    </div>`).join("");
}
function syncAdmin(){
  data.year = $("#aYear").value;
  data.eventDate = $("#aDate").value;
  data.notice = $("#aNotice").value;
  data.adminPassword = $("#aPassword").value || data.adminPassword;
  data.previewEnabled = $("#aPreviewEnabled").checked;
  data.previewDateTime = $("#aPreviewDateTime").value;
  const pr = [...$$('[data-type="program"]')];
  data.program = pr.map((r,i) => ({
    id: data.program[i]?.id || Date.now() + i,
    start: r.querySelector(".p-start").value,
    end: r.querySelector(".p-end").value,
    title: r.querySelector(".p-title").value,
    roomId: r.querySelector(".p-room").value
  }));
  const sr = [...$$('[data-type="stamp"]')];
  data.stamps = sr.map((r,i) => ({
    id: i+1,
    hint: r.querySelector(".s-hint").value,
    message: r.querySelector(".s-message").value
  }));
  const mr = [...$$('[data-type="movie"]')];
  data.movies = mr.map(r => ({
    title: r.querySelector(".m-title").value,
    description: r.querySelector(".m-desc").value,
    url: r.querySelector(".m-url").value
  }));
  const gr = [...$$('[data-type="poster"]')];
  data.posters = gr.map(r => ({
    title: r.querySelector(".g-title").value,
    src: r.querySelector(".g-src").value
  }));
}
$("#addProgram").onclick = () => {
  syncAdmin();
  data.program.push({id: Date.now(), start:"15:00", end:"15:10", title:"新しいプログラム", roomId:"gym"});
  renderAdminPrograms();
};
$("#addMovie").onclick = () => {
  syncAdmin();
  data.movies.push({title:"新しい動画", description:"", url:"#"});
  renderAdminMovies();
};
$("#addPoster").onclick = () => {
  syncAdmin();
  data.posters.push({title:"新しいポスター", src:"images/poster01.svg"});
  renderAdminPosters();
};

document.addEventListener("click", (e) => {
  if(e.target.dataset.removeProgram !== undefined){
    syncAdmin();
    data.program.splice(+e.target.dataset.removeProgram, 1);
    renderAdminPrograms();
  }
  if(e.target.dataset.removeMovie !== undefined){
    syncAdmin();
    data.movies.splice(+e.target.dataset.removeMovie, 1);
    renderAdminMovies();
  }
  if(e.target.dataset.removePoster !== undefined){
    syncAdmin();
    data.posters.splice(+e.target.dataset.removePoster, 1);
    renderAdminPosters();
  }
  if(e.target.dataset.up !== undefined){
    syncAdmin();
    const i = +e.target.dataset.up;
    if(i > 0) [data.program[i-1], data.program[i]] = [data.program[i], data.program[i-1]];
    renderAdminPrograms();
  }
  if(e.target.dataset.down !== undefined){
    syncAdmin();
    const i = +e.target.dataset.down;
    if(i < data.program.length-1) [data.program[i+1], data.program[i]] = [data.program[i], data.program[i+1]];
    renderAdminPrograms();
  }
});

$("#saveAdmin").onclick = () => {
  syncAdmin();
  saveConfig();
  renderAll();
  alert("このブラウザに設定を保存しました。");
};
$("#exportData").onclick = () => {
  syncAdmin();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `OFES_${data.year || "settings"}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("#importData").onchange = async (e) => {
  const f = e.target.files[0];
  if(!f) return;
  try {
    data = JSON.parse(await f.text());
    saveConfig();
    populateAdmin();
    renderAll();
    alert("設定を読み込みました。");
  } catch {
    alert("JSONファイルを読み込めませんでした。");
  }
  e.target.value = "";
};
$("#resetData").onclick = () => {
  if(confirm("初期設定に戻しますか？")){
    data = clone(OFES_DEFAULT_DATA);
    saveConfig();
    populateAdmin();
    renderAll();
  }
};
