# OFES Ver.0.1

おおフェス（文化発表会）用の試作Webアプリです。

## GitHub Pagesへの公開
1. GitHubで `OFES` リポジトリを作成
2. このフォルダ内のファイルをリポジトリ直下へアップロード
3. Settings → Pages で、Deploy from a branch / main / root を選択
4. 公開URLは通常 `https://ユーザー名.github.io/OFES/`

## 年度ごとの変更
基本的な内容は `data.js` を編集します。
- year: 年度
- notice: お知らせ
- program: プログラム
- places: 会場情報
- stamps: スタンプのヒント
- movies: YouTube等のURL
- posters: ポスター画像

## GPS
`data.js` の places に実際の緯度・経度を入力してください。
例:
{ name:"体育館", lat:33.000000, lng:133.000000, radius:80, guide:"..." }

GitHub PagesはHTTPSなので、ブラウザの位置情報APIを利用できます。
実機では位置情報の利用許可が必要です。

## QRスタンプ
固定URLの例:
- `https://ユーザー名.github.io/OFES/?stamp=1`
- `https://ユーザー名.github.io/OFES/?stamp=2`
- `https://ユーザー名.github.io/OFES/?stamp=3`

これらをQRコード化すれば、QR自体は翌年度以降も使い回せます。
獲得状況は各端末のブラウザ内（localStorage）に保存されます。

## ポスター
現在はサンプルSVGが6枚入っています。
実際の画像に差し替える場合は images フォルダへ画像を入れ、
`data.js` の posters を変更してください。枚数は固定されていません。
