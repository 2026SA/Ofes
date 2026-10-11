/**
 * OFES Ver.1.0: Firebase Authentication 接続テスト。
 * まだ Firestore にデータを書き込まない。ルールも初期状態のまま変更しない。
 * ブラウザからGoogleログインし、管理者登録用UIDを確認するだけの安全な段階。
 */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
        browserSessionPersistence, setPersistence} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore, doc, getDoc} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
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

function status(node, text, kind='info') {
  node.textContent=text;
  node.classList.remove('firebase-error','firebase-ok','firebase-loading','firebase-info');
  node.classList.add(`firebase-${kind}`);
}
function errorText(error) {
  switch(error?.code){
    case 'auth/unauthorized-domain': return 'このサイトのドメインが承認されていません。Firebase Authentication → 設定 → 承認済みドメインを確認してください。';
    case 'auth/popup-blocked': return 'ポップアップがブロックされました。ブラウザでポップアップを許可してください。';
    case 'auth/popup-closed-by-user': return 'ログイン画面を閉じたため、認証は完了していません。';
    case 'auth/cancelled-popup-request': return '別のログイン操作が進行中です。もう一度お試しください。';
    case 'auth/operation-not-allowed': return 'Firebase側でGoogleログインが有効になっているか確認してください。';
    case 'auth/network-request-failed': return '通信に失敗しました。インターネット接続を確認してください。';
    case 'auth/operation-not-supported-in-this-environment': return 'この環境ではGoogleログインが使えません。GitHub Pagesのhttps://で開いてください。';
    default: return `接続エラー：${error?.code || 'unknown'}。ブラウザのコンソールと通信環境を確認してください。`;
  }
}

try {
  const app=initializeApp(firebaseConfig);
  const auth=getAuth(app);
  const db=getFirestore(app);
  // 共用PCでログイン状態を長期間残さないよう、ブラウザセッション内だけ維持する。
  await setPersistence(auth,browserSessionPersistence);
  status(sdkStatus,`接続準備完了（${app.options.projectId}）`,'ok');
  status(authStatus,'ログイン状態を確認中…','loading');
  status(authMessage,'Googleログイン後、FirebaseのUIDが表示されます。');

  onAuthStateChanged(auth, (user) => {
    signInButton.hidden=!!user;
    signInButton.disabled=false;
    signOutButton.hidden=!user;
    readButton.disabled=!user;
    account.hidden=!user;
    status(readResult,user?'Firestoreの読み取り確認が可能です（初期ルールでは拒否されます）。':'Googleでログインすると確認できます。');
    if(user){
      status(authStatus,'Googleログイン成功','ok');
      el('firebaseUserEmail').textContent=user.email || 'メールアドレスなし';
      el('firebaseUserUid').value=user.uid;
      status(authMessage,'ログインできました。UIDをコピーして管理者権限の設定に使用できます。','ok');
    } else {
      status(authStatus,'未ログイン');
      el('firebaseUserEmail').textContent='';
      el('firebaseUserUid').value='';
      status(authMessage,'「Googleでログイン」を押して、開発用のGoogleアカウントを選択してください。');
    }
  },(error)=>{
    status(authStatus,'認証状態の取得に失敗','error');
    status(authMessage,errorText(error),'error');
  });

  signInButton.addEventListener('click', async () => {
    signInButton.disabled=true;
    status(authMessage,'Googleのログイン画面を開いています…','loading');
    try{
      // ポップアップをクリックイベントから直接呼ぶ（モバイル・ブラウザのブロック対策）。
      await signInWithPopup(auth,new GoogleAuthProvider());
    }catch(error){
      status(authMessage,errorText(error),'error');
    }finally {signInButton.disabled=false;}
  });
  signOutButton.addEventListener('click', async () => {
    signOutButton.disabled=true;
    try{await signOut(auth);}catch(error){status(authMessage,errorText(error),'error');}
    finally{signOutButton.disabled=false;}
  });
  el('firebaseCopyUid').addEventListener('click', async () => {
    const value=el('firebaseUserUid').value;
    if(!value)return;
    try{await navigator.clipboard.writeText(value);status(authMessage,'UIDをコピーしました。','ok');}
    catch(error){el('firebaseUserUid').focus();el('firebaseUserUid').select();status(authMessage,'UIDを選択しました。Ctrl+Cなどでコピーしてください。');}
  });
  readButton.addEventListener('click', async () => {
    readButton.disabled=true;
    status(readResult,'Firestoreへ読み取りテスト中…','loading');
    try{
      const snap=await getDoc(doc(db,'ofes_connection_tests','read_probe'));
      // 初期ルールではここに到達しない。将来ルールを変更したときの診断用。
      status(readResult,snap.exists()?'読み取り成功：診断用データが存在します。':'読み取り成功：診断用のデータはまだありません。','ok');
    }catch(error){
      if(error?.code==='permission-denied'){
        status(readResult,'アクセス拒否（正常）：Firestoreの初期セキュリティルールが有効です。まだクラウド保存は許可していません。','ok');
      }else{status(readResult,`読み取り確認に失敗しました：${errorText(error)}`,'error');}
    }finally{readButton.disabled=!auth.currentUser;}
  });
}catch(error){
  console.error('Firebase SDK initialization failed',error);
  status(sdkStatus,'初期化エラー','error');
  status(authStatus,'利用不可','error');
  status(authMessage,errorText(error),'error');
}
