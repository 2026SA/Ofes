/**
 * OFES Ver.1.3: Google Authentication + Firestore published content.
 * 管理者はローカル下書きを明示的に公開する。来場者は認証なしで公開データを購読する。
 * セキュリティ境界は Firebase Security Rules（クライアントのパスワードではない）。
 */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
        browserSessionPersistence, setPersistence} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
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
 await setPersistence(auth,browserSessionPersistence);
 status(sdkStatus,`接続準備完了（${app.options.projectId}）`,'ok');
 status(authStatus,'ログイン状態を確認中…','loading');
 status(authMessage,'Googleログイン後、UIDと管理者権限を確認できます。');
 setUiState();

 // Firestore listener: visitors require no sign-in. Fetches once and listens for publication updates.
 onSnapshot(publicDoc, (snapshot)=>{
  publishedData=snapshot.exists()?snapshot.data():null;
  lastPublishTime=publishedData?.updatedAt?.toDate?.().toLocaleString('ja-JP')||null;
  cloudLoaded=true;cloudError=false;
  setUiState();
  window.dispatchEvent(new CustomEvent('ofes-cloud-published',{detail:{data:publishedData}}));
 },(error)=>{
  cloudError=true;cloudLoaded=false;setUiState();
  status(publishMessage,`公開データの取得に失敗：${errorText(error)}`,'error');
 });

 onAuthStateChanged(auth, user=>{
  isLoggedIn=!!user;
  signInButton.hidden=!!user;
  signInButton.disabled=false;
  signOutButton.hidden=!user;
  readButton.disabled=!user;
  account.hidden=!user;
  setUiState();
  status(readResult,user?'Firestoreの読み取り権限を確認できます。':'Googleでログインすると確認できます。');
  if(user){
   status(authStatus,'Googleログイン成功','ok');
   el('firebaseUserEmail').textContent=user.email||'メールアドレスなし';
   el('firebaseUserUid').value=user.uid;
   status(authMessage,'ログインできました。Firestoreへの書き込み可否はセキュリティルールで確認されます。','ok');
   status(publishMessage,'編集内容を公開する前に、JSONバックアップと内容の確認をおすすめします。');
  }else{
   status(authStatus,'未ログイン');
   el('firebaseUserEmail').textContent='';el('firebaseUserUid').value='';
   status(authMessage,'「Googleでログイン」で管理者のGoogleアカウントを選択してください。');
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
  if(!confirm(`${before}\n\n年度：${payload.year}\n会場：${payload.zones.length}か所\nプログラム：${payload.programs.length}件\n\nこの内容を来場者向けに公開してよろしいですか？`))return;
  isBusy=true;setUiState();status(publishMessage,'Firestoreへ公開しています。画面を閉じずにお待ちください…','loading');
  try{
   // Firestore Rules: only allow this path's write for the admin UID.
   await setDoc(publicDoc,{...payload,updatedAt:serverTimestamp(),updatedByUid:auth.currentUser.uid});
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
