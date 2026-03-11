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
- **実装完了後は必ず PR を作成する**（CI 環境での確認のため）
  - `main` に直接コミットせず、フィーチャーブランチを作成してから PR を出す
  - ブランチ名の例: `feat/source-management-ui`, `fix/some-bug`

## コーディング規則

- 1行は **80文字以内**（ESLint `max-len` ルール）
- セクションコメントの罫線（`// ─── ... ───`）も80文字以内に収める
- テストファイルのモック設定行など長くなりやすい行は改行して分割する

## CI 構成

### ワークフロー一覧

| ファイル | トリガー | 主な役割 |
|---|---|---|
| `firebase-hosting-pull-request.yml` | PR | Lint / ビルド / テスト / VRT / PR コメント |
| `firebase-hosting-merge.yml` | main へ push | 本番ビルド・デプロイ・カバレッジ記録 |
| `cleanup-gcs-reports.yml` | PR クローズ / force push | GCS レポートの削除 |

### PR ワークフローのジョブ構成

```
lint_and_check  ──┐
                  ├──▶  report_comment（PR にまとめコメント投稿）
visual_regression─┤
build_and_preview─┘
```

- **lint_and_check**: Svelte typecheck → ESLint → tsc → Jest（カバレッジ） → GCS アップロード → Checks API 通知
- **visual_regression**: reg-suit で VRT → GCS アップロード → Checks API 通知
- **build_and_preview**: Firebase Hosting Preview デプロイ
- **report_comment**: 上記 3 ジョブの outputs を受け取り PR に 1 コメント投稿・更新

### レポート保存先（GCS）

- バケット: `akanmi-news-butler-ci`（公開読み取り可）
- カバレッジ: `gs://akanmi-news-butler-ci/coverage/<SHA>/`
- VRT: `gs://akanmi-news-butler-ci/vrt/<SHA>/`
- 公開 URL: `https://storage.googleapis.com/akanmi-news-butler-ci/...`

### Checks API の方針

- **Unit Tests・Coverage・VRT は Checks API で通知する**（`github.rest.checks.create`）
- レポーター系 Action（`dorny/test-reporter` 等）は使わない
- check run の conclusion:
  - Coverage: 閾値（現在 80%）未満 → `failure`、以上 → `success`
  - VRT: `CHANGED > 0` → `failure`、`NEW or DELETED > 0` → `neutral`（初回等）、全 0 → `success`

### PR コメント形式

`<!-- ci-report -->` マーカーで同一コメントを更新する。形式:

```
| | 結果 | リンク |
|---|---|---|
| 🧪 Unit Tests | ✅ 41/41 | [レポート](...) |
| 📊 Coverage | ✅ 85.3% | [レポート](...) |
| 🖼 VRT | ✅ pass 38 | [レポート](...) |
| 🚀 Firebase | ✅ デプロイ済み | [プレビュー](...) |
```

### 必要な GitHub Secrets / Variables

| 名前 | 種別 | 用途 |
|---|---|---|
| `GCS_CLIENT_EMAIL` | Secret | GCS サービスアカウント |
| `GCS_PRIVATE_KEY` | Secret | GCS サービスアカウント秘密鍵 |
| `FIREBASE_SERVICE_ACCOUNT_*` | Secret | Firebase デプロイ |
| `VITE_FIREBASE_*` | Variable | フロントエンドビルド環境変数 |

### GCS クリーンアップルール

- PR クローズ時: そのブランチの HEAD SHA に紐づくレポートを削除
- force push 時: 上書きされた旧 SHA のレポートを削除
- `cleanup-gcs-reports.yml` が自動処理するため、手動削除は不要

### VRT（Visual Regression Testing）

- ツール: Playwright + reg-suit + GCS
- キャプチャ対象（`visual.spec.ts`）:
  - ページ5種: `reports`（`/reports`）、`butlers`（`/butlers`）、`report-detail`（`/reports/rep-1`）、`butler-detail`（`/butlers/mock-1`）、`butler-sources`（`/butlers/mock-1/sources`）
  - モーダル2種: `butler-create-modal`（新規作成モーダル）、`butler-edit-modal`（編集モーダル）
- デバイス3種:
  - `desktop`: Desktop Chrome（1280×800）
  - `tablet`: Desktop Chrome（768×1024）
  - `mobile`: iPhone 15（WebKit）
- スナップショット名: `{ページ}-{デバイス}.png`（例: `reports-mobile.png`）
- **WebKit のインストールが必要**: CI で `npx playwright install chromium webkit --with-deps`
- **ログインバイパス**: VRT ビルド時のみ `VITE_VRT_AUTH_BYPASS=true` をセット
  - `+layout.svelte` でこのフラグを確認し、Firebase Auth 検証をスキップしてアプリ本体を表示
  - 本番ビルド（`build_and_preview` ジョブ）にはこのフラグを渡さない
  - **`firebase-hosting-merge.yml` の `update_visual_baseline` ジョブにも同フラグが必要**
    （PR ワークフローと同様に `Build frontend` ステップの `env` に `VITE_VRT_AUTH_BYPASS: true` を含めること）

### CI 変更時の注意

- ワークフロー YAML に Python スクリプトを直接埋め込む場合は **ヒアドキュメントや引用符のエスケープに注意**。複雑な場合はスクリプトファイルを別途作成して呼び出す
- `outputs` を使ってジョブ間でデータを渡す際は、値に改行を含めないこと
- Checks API の `output.text` は Markdown 対応（GFM）
