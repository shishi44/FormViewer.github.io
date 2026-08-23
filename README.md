# Googleフォーム回答テンプレートビューアー

Google Forms → Google Sheets → Google Apps Script → GitHub Pages で、フォーム回答を複数テンプレートへ差し込んで見やすく表示するWebアプリです。

## v1の機能

- `お名前(ラジオネーム)` / `内容` の表示
- 回答一覧・前後移動
- Clean / Paper / Pop / Radio の4テンプレート
- 名前と本文のフォントサイズを独立変更
- テンプレート単位で設定をlocalStorageへ保存
- 長文は本文領域だけ縦スクロール
- 改行保持、長URL・連続文字の折り返し
- `textContent` によるXSS対策
- Loading / Empty / Error 状態
- PC 3カラム + タブレット/スマホ対応
- サンプルデータとGASデータソースの切替
- `fetch()` → JSONPフォールバック対応

## まずローカルで確認

ES ModulesとJSON読込を使用するため、`file://` 直開きではなくHTTPサーバーで確認してください。

Python例:

```bash
python -m http.server 8080
```

その後:

- 管理画面: `http://localhost:8080/editor.html`
- 表示画面: `http://localhost:8080/index.html`

初期状態は `js/config/appConfig.js` の `dataSource: "sample"` なのでGoogle接続なしで動作します。

## Googleフォームへ接続

1. `gas/README.md` に従ってApps ScriptをWeb Appとしてデプロイ。
2. `js/config/appConfig.js` を変更。

```js
export const APP_CONFIG = Object.freeze({
  dataSource: "gas",
  gasWebAppUrl: "https://script.google.com/macros/s/XXXX/exec",
  // ...
});
```

3. ローカルHTTPサーバーで実回答を確認。
4. Chrome / Edge / SafariでCORS・リダイレクトを確認。
5. 問題なければGitHub Pagesへ公開。

## GitHub Pages

リポジトリルートをそのまま `main / root` から公開できます。アセットはすべて相対パスです。

## 表示画面の回答指定

管理画面で最後に選択した回答を表示します。IDを明示する場合:

```text
index.html?id=response-12
```

テンプレートだけURLで上書きする場合:

```text
index.html?id=response-12&template=radio
```

## セキュリティ

v1は「返却される回答が公開されても問題ない」運用向けです。個人情報や非公開相談を扱う場合はこの公開GAS構成を使用せず、認証付きサーバーサイドAPIへ移行してください。

秘密鍵、OAuthトークン、実回答JSONをGitへコミットしないでください。

## 構成

詳細は `docs/architecture.md` と `docs/template-guide.md` を参照してください。
