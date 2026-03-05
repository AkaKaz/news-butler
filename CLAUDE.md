# News Butler — Claude 開発ガイドライン

このファイルは Claude Code がこのリポジトリで作業する際のルールを定義します。

## コミット規則

### パッケージインストール

- パッケージのインストールは **独立したコミット** にする
- コミットメッセージには実行したコマンドを記載する
- インストール時に生成されるファイル（`package.json`, `package-lock.json` 等）は未編集のまま含める
- 設定ファイルの編集が必要な場合は別コミットに分ける

```
# 良い例
chore(functions): rss-parser / @types/xml2js をインストール

npm install rss-parser
npm install --save-dev @types/xml2js
```

### 実装コミット

- パッケージインストールコミットとは分けて、実装ファイルのみをコミットする

## ブランチ・PR 規則

- 実装前に `npm run lint` と `npm run build` を確認してからコミットする
- PR 本文に `Closes #issue番号` を記載して Issue と紐づける
