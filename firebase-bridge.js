/**
 * OFES Ver.1.9: Google Authentication + Firestore published content.
 * 管理者はローカル下書きを明示的に公開する。来場者は認証なしで公開データを購読する。
 * セキュリティ境界は Firebase Security Rules（クライアントのパスワードではない）。
 */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
        browserLocalPersistence, signInAnonymously, setPersistence} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, onSnapshot, serverTimestamp, Timestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';

const el = (id) => document.getElementById(id);
const sdkStatus = el('firebaseSdkStatus');
const authStatus = el('firebaseAuthStatus');
const authMessage = el('firebaseAuthMessage');
const account = el('firebaseAccount');
const signInButton = el('firebaseSignIn');
const signOutButton = el('firebaseSignOut');
const readButton = el('firebaseReadTest');
const readResult = el('firebaseReadResult');
const cloudStatus = el('firebaseCloudStatus');
const summary = el('firebasePublishSummary');
const publishButton = el('firebasePublish');
const loadButton = el('firebaseLoadDraft');
const publishMessage = el('firebasePublishMessage');
let isLoggedIn=false, isBusy=false, publishedData=null, lastPublishTime=null, cloudLoaded=false, cloudError=false;
const REACTION_KEYS=['good','aha','amazing','fun','cheer'];
const REACTION_LABELS=['👍 よかった','💡 なるほど','✨ すごい','😊 楽しかった','🙌 応援したい'];
let latestStats=null, latestAllStats=[];

