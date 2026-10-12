/**
 * OFES Ver.1.8: Google Authentication + Firestore published content.
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
let latestStats=null;

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
    if(!publishedData.programs?.some(p=>p.id===programId))throw Error('公開されていない発表です。');
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
  for(const p of publishedData.programs||[]){
   const sel=cache[`${date}|${p.id}|${uid}`];
   if(Array.isArray(sel))emitSelection(p.id,sel,uid);
  }
 }
 function renderReactionStatsOptions(){
  const selector=el('reactionStatsProgram');if(!selector)return;
  const chosen=selector.value;
  const ps=publishedData?.programs||[];
  selector.replaceChildren(new Option('発表を選んでください',''));
  for(const p of ps)selector.add(new Option(`${p.start} ${p.grade?`${p.grade} `:''}${p.title}`,p.id));
  if(ps.some(p=>p.id===chosen))selector.value=chosen;
 }
 const statsButton=el('reactionStatsLoad'),statsOut=el('reactionStatsResult'),statsMessage=el('reactionStatsMessage');
 statsButton.addEventListener('click',async()=>{
  const programId=el('reactionStatsProgram').value;
  const p=publishedData?.programs?.find(x=>x.id===programId);
  if(!p){statsMessage.textContent='集計する発表を選択してください。';return;}
  if(!auth.currentUser?.providerData?.some(x=>x.providerId==='google.com')){
   statsMessage.textContent='管理者Googleログインが必要です。';return;
  }
  statsButton.disabled=true;statsOut.hidden=true;el('reactionStatsExport').disabled=true;
  statsMessage.textContent='Firestoreから集計しています…';
  try{
   const votes=await getDocs(collection(db,'reactionEvents',publishedData.eventDate,'programs',programId,'votes'));
   const counts=Object.fromEntries(REACTION_KEYS.map(k=>[k,0]));
   for(const snap of votes.docs){const choices=snap.data().selected||[];for(const k of REACTION_KEYS){if(choices.includes(k))counts[k]++;}}
   statsOut.replaceChildren();
   const heading=document.createElement('strong');heading.textContent=`${p.grade?`${p.grade} `:''}${p.title}`;statsOut.append(heading);
   const total=document.createElement('p');total.textContent=`回答者数：${votes.size}（1人が複数種類を選択できます）`;statsOut.append(total);
   REACTION_KEYS.forEach((key,i)=>{
    const row=document.createElement('div');row.className='reaction-stat-row';
    const label=document.createElement('span');label.textContent=REACTION_LABELS[i];
    const n=document.createElement('strong');n.textContent=`${counts[key]} 件`;
    row.append(label,n);statsOut.append(row);
   });
   latestStats={programTitle:`${p.grade?`${p.grade} `:''}${p.title}`,year:publishedData.year,eventDate:publishedData.eventDate,counts,respondents:votes.size};
   statsOut.hidden=false;el('reactionStatsExport').disabled=false;
   statsMessage.textContent='集計しました。順位付けは行っていません。';
  }catch(error){statsMessage.textContent=`集計できませんでした：${errorText(error)}`;}
  finally{statsButton.disabled=false;}
 });
 el('reactionStatsExport').addEventListener('click',()=>{
  if(!latestStats)return;
  const rows=[['発表',latestStats.programTitle],['年度',latestStats.year],['開催日',latestStats.eventDate],['回答者数',latestStats.respondents],...REACTION_KEYS.map((k,i)=>[REACTION_LABELS[i],latestStats.counts[k]])];
  const csv='\ufeff'+rows.map(cols=>cols.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`OFES_リアクション集計_${latestStats.eventDate}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
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
   await setDoc(publicDoc,{...payload,programIds:[...new Set(payload.programs.map(p=>p.id))],reactionDeadlineAt:Timestamp.fromDate(deadlineDate),updatedAt:serverTimestamp(),updatedByUid:auth.currentUser.uid});
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
