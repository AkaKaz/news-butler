# News Butler — システム仕様書

> **サービス名**: News Butler（ニュースバトラー）
> **リポジトリ**: `news-butler`
> **Version**: 2.3.0
> **Last Updated**: 2026-03-11
> **Status**: Active

サービスの機能・UI仕様は [`Spec_service.md`](./Spec_service.md) を参照。

---

## 目次

1. [システムアーキテクチャ](#1-システムアーキテクチャ)
2. [技術スタック](#2-技術スタック)
3. [データモデル](#3-データモデル)
4. [API仕様](#4-api仕様)
5. [Cloud Functions 一覧](#5-cloud-functions-一覧)
6. [ディレクトリ構成](#6-ディレクトリ構成)
7. [CI/CD 仕様](#7-cicd-仕様)
8. [開発ロードマップ](#8-開発ロードマップ)

---

## 1. システムアーキテクチャ

```
┌─────────────────────────────────────────────┐
│         Web アプリ（SvelteKit）              │
│                                             │
│  レポート一覧 │ レポート詳細 │ AI執事設定    │
└────────────┬────────────────────────────────┘
             │ REST API（Firebase Auth で認証）
┌────────────▼────────────────────────────────┐
│         Cloud Functions                      │
│                                             │
│  api（Express）   ←→  fetchAndSummarize      │
│                        （Cloud Scheduler）   │
│                        generateArticle       │
│                        （Cloud Scheduler）   │
└────────────┬────────────────────────────────┘
             │
┌────────────▼──────┐  ┌────────────────────┐
│    Firestore       │  │   Vertex AI         │
│  topics            │  │   (Gemini 1.5 Pro)  │
│  sources           │  │  要約生成            │
│  digest_configs    │  │  記事生成            │
│  summaries         │  └────────────────────┘
│  articles          │
└───────────────────┘
```

### 1.1 データフロー

```
[設定]
ユーザーがトピックを作成
    ↓
ソースをトピックに紐付け登録
    ↓
まとめ方（digest_config）を設定（スケジュール・プロンプト）

[収集・分析] ← Cloud Scheduler が毎時トリガー
fetchAndSummarize → 各ソースからRSS取得
    ↓
Vertex AI でトピック単位にAI要約 → summaries に保存

[記事生成] ← digest_config のスケジュール or 手動
generateArticle → 対象期間の summaries + promptTemplate → Vertex AI
    ↓
articles に保存

[閲覧]
WebアプリでAI生成記事（articles）を閲覧
```

---

## 2. 技術スタック

| レイヤー | 技術 | 用途 |
|---------|------|------|
| フロントエンド | SvelteKit + TypeScript + TailwindCSS + DaisyUI | Webアプリ |
| ホスティング | Firebase Hosting | SPA配信 |
| バックエンド | Cloud Functions (TypeScript) | API・バッチ処理 |
| データベース | Cloud Firestore（フラット構成） | 全データ |
| AI | Vertex AI (Gemini 1.5 Pro) | 要約・記事生成 |
| スケジューラ | Cloud Scheduler | 定期収集・生成 |
| 認証 | Firebase Auth | ユーザー認証 |
| CI/CD | GitHub Actions | テスト・デプロイ |
| CI レポート | Google Cloud Storage | テスト・カバレッジ・VRT レポート保存 |
| VRT | reg-suit + Playwright | ビジュアルリグレッションテスト |

---

## 3. データモデル

Firestoreのコレクションはすべてトップレベル（フラット構成）。
各ドキュメントのIDはFirestoreの自動生成ID。

### 3.1 `topics/{topicId}` — トピック（AI執事）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `name` | `string` | トピック名 |
| `description` | `string` | トピックの説明（AIへの指示に使用） |
| `iconUrl` | `string \| null` | Firebase Storage 上のアイコン画像 URL（null = デフォルトアイコン） |
| `iconColor` | `string` | アイコン背景色（hex、例: `"#6366f1"`） |
| `analysisConfig` | `object` | 分析軸設定（後述） |
| `isActive` | `boolean` | 有効/無効 |
| `createdAt` | `Timestamp` | 作成日時 |
| `updatedAt` | `Timestamp` | 更新日時 |

**`analysisConfig` オブジェクト:**

| キー | 型 | 説明 |
|-----|-----|------|
| `keywords` | `string[]` | 注目キーワード |
| `language` | `string` | 要約言語（`"ja"`, `"en"`） |
| `maxArticlesPerSummary` | `number` | 1要約あたりの最大記事数（デフォルト: 20） |

### 3.2 `sources/{sourceId}` — RSSソース

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `topicId` | `string` | 紐付くトピックID（FK） |
| `name` | `string` | ソース名 |
| `url` | `string` | RSS フィード URL |
| `type` | `string` | ソース種別（`"rss"`, `"atom"` など） |
| `isActive` | `boolean` | 有効/無効 |
| `lastFetchedAt` | `Timestamp \| null` | 最終取得日時 |
| `consecutiveErrors` | `number` | 連続エラー回数（3回で自動無効化） |
| `createdAt` | `Timestamp` | 作成日時 |
| `updatedAt` | `Timestamp` | 更新日時 |

### 3.3 `digest_configs/{configId}` — まとめ方（レポート設定）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `topicId` | `string` | 紐付くトピックID（FK） |
| `name` | `string` | 設定名 |
| `schedule` | `string \| null` | cron式（例: `"0 8 * * *"`）、nullは手動のみ |
| `promptTemplate` | `string` | 記事生成プロンプトのテンプレート |
| `periodHours` | `number` | 対象期間（時間）デフォルト: 24 |
| `isActive` | `boolean` | 有効/無効 |
| `lastRunAt` | `Timestamp \| null` | 最終実行日時 |
| `createdAt` | `Timestamp` | 作成日時 |
| `updatedAt` | `Timestamp` | 更新日時 |

### 3.4 `summaries/{summaryId}` — AI要約

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `topicId` | `string` | トピックID（FK） |
| `content` | `string` | AI要約テキスト（Markdown） |
| `sourceUrls` | `string[]` | 参照した記事URL群 |
| `articleCount` | `number` | 参照記事数 |
| `periodStart` | `Timestamp` | 対象期間の開始 |
| `periodEnd` | `Timestamp` | 対象期間の終了 |
| `createdAt` | `Timestamp` | 生成日時 |

### 3.5 `articles/{articleId}` — AI生成記事（レポート）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `digestConfigId` | `string` | 使用したdigest_configのID（FK） |
| `topicId` | `string` | トピックID（非正規化、クエリ用） |
| `summaryIds` | `string[]` | 使用したsummaryのID群 |
| `content` | `string` | 生成された記事本文（Markdown） |
| `createdAt` | `Timestamp` | 生成日時 |

---

## 4. API仕様

すべてのAPIは Firebase Auth の ID Token（`Authorization: Bearer <token>`）で認証。

### Topics

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/topics` | トピック一覧 |
| POST | `/api/topics` | トピック作成 |
| PUT | `/api/topics/:id` | トピック更新 |
| DELETE | `/api/topics/:id` | トピック削除 |

### Sources

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/sources?topicId=` | ソース一覧（topicId必須） |
| POST | `/api/sources` | ソース追加（body: topicId必須） |
| PUT | `/api/sources/:id` | ソース更新 |
| DELETE | `/api/sources/:id` | ソース削除 |
| POST | `/api/sources/:id/toggle` | 有効/無効切り替え |

### Digest Configs

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/digest-configs?topicId=` | まとめ方一覧（topicId必須） |
| POST | `/api/digest-configs` | まとめ方作成 |
| PUT | `/api/digest-configs/:id` | まとめ方更新 |
| DELETE | `/api/digest-configs/:id` | まとめ方削除 |

### Summaries

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/summaries?topicId=` | 要約一覧（フィルタ: topicId, from, to） |

### Articles

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/articles` | 記事一覧（フィルタ: topicId, digestConfigId） |
| GET | `/api/articles/:id` | 記事詳細 |
| POST | `/api/articles/generate` | 記事手動生成（body: digestConfigId, from?, to?） |

---

## 5. Cloud Functions 一覧

| Function名 | トリガー | 説明 |
|-----------|---------|------|
| `api` | HTTP（Express） | REST API |
| `fetchAndSummarize` | Cloud Scheduler（毎時） | RSS収集 + トピック単位AI要約 |
| `generateArticleScheduled` | Cloud Scheduler（digest_config設定に従う） | スケジュール記事生成 |

---

## 6. ディレクトリ構成

```
news-butler/
├── functions/
│   └── src/
│       ├── index.ts                    # Functions エントリポイント
│       ├── types.ts                    # 全インターフェース定義
│       ├── services/
│       │   ├── rssService.ts           # RSS取得
│       │   └── vertexAiService.ts      # Vertex AI ラッパー
│       ├── api/
│       │   ├── router.ts               # Express ルーター
│       │   ├── topics.ts               # トピック CRUD
│       │   ├── sources.ts              # ソース CRUD
│       │   ├── digestConfigs.ts        # まとめ方 CRUD
│       │   ├── summaries.ts            # 要約取得
│       │   └── articles.ts             # 記事取得・手動生成
│       └── handlers/
│           ├── fetchAndSummarize.ts    # RSS収集・要約バッチ
│           └── generateArticle.ts      # 記事生成ロジック
├── frontend/
│   └── src/
│       ├── lib/
│       │   ├── api.ts                  # API クライアント
│       │   └── firebase.ts             # Firebase 初期化
│       └── routes/
│           ├── +layout.svelte          # サイドバー/タブバーレイアウト
│           ├── reports/                # 新着レポート一覧・詳細
│           └── butlers/                # AI執事
│               ├── +page.svelte        # AI執事一覧
│               └── [id]/
│                   ├── +page.svelte    # AI執事詳細
│                   ├── sources/        # ソース（情報元）管理
│                   └── reports/        # レポート設定
│                       └── [report_id]/# レポート設定詳細
├── .github/
│   └── workflows/
│       ├── firebase-hosting-pull-request.yml  # PR チェック・プレビューデプロイ
│       ├── firebase-hosting-merge.yml          # 本番デプロイ・VRTベースライン更新
│       └── cleanup-gcs-reports.yml             # GCS レポート削除
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── Spec.md          # このファイル（システム仕様書）
├── Spec_service.md  # サービス仕様書
└── README.md        # 環境構築手順
```

---

## 7. CI/CD 仕様

### 7.1 ワークフロー一覧

| ファイル | トリガー | 概要 |
|---------|---------|------|
| `firebase-hosting-pull-request.yml` | PR 作成・更新・クローズ | PR ごとのチェック・プレビューデプロイ |
| `firebase-hosting-merge.yml` | `main` へのプッシュ（マージ） | 本番デプロイ・VRTベースライン更新 |
| `cleanup-gcs-reports.yml` | PR クローズ / force push | GCS レポートの削除 |

### 7.2 PR ワークフロー（`firebase-hosting-pull-request.yml`）

#### ジョブ依存関係

```
lint_and_check ──────────────────────────────────────┐
frontend_check ───────────────────────┐               ├─→ report_comment
visual_regression (needs: frontend_check) ───────────┘
build_and_preview (needs: lint_and_check, frontend_check)
unregister_preview_domain (PR クローズ時のみ)
```

#### `lint_and_check`（Functions 検査）

1. ESLint (`npm run lint`)
2. TypeScript ビルド (`npm run build`)
3. Jest ユニットテスト + カバレッジ (`npm run test:coverage`)
4. GCS にレポートをアップロード
   - テストレポート: `gs://akanmi-news-butler-ci/functions/ut/{SHA}.html`
   - カバレッジレポート: `gs://akanmi-news-butler-ci/functions/coverage/{SHA}/`
5. GitHub Check Run として結果を投稿（`Functions UT` / `Functions Coverage`）

#### `frontend_check`（フロントエンド検査）

1. svelte-check 型チェック (`npm run check`)
2. Vitest ユニットテスト + カバレッジ (`npm run test:coverage`)
3. GCS にレポートをアップロード
   - テストレポート: `gs://akanmi-news-butler-ci/frontend/ut/{SHA}/`
   - カバレッジレポート: `gs://akanmi-news-butler-ci/frontend/coverage/{SHA}/`
4. GitHub Check Run として結果を投稿（`Frontend UT` / `Frontend Coverage`）

#### `visual_regression`（VRT + E2E）

1. フロントエンドを **ダミー Firebase 設定** でビルド（`VITE_VRT_AUTH_BYPASS=true`）
2. Playwright でスクリーンショット取得（Chromium / WebKit / モバイル）
   - ページ5種: `reports`、`butlers`、`report-detail`、`butler-detail`、`butler-sources`
   - モーダル2種: `butler-create-modal`（新規作成）、`butler-edit-modal`（編集）
3. Playwright E2E テスト実行
4. reg-suit で GCS 上のベースラインと比較・レポート公開
   - ベースライン: `gs://akanmi-news-butler-ci/vrt/{SHA}/`
5. GitHub Check Run として VRT 結果を投稿（`VRT`）
6. VRT レポートを GitHub Artifact にも保存（30日保持）

**VRT 判定基準:**

| 状態 | 結論 |
|------|------|
| 変更あり（changed > 0） | `failure` ❌ |
| 新規・削除のみ（new or deleted > 0） | `neutral` ⚠️ |
| 全パス | `success` ✅ |

#### `build_and_preview`（プレビューデプロイ）

**前提**: `lint_and_check` + `frontend_check` が成功

1. フロントエンドを実際の Firebase 設定（GitHub Actions variables）でビルド
2. Functions をビルド
3. `FirebaseExtended/action-hosting-deploy@v0` でプレビューチャンネルへデプロイ
4. Functions を本番プロジェクトへデプロイ
5. プレビュー URL のドメインを Firebase Auth Authorized Domains に自動登録

#### `unregister_preview_domain`（PR クローズ時）

`akanmi-news-butler--pr{番号}-.*\.web\.app` パターンにマッチするドメインを Authorized Domains から自動削除。

#### `report_comment`（PR コメント集約）

全ジョブ完了後、PR に CI 結果サマリーコメントを投稿（2回目以降は更新）。

### 7.3 マージワークフロー（`firebase-hosting-merge.yml`）

#### `build_and_deploy`

1. フロントエンドビルド（実際の Firebase 設定）
2. Functions ビルド + ユニットテスト（カバレッジ付き）
3. カバレッジレポートを GCS に保存: `gs://akanmi-news-butler-ci/coverage/{SHA}.html`
4. Firestore Rules をデプロイ
5. Firebase Hosting を本番チャンネル（`live`）へデプロイ

#### `update_visual_baseline`

1. フロントエンドをダミー設定でビルド（**`VITE_VRT_AUTH_BYPASS=true` 必須**）
2. Playwright でスクリーンショット取得（7種 × 3デバイス = 21枚）
3. reg-suit でベースラインを GCS に公開
4. 前の SHA のレポートを GCS から削除

### 7.4 GCS クリーンアップ（`cleanup-gcs-reports.yml`）

| トリガー | 削除対象 |
|---------|---------|
| PR クローズ | PR の HEAD SHA に紐づくレポート |
| force push（main 以外） | 上書きされた旧 SHA のレポート |

**削除パス:**
- `gs://akanmi-news-butler-ci/vrt/{SHA}/`
- `gs://akanmi-news-butler-ci/coverage/{SHA}/`
- `gs://akanmi-news-butler-ci/functions/ut/{SHA}.html`
- `gs://akanmi-news-butler-ci/functions/coverage/{SHA}/`

### 7.5 GitHub Actions シークレット / 変数

#### Secrets（機密値）

| Secret 名 | 用途 |
|-----------|------|
| `FIREBASE_SERVICE_ACCOUNT_AKANMI_NEWS_BUTLER` | Firebase Hosting / Functions / Firestore Rules デプロイ、Firebase Auth Authorized Domains 操作 |
| `GCS_CLIENT_EMAIL` | CI 専用 SA のメールアドレス（GCS レポートアップロード用） |
| `GCS_PRIVATE_KEY` | CI 専用 SA の秘密鍵（PEM 形式） |

#### Variables（公開値）

| Variable 名 | 用途 |
|------------|------|
| `VITE_FIREBASE_API_KEY` | Firebase SDK 初期化 |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth ドメイン |
| `VITE_FIREBASE_PROJECT_ID` | Firebase プロジェクト ID |
| `VITE_FIREBASE_APP_ID` | Firebase アプリ ID |
| `VITE_API_BASE_URL` | Cloud Functions API エンドポイント |

> `VITE_FIREBASE_*` はブラウザに埋め込まれる公開値のため、Secrets ではなく Variables に設定すること。

### 7.6 Firebase Auth Authorized Domains 自動管理

#### 登録（PR オープン時）

1. プレビューデプロイ後、デプロイ URL からホスト名を抽出
2. サービスアカウントで `gcloud auth` → アクセストークン取得
3. Identity Toolkit Admin API PATCH でドメインを追加:
   ```
   PATCH https://identitytoolkit.googleapis.com/admin/v2/projects/akanmi-news-butler/config
   Body: { "authorizedDomains": [...既存, "新規ホスト名"] }
   updateMask: authorizedDomains
   ```

#### 削除（PR クローズ時）

`akanmi-news-butler--pr{PR番号}-.*\.web\.app` にマッチするドメインを一括削除した上で同 API で更新。

---

## 8. 開発ロードマップ

### Phase 1 — MVP（現在のスコープ）

**ゴール**: RSSを登録して、トピックを指定すれば、AIまとめがWebで読める

| # | 内容 | 依存 |
|---|------|------|
| 1 | types.ts — 全インターフェース定義 | — |
| 2 | vertexAiService.ts — Vertex AI ラッパー | 1 |
| 3 | rssService.ts — RSS取得サービス | 1 |
| 4 | REST API 基盤 — Express + 認証ミドルウェア | 1 |
| 5 | Topic CRUD | 4 |
| 6 | Source CRUD | 4 |
| 7 | DigestConfig CRUD | 4 |
| 8 | Summary 取得 API | 4 |
| 9 | Article 取得・手動生成 API | 4, 7, 8 |
| 10 | fetchAndSummarize — RSS収集・AI要約バッチ | 2, 3 |
| 11 | generateArticle — 記事生成ロジック | 2, 7, 8 |
| 12 | フロントエンド基盤 — レイアウト・API クライアント・認証 | — |
| 13 | ソース管理UI | 12, 6 |
| 14 | トピック管理UI | 12, 5, 7 |
| 15 | ダイジェスト閲覧UI | 12, 9 |
| 16 | 要約記事UI | 12, 8 |

### Phase 2 — 品質改善

- Good / Bad フィードバック機能
- フィードバックをもとにしたプロンプト改善
- 記事クラスタリング（BigQuery ML）
- コンプライアンス基盤（robots.txt チェック）

### Phase 3 — 拡張

- プロンプト学習エンジン
- AIソース発見・推薦エンジン
- メルマガ配信機能（SendGrid）
- BigQuery 分析基盤

---

*旧仕様書（v1.4.0）は `Spec_v1.4.0_archive.md` に保存済み。*