function status(node, text, kind='info') {
 if(!node)return;
 node.textContent=text;
 node.classList.remove('firebase-error','firebase-ok','firebase-loading','firebase-info');
 node.classList.add(`firebase-${kind}`);
}
function errorText(error) {
 switch(error?.code){
  case 'permission-denied': return '権限がありません。Firestoreのルールを確認してください。管理者ログインだけでは公開権限は付与されません。';
  case 'auth/unauthorized-domain': return 'このドメインは承認されていません。Firebase Authenticationの承認済みドメインを確認してください。';
  case 'auth/popup-blocked': return 'ログイン用ポップアップがブロックされました。';
  case 'auth/popup-closed-by-user': return 'ログイン画面が閉じられました。';
  case 'auth/cancelled-popup-request': return '別のログイン操作が進行中です。';
  case 'auth/operation-not-allowed': return 'Firebase側でGoogleログインが有効か確認してください。';
  case 'auth/network-request-failed': return '通信に失敗しました。ネットワークを確認してください。';
  case 'auth/operation-not-supported-in-this-environment': return 'GitHub Pagesのhttps://で開いてください。';
  default: return `${error?.code || error?.message || '接続エラー'}`;
 }
}
function setUiState(){
 publishButton.disabled=!isLoggedIn || isBusy || !cloudLoaded || cloudError;
 loadButton.disabled=!publishedData || isBusy;
 if(cloudError){
  status(cloudStatus,'接続エラー','error');
  summary.textContent='公開データにアクセスできません。Firestoreルールとネットワークをご確認ください。';
  summary.classList.add('warning');
 }else if(!cloudLoaded){
  status(cloudStatus,'接続確認中…','loading');
  summary.textContent='Firestoreへの接続を確認中…';
  summary.classList.add('warning');
 }else if(publishedData){
  status(cloudStatus,'公開データあり','ok');
  const n=publishedData.zones?.length || 0, p=publishedData.programs?.length || 0;
  const when=lastPublishTime?`　最終公開：${lastPublishTime}`:'';
  summary.textContent=`公開中：${publishedData.year||'―'}年度／会場${n}か所／プログラム${p}件${when}`;
  summary.classList.remove('warning');
 }else{
  status(cloudStatus,'未公開（初回保存待ち）');
  summary.textContent='Firestoreにはまだ公開データがありません。既存の教室登録を確認し、最初の公開を行ってください。';
  summary.classList.add('warning');
 }
}
try{
 const app=initializeApp(firebaseConfig);
 const auth=getAuth(app);
 const db=getFirestore(app);
 const publicDoc=doc(db,'published','site');
 // 匿名利用者のUIDを再読み込み後も保つ。Google管理者も端末で認証状態を保持する。
 await setPersistence(auth,browserLocalPersistence);
 status(sdkStatus,`接続準備完了（${app.options.projectId}）`,'ok');
 status(authStatus,'ログイン状態を確認中…','loading');
 status(authMessage,'Googleログイン後、UIDと管理者権限を確認できます。');
 setUiState();


 // 来場者用: 1つの発表につき1UID=1文書、5種類を配列として保存。
 // 管理者の集計以外では他人の投票を読み取れない。
 const voteDoc=(date,programId,uid)=>doc(db,'reactionEvents',date,'programs',programId,'votes',uid);
 const selectionCacheKey='ofes-reaction-choices-v14';
 function readSelectionCache(){try{return JSON.parse(localStorage.getItem(selectionCacheKey)||'{}')}catch{return{}}}
 function cacheSelection(date,programId,uid,selected){
  try{const data=readSelectionCache();data[`${date}|${programId}|${uid}`]=selected;localStorage.setItem(selectionCacheKey,JSON.stringify(data));}catch(error){console.warn(error)}
 }
 function emitSelection(programId,selected,uid){
  window.dispatchEvent(new CustomEvent('ofes-reaction-selection',{detail:{programId,selected,uid}}));
 }
 function emitNotice(programId,message){
  window.dispatchEvent(new CustomEvent('ofes-reaction-notice',{detail:{programId,message}}));
 }
 function publishStatus(){
  if(!publishedData?.reactionDeadlineAt)return {ok:false,message:'リアクションの受付準備中です。管理者がVer.1.4で再公開してください。'};
  const end=publishedData.reactionDeadlineAt.toDate?.();
  if(!(end instanceof Date)||!Number.isFinite(end.getTime()))return {ok:false,message:'受付期限が読み取れません。'};
  if(Date.now()>=end.getTime())return {ok:false,message:'リアクションの受付は終了しました。'};
  return {ok:true};
 }
 const reactionBusy=new Set();
 window.OFESReactions={
  toggle:async(programId,key)=>{
   if(!REACTION_KEYS.includes(key)||reactionBusy.has(programId))return;
   reactionBusy.add(programId);
   emitNotice(programId,'送信しています…');
   try{
    const status=publishStatus();if(!status.ok)throw Error(status.message);
    const eventDate=publishedData.eventDate;
    if(!publishedData.programs?.some(p=>(p.reactionId||p.id)===programId))throw Error('公開されていない発表です。');
    let user=auth.currentUser;
    if(!user)user=(await signInAnonymously(auth)).user;
    const ref=voteDoc(eventDate,programId,user.uid);
    // 端末間の変更や、直前の取り消しを反映した正確な状態を取得してから変更する。
    const previous=await getDoc(ref);
    const current=previous.exists()&&Array.isArray(previous.data().selected)?previous.data().selected:[];
    const next=current.includes(key)?current.filter(x=>x!==key):[...current,key];
    if(next.length)await setDoc(ref,{selected:next,version:1,updatedAt:serverTimestamp()});
    else if(previous.exists())await deleteDoc(ref);
    cacheSelection(eventDate,programId,user.uid,next);
    emitSelection(programId,next,user.uid);
    emitNotice(programId,`保存しました。${next.length?`${next.length}種類を選択中。押し直すと取り消せます。`:'リアクションを取り消しました。'}`);
   }catch(error){
    let message=errorText(error);
    if(error?.code==='auth/admin-restricted-operation'||error?.code==='auth/operation-not-allowed')message='Firebase Authenticationの「匿名」を有効にしてください。';
    if(error?.code==='permission-denied')message='送信できません。Firestoreのリアクション用ルール・受付期限を確認してください。';
    emitNotice(programId,`送信できませんでした：${message}`);
   }finally{reactionBusy.delete(programId);}
  }
 };
 // 同じ端末での「選択済み」の表示を再現。送信時には必ずサーバーの本人文書を照会。
 function restoreCachedReactions(){
  const uid=auth.currentUser?.uid, date=publishedData?.eventDate;if(!uid||!date)return;
  const cache=readSelectionCache();
  const seen=new Set();
  for(const p of publishedData.programs||[]){
   const reactionId=p.reactionId||p.id;if(seen.has(reactionId))continue;seen.add(reactionId);
   const sel=cache[`${date}|${reactionId}|${uid}`];
   if(Array.isArray(sel))emitSelection(reactionId,sel,uid);
  }
 }
 function isReactionTargetProgram(p){
  return !!p && (['s1','s2','s3','s4'].includes(p.session) || p.session==='afternoon');
 }
 function sessionText(p){
  if(['s1','s2','s3','s4'].includes(p.session)){
   const d=publishedData?.sessions?.[p.session];
   return d?.label || ({s1:'セッション①',s2:'セッション②',s3:'セッション③',s4:'セッション④'}[p.session]||p.session);
  }
  return p.session==='afternoon'?'午後':'その他';
 }
 function zoneText(p){
  return publishedData?.zones?.find(z=>z.id===p.zoneId)?.name || (p.zoneId||'会場未設定');
 }
 function reactionTargetGroups(){
  const map=new Map();
  for(const p of (publishedData?.programs||[]).filter(isReactionTargetProgram)){
   const reactionId=p.reactionId||p.id;
   if(!map.has(reactionId))map.set(reactionId,{reactionId,representative:p,occurrences:[]});
   map.get(reactionId).occurrences.push(p);
  }
  return [...map.values()].sort((a,b)=>{
   const pa=a.representative,pb=b.representative;
   const ga=String(pa.grade||'全体・その他'),gb=String(pb.grade||'全体・その他');
   return ga.localeCompare(gb,'ja',{numeric:true}) || String(pa.start||'').localeCompare(String(pb.start||'')) || String(pa.title||'').localeCompare(String(pb.title||''),'ja');
  });
 }
 function renderReactionStatsOptions(){
  const selector=el('reactionStatsProgram');if(!selector)return;
  const chosen=selector.value;
  const groups=reactionTargetGroups();
  selector.replaceChildren(new Option('発表を選んでください',''));
  for(const g of groups){
   const p=g.representative, repeat=g.occurrences.length>1?`（${g.occurrences.length}回実施）`:'';
   selector.add(new Option(`${p.grade?`${p.grade} `:''}${p.title}${repeat}`,g.reactionId));
  }
  if(groups.some(g=>g.reactionId===chosen))selector.value=chosen;
 }
 async function collectOneTarget(group){
  const p=group.representative;
  const votes=await getDocs(collection(db,'reactionEvents',publishedData.eventDate,'programs',group.reactionId,'votes'));
  const counts=Object.fromEntries(REACTION_KEYS.map(k=>[k,0]));
  for(const snap of votes.docs){const choices=snap.data().selected||[];for(const k of REACTION_KEYS){if(choices.includes(k))counts[k]++;}}
  const occurrences=[...group.occurrences].sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));
  const schedules=occurrences.map(x=>`${sessionText(x)} ${x.start||''}〜${x.end||''}`);
  return {reactionId:group.reactionId,grade:String(p.grade||'').trim()||'全体・その他',title:p.title||'発表',zoneName:zoneText(p),schedules,respondents:votes.size,counts};
 }
 const statsButton=el('reactionStatsLoad'),statsOut=el('reactionStatsResult'),statsMessage=el('reactionStatsMessage');
 statsButton.addEventListener('click',async()=>{
  const reactionId=el('reactionStatsProgram').value;
  const group=reactionTargetGroups().find(g=>g.reactionId===reactionId);
  if(!group){statsMessage.textContent='集計する発表を選択してください。';return;}
  if(!auth.currentUser?.providerData?.some(x=>x.providerId==='google.com')){
   statsMessage.textContent='管理者Googleログインが必要です。';return;
  }
  statsButton.disabled=true;statsOut.hidden=true;el('reactionStatsExport').disabled=true;
  statsMessage.textContent='Firestoreから集計しています…';
  try{
   const item=await collectOneTarget(group),p=group.representative;
   statsOut.replaceChildren();
   const heading=document.createElement('strong');heading.textContent=`${p.grade?`${p.grade} `:''}${p.title}`;statsOut.append(heading);
   const schedule=document.createElement('p');schedule.textContent=`実施：${item.schedules.join('／')}　会場：${item.zoneName}`;statsOut.append(schedule);
   const total=document.createElement('p');total.textContent=`回答者数：${item.respondents}（同じ発表を複数セッションで実施した場合も合算します。1人が複数種類を選択できます）`;statsOut.append(total);
   REACTION_KEYS.forEach((key,i)=>{
    const row=document.createElement('div');row.className='reaction-stat-row';
    const label=document.createElement('span');label.textContent=REACTION_LABELS[i];
    const n=document.createElement('strong');n.textContent=`${item.counts[key]} 件`;
    row.append(label,n);statsOut.append(row);
   });
   latestStats={programTitle:`${p.grade?`${p.grade} `:''}${p.title}`,year:publishedData.year,eventDate:publishedData.eventDate,counts:item.counts,respondents:item.respondents,schedules:item.schedules,zoneName:item.zoneName};
   statsOut.hidden=false;el('reactionStatsExport').disabled=false;
   statsMessage.textContent='集計しました。順位付けは行っていません。';
  }catch(error){statsMessage.textContent=`集計できませんでした：${errorText(error)}`;}
  finally{statsButton.disabled=false;}
 });
 el('reactionStatsExport').addEventListener('click',()=>{
  if(!latestStats)return;
  const rows=[['発表',latestStats.programTitle],['年度',latestStats.year],['開催日',latestStats.eventDate],['実施時間',latestStats.schedules.join(' / ')],['会場',latestStats.zoneName],['回答者数',latestStats.respondents],...REACTION_KEYS.map((k,i)=>[REACTION_LABELS[i],latestStats.counts[k]])];
  const csv='\ufeff'+rows.map(cols=>cols.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`OFES_リアクション集計_${latestStats.eventDate}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
 });

 const allButton=el('reactionStatsLoadAll'),allOut=el('reactionStatsAllResult'),allMessage=el('reactionStatsAllMessage'),pdfButton=el('reactionStatsPdf');
 function renderAllStats(){
  if(!allOut)return;
  allOut.replaceChildren();
  const groups=new Map();
  for(const item of latestAllStats){if(!groups.has(item.grade))groups.set(item.grade,[]);groups.get(item.grade).push(item);}
  for(const [grade,items] of groups){
   const group=document.createElement('section');group.className='reaction-grade-group';
   const h=document.createElement('h4');h.textContent=grade;group.append(h);
   const wrap=document.createElement('div');wrap.className='reaction-all-table-wrap';
   const table=document.createElement('table');table.className='reaction-all-table';
   table.innerHTML='<thead><tr><th>発表</th><th>実施時間</th><th>会場</th><th>回答者</th><th>👍</th><th>💡</th><th>✨</th><th>😊</th><th>🙌</th></tr></thead>';
   const tbody=document.createElement('tbody');
   for(const item of items){
    const tr=document.createElement('tr');
    const values=[item.title,item.schedules.join('／'),item.zoneName,String(item.respondents),...REACTION_KEYS.map(k=>String(item.counts[k]))];
    values.forEach((v,i)=>{const td=document.createElement('td');td.textContent=v;if(i>=3)td.classList.add('count');tr.append(td);});
    tbody.append(tr);
   }
   table.append(tbody);wrap.append(table);group.append(wrap);allOut.append(group);
  }
 }
 allButton?.addEventListener('click',async()=>{
  if(!auth.currentUser?.providerData?.some(x=>x.providerId==='google.com')){allMessage.textContent='管理者Googleログインが必要です。';return;}
  const groups=reactionTargetGroups();
  if(!groups.length){allMessage.textContent='集計対象の発表がありません。';return;}
  allButton.disabled=true;pdfButton.disabled=true;allOut.hidden=true;latestAllStats=[];
  allMessage.textContent=`全${groups.length}発表をFirestoreから集計しています…`;
  try{
   const results=[];
   for(let i=0;i<groups.length;i++){
    const p=groups[i].representative;
    allMessage.textContent=`集計中 ${i+1}/${groups.length}：${p.grade?`${p.grade} `:''}${p.title}`;
    results.push(await collectOneTarget(groups[i]));
   }
   latestAllStats=results;renderAllStats();allOut.hidden=false;pdfButton.disabled=false;
   const totalRespondents=results.reduce((sum,x)=>sum+x.respondents,0);
   allMessage.textContent=`全${results.length}発表を集計しました。各発表の回答者数の合計は${totalRespondents}です（同じ来場者が複数発表に回答した場合は重複して数えます）。`;
  }catch(error){allMessage.textContent=`一括集計できませんでした：${errorText(error)}`;}
  finally{allButton.disabled=false;}
 });
 function htmlEsc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
 pdfButton?.addEventListener('click',()=>{
  if(!latestAllStats.length)return;
  const groups=new Map();
  for(const item of latestAllStats){if(!groups.has(item.grade))groups.set(item.grade,[]);groups.get(item.grade).push(item);}
  const sections=[...groups.entries()].map(([grade,items],index)=>`<section class="grade ${index?'pagebreak':''}"><h2>${htmlEsc(grade)} リアクション集計</h2><table><thead><tr><th>発表内容</th><th>実施時間</th><th>会場</th><th>回答者</th><th>👍<small>よかった</small></th><th>💡<small>なるほど</small></th><th>✨<small>すごい</small></th><th>😊<small>楽しかった</small></th><th>🙌<small>応援したい</small></th></tr></thead><tbody>${items.map(item=>`<tr><td>${htmlEsc(item.title)}</td><td>${item.schedules.map(htmlEsc).join('<br>')}</td><td>${htmlEsc(item.zoneName)}</td><td class="num">${item.respondents}</td>${REACTION_KEYS.map(k=>`<td class="num">${item.counts[k]}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`).join('');
  const w=window.open('','OFES_REACTION_PDF','width=1100,height=850');
  if(!w){allMessage.textContent='PDF出力画面を開けませんでした。ポップアップを許可してください。';return;}
  const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>OFES リアクション集計</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Noto Sans JP","Yu Gothic",Meiryo,sans-serif;color:#172019;margin:0;font-size:9.5pt}h1{font-size:18pt;margin:0 0 2mm}h2{font-size:14pt;margin:0 0 4mm;border-left:5px solid #197a4b;padding-left:8px}.meta{margin:0 0 5mm;color:#526058}.legend{display:flex;gap:6mm;flex-wrap:wrap;padding:2.5mm 3mm;background:#f2f7f3;border:1px solid #ccd9ce;border-radius:5px;margin-bottom:5mm}.legend span{white-space:nowrap}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}th,td{border:1px solid #cfd7d0;padding:2.2mm;vertical-align:top}th{background:#edf4ee;font-size:8.5pt}th small{display:block;font-weight:500}td.num{text-align:center;font-weight:700}.pagebreak{break-before:page;page-break-before:always}.note{margin-top:4mm;font-size:8.5pt;color:#59655d}.printbar{position:fixed;top:10px;right:10px}.printbar button{padding:9px 14px;font-size:14px}@media print{.printbar{display:none}}</style></head><body><div class="printbar"><button onclick="window.print()">印刷／PDFとして保存</button></div><h1>OFES リアクション集計表</h1><p class="meta">${htmlEsc(publishedData.year||'')}年度　開催日：${htmlEsc(publishedData.eventDate||'')}　※同じ発表を複数セッションで実施した場合は合算しています。1人が複数種類のリアクションを選択できます。</p><div class="legend"><span>👍 よかった</span><span>💡 なるほど</span><span>✨ すごい</span><span>😊 楽しかった</span><span>🙌 応援したい</span></div>${sections}<p class="note">※ 個人を特定する情報は掲載していません。回答者数は発表ごとの匿名回答数です。</p></body></html>`;
  w.document.open();w.document.write(html);w.document.close();
 });

 window.addEventListener('ofes-cloud-published',()=>{restoreCachedReactions();});
 onAuthStateChanged(auth,()=>{restoreCachedReactions();});

 // Firestore listener: visitors require no sign-in. Fetches once and listens for publication updates.
 onSnapshot(publicDoc, (snapshot)=>{
  publishedData=snapshot.exists()?snapshot.data():null;
  lastPublishTime=publishedData?.updatedAt?.toDate?.().toLocaleString('ja-JP')||null;
  cloudLoaded=true;cloudError=false;
  setUiState();
  renderReactionStatsOptions();
  window.dispatchEvent(new CustomEvent('ofes-cloud-published',{detail:{data:publishedData}}));
 },(error)=>{
  cloudError=true;cloudLoaded=false;setUiState();
  status(publishMessage,`公開データの取得に失敗：${errorText(error)}`,'error');
 });

 onAuthStateChanged(auth, user=>{
  const isGoogle=!!user?.providerData?.some(provider=>provider.providerId==='google.com');
  isLoggedIn=isGoogle;
  signInButton.hidden=isGoogle;
  signInButton.disabled=false;
  signOutButton.hidden=!isGoogle;
  readButton.disabled=!isGoogle;
  account.hidden=!isGoogle;
  window.dispatchEvent(new CustomEvent('ofes-reaction-uid',{detail:{uid:user?.uid||''}}));
  setUiState();
  status(readResult,isGoogle?'Firestoreの読み取り権限を確認できます。':'管理者Googleログイン後に確認できます。');
  if(isGoogle){
   status(authStatus,'Googleログイン成功','ok');
   el('firebaseUserEmail').textContent=user.email||'メールアドレスなし';
   el('firebaseUserUid').value=user.uid;
   status(authMessage,'ログインできました。Firestoreへの書き込み可否はセキュリティルールで確認されます。','ok');
   status(publishMessage,'編集内容を公開する前に、JSONバックアップと内容の確認をおすすめします。');
  }else{
   status(authStatus,user?.isAnonymous?'来場者として匿名認証中':'管理者は未ログイン');
   el('firebaseUserEmail').textContent='';el('firebaseUserUid').value='';
   status(authMessage,'「Googleでログイン」で管理者のGoogleアカウントを選択してください。来場者の匿名認証では公開権限は付きません。');
   status(publishMessage,'管理者Googleログイン後に公開できます。');
  }
 },error=>{
  status(authStatus,'認証状態の取得に失敗','error');
  status(authMessage,errorText(error),'error');
 });

 signInButton.addEventListener('click',async()=>{
  signInButton.disabled=true;
  status(authMessage,'Googleのログイン画面を開いています…','loading');
  try{await signInWithPopup(auth,new GoogleAuthProvider());}
  catch(error){status(authMessage,errorText(error),'error');}
  finally{signInButton.disabled=false;}
 });
 signOutButton.addEventListener('click',async()=>{
  signOutButton.disabled=true;
  try{await signOut(auth);}catch(error){status(authMessage,errorText(error),'error');}
  finally{signOutButton.disabled=false;}
 });
 el('firebaseCopyUid').addEventListener('click',async()=>{
  const value=el('firebaseUserUid').value;
  if(!value)return;
  try{await navigator.clipboard.writeText(value);status(authMessage,'UIDをコピーしました。','ok');}
  catch(error){el('firebaseUserUid').focus();el('firebaseUserUid').select();status(authMessage,'UIDを選択しました。Ctrl+Cなどでコピーしてください。');}
 });
 readButton.addEventListener('click',async()=>{
  readButton.disabled=true;
  status(readResult,'Firestoreを確認中…','loading');
  try{
   const snap=await getDoc(doc(db,'ofes_connection_tests','read_probe'));
   status(readResult,snap.exists()?'読み取り成功：診断用データがあります。':'読み取り成功：診断用データはまだありません。','ok');
  }catch(error){status(readResult,`読み取り失敗：${errorText(error)}`,'error');}
  finally{readButton.disabled=!auth.currentUser;}
 });
 publishButton.addEventListener('click',async()=>{
  if(!auth.currentUser||isBusy||!cloudLoaded||cloudError)return;
  const payload=window.OFESCloud?.exportPublished?.();
  if(!payload)return status(publishMessage,'下書きが取得できません。画面を再読み込みしてください。','error');
  const before=publishedData?`現在の公開データ（会場${publishedData.zones?.length||0}か所）を上書きします。`:'初めての公開です。';
  const warning=publishedData?.zones?.length>payload.zones.length?'\n【注意】現在の公開会場数より下書きの会場数が少なくなっています。ほかの端末で教室登録を進めている場合は、公開しないでください。\n':'';
  if(!confirm(`${before}\n${warning}\n年度：${payload.year}\n会場：${payload.zones.length}か所\nプログラム：${payload.programs.length}件\n受付終了：${payload.reactionDeadline}（日本時間）\n\nこの内容を来場者向けに公開してよろしいですか？`))return;
  isBusy=true;setUiState();status(publishMessage,'Firestoreへ公開しています。画面を閉じずにお待ちください…','loading');
  try{
   // Firestore Rules: only allow this path's write for the admin UID.
   const deadlineDate=new Date(`${payload.reactionDeadline}:00+09:00`);
   if(!Number.isFinite(deadlineDate.getTime()))throw Error('リアクション受付終了日時の形式が正しくありません。');
   // ファイル内の旧スキーマは変えず、公開ドキュメントにだけ timestamp を追加する。
   await setDoc(publicDoc,{...payload,programIds:[...new Set(payload.programs.map(p=>p.reactionId||p.id))],reactionDeadlineAt:Timestamp.fromDate(deadlineDate),updatedAt:serverTimestamp(),updatedByUid:auth.currentUser.uid});
   status(publishMessage,'Firestoreへの公開が完了しました。別の端末でも同じ内容を閲覧できます。','ok');
  }catch(error){status(publishMessage,`公開に失敗：${errorText(error)}`,'error');}
  finally{isBusy=false;setUiState();}
 });
 loadButton.addEventListener('click',()=>{
  if(!publishedData||isBusy)return;
  if(!confirm('現在のブラウザ内の下書きが、Firestoreの公開データで上書きされます。\n\n必要な場合は先に「下書きの設定JSONを書き出す」でバックアップしてください。\n\n読み込みますか？'))return;
  try{
   window.OFESCloud?.importPublishedAsDraft?.();
   status(publishMessage,'Firestoreの公開データを編集用の下書きに読み込みました。','ok');
  }catch(e){status(publishMessage,`読み込み失敗：${e.message}`,'error');}
 });
}catch(error){
 console.error('Firebase SDK initialization failed',error);
 status(sdkStatus,'初期化エラー','error');
 status(authStatus,'利用不可','error');
 status(authMessage,errorText(error),'error');
 status(publishMessage,'Firebase SDKを読み込めませんでした。','error');
 status(cloudStatus,'利用不可','error');
}
