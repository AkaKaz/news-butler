# News Butler — システム仕様書

> **サービス名**: News Butler（ニュースバトラー）
> **リポジトリ**: `news-butler`
> **コンセプト**: RSSを収集し、AI執事が指定テーマでレポートを生成、Webで読む
> **Version**: 2.2.0
> **Last Updated**: 2026-03-10
> **Status**: Active

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システムアーキテクチャ](#2-システムアーキテクチャ)
3. [技術スタック](#3-技術スタック)
4. [データモデル](#4-データモデル)
5. [機能仕様](#5-機能仕様)
6. [API仕様](#6-api仕様)
7. [Cloud Functions 一覧](#7-cloud-functions-一覧)
8. [ディレクトリ構成](#8-ディレクトリ構成)
9. [開発ロードマップ](#9-開発ロードマップ)

---

## 1. プロジェクト概要

### 1.1 目的

**News Butler** は、複数のRSSフィードを自動収集し、ユーザーが指定したトピックに沿ってAIが記事をまとめ、Webアプリで読めるようにするニュース集約システム。

### 1.2 MVP（Phase 1）のゴール

> **「RSSを登録して、トピックを指定すれば、AIまとめがWebで読める」**

- RSSフィードの登録・管理（トピックに紐付け）
- 定期的な記事収集・AI要約
- まとめ方（スケジュール・プロンプト）の設定
- 要約をもとにしたAI記事生成
- WebアプリでトピックごとのAI記事を閲覧

### 1.3 将来フェーズ（Phase 1では実装しない）

| 機能 | 理由 |
|------|------|
| メール配信（SendGrid） | Phase 1のゴール外 |
| 購読者管理 | 配信機能が前提 |
| Good/Bad フィードバック学習 | Phase 2 |
| 記事クラスタリング（BigQuery ML） | Phase 2 |
| プロンプト学習エンジン | Phase 3 |
| AIソース発見（Webスクレイピング） | Phase 3 |
| コンプライアンス基盤（robots.txt） | Phase 2 |

---

## 2. システムアーキテクチャ

```
┌─────────────────────────────────────────────┐
│         Web アプリ（SvelteKit）              │
│                                             │
│  ダイジェスト │ 要約記事 │ 設定              │
│              │          │  ソース一覧        │
│              │          │  トピック一覧      │
└────────────┬────────────────────────────────┘
             │ REST API
┌────────────▼────────────────────────────────┐
│         Cloud Functions                      │
│                                             │
│  api（Express）   ←→  fetchAndSummarize      │
│                        （Scheduler）         │
│                        generateArticle       │
└────────────┬────────────────────────────────┘
             │
┌────────────▼──────┐  ┌────────────────────┐
│    Firestore       │  │   Vertex AI         │
│                   │  │   (Gemini 1.5 Pro)   │
│  topics            │  │                    │
│  sources           │  │  要約生成            │
│  digest_configs    │  │  記事生成            │
│  summaries         │  └────────────────────┘
│  articles          │
└───────────────────┘
```

### 2.1 データフロー

```
[設定]
ユーザーがトピックを作成
    ↓
ソースをトピックに紐付け登録
    ↓
まとめ方（digest_config）を設定（スケジュール・プロンプト）

[収集・分析]
Cloud Scheduler → fetchAndSummarize → 各ソースからRSS取得
    ↓
Vertex AI でトピック単位にAI要約 → summaries に保存

[記事生成]
digest_config のスケジュール or 手動 → generateArticle
    ↓
対象期間の summaries + digest_config のプロンプト → Vertex AI
    ↓
articles に保存

[閲覧]
WebアプリでAI生成記事（articles）を閲覧
```

---

## 3. 技術スタック

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

---

## 4. データモデル

Firestoreのコレクションはすべてトップレベル（フラット構成）。
各ドキュメントのIDはFirestoreの自動生成ID。

### 4.1 `topics/{topicId}` — トピック

ユーザーが「何について知りたいか」を定義する基本単位。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `name` | `string` | トピック名（例: 「AI最新動向」） |
| `description` | `string` | トピックの説明（AIへの指示に使用） |
| `analysisConfig` | `object` | 分析軸設定（後述） |
| `isActive` | `boolean` | 有効/無効 |
| `createdAt` | `Timestamp` | 作成日時 |
| `updatedAt` | `Timestamp` | 更新日時 |

**`analysisConfig` フィールド（JSON）:**

| キー | 型 | 説明 |
|-----|-----|------|
| `keywords` | `string[]` | 注目キーワード（フィルタ・重み付けに使用） |
| `language` | `string` | 要約言語（例: `"ja"`, `"en"`） |
| `maxArticlesPerSummary` | `number` | 1要約あたりの最大記事数（デフォルト: 20） |

### 4.2 `sources/{sourceId}` — RSSソース

各ソースは1つのトピックに紐付く。

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

### 4.3 `digest_configs/{configId}` — まとめ方

「いつ・どのように記事を生成するか」を定義する。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `topicId` | `string` | 紐付くトピックID（FK） |
| `name` | `string` | 設定名（例: 「毎朝のまとめ」） |
| `schedule` | `string \| null` | cron式（例: `"0 8 * * *"`）、nullは手動のみ |
| `promptTemplate` | `string` | 記事生成プロンプトのテンプレート |
| `periodHours` | `number` | 対象期間（時間）デフォルト: 24 |
| `isActive` | `boolean` | 有効/無効 |
| `lastRunAt` | `Timestamp \| null` | 最終実行日時 |
| `createdAt` | `Timestamp` | 作成日時 |
| `updatedAt` | `Timestamp` | 更新日時 |

### 4.4 `summaries/{summaryId}` — AI要約

RSSから収集した記事をトピック単位でAI分析した結果。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `topicId` | `string` | トピックID（FK） |
| `content` | `string` | AI要約テキスト（Markdown） |
| `sourceUrls` | `string[]` | 参照した記事URL群 |
| `articleCount` | `number` | 参照記事数 |
| `periodStart` | `Timestamp` | 対象期間の開始 |
| `periodEnd` | `Timestamp` | 対象期間の終了 |
| `createdAt` | `Timestamp` | 生成日時 |

### 4.5 `articles/{articleId}` — AI生成記事

`digest_config` の指示と `summaries` をもとにAIが生成した最終記事。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `digestConfigId` | `string` | 使用したdigest_configのID（FK） |
| `topicId` | `string` | トピックID（非正規化、クエリ用） |
| `summaryIds` | `string[]` | 使用したsummaryのID群 |
| `content` | `string` | 生成された記事本文（Markdown） |
| `createdAt` | `Timestamp` | 生成日時 |

---

## 5. 機能仕様

### 5.1 トピック管理

- トピックの登録・編集・削除・有効/無効切り替え
- `analysisConfig`（キーワード・言語・記事数上限）の設定

### 5.2 ソース管理

- RSSフィードURLをトピックに紐付けて登録・編集・削除・有効/無効切り替え
- URLバリデーション（RSSフィードとして有効か確認）
- 連続エラー3回でソースを自動無効化

### 5.3 まとめ方（digest_config）管理

- digest_configの登録・編集・削除
- スケジュール（cron式）または手動実行の設定
- プロンプトテンプレートの編集

### 5.4 RSS収集・AI要約（fetchAndSummarize）

- Cloud Scheduler が定期的（デフォルト: 毎時）に全アクティブソースを巡回
- `rss-parser` でフィードを取得
- トピック単位で未処理記事をまとめてVertex AI (Gemini 1.5 Pro) に送信
- `analysisConfig` に基づきAI要約を生成 → `summaries` に保存
- 取得成功後に `lastFetchedAt` を更新、エラー時は `consecutiveErrors` をインクリメント

### 5.5 AI記事生成（generateArticle）

- `digest_config` のスケジュール発火 or ユーザーが手動で「今すぐ生成」
- 対象期間内の `summaries` を取得
- `summaries` の内容 + `promptTemplate` を Vertex AI に送信
- 生成結果を `articles` に保存

### 5.6 WebアプリのUI

#### UI用語（フロントエンド表示名）

バックエンドのコレクション名・API名とは異なる表示用語を使用する。

| バックエンド | UI表示 | 説明 |
|------------|--------|------|
| `topics` | AI執事 | RSSを収集・レポート生成するAIエージェント |
| `articles` | レポート | AI執事が生成した最終レポート |
| `digest_configs` | レポート設定 | いつ・どのようにレポートを生成するかの設定 |
| `sources` | ソース（情報元） | RSS フィード（変更なし） |

#### ルーティング

```
/reports                        # 新着レポート一覧（全AI執事）
/reports/{id}                   # レポート詳細
/butlers                        # AI執事一覧
/butlers/{id}                   # AI執事詳細
/butlers/{id}/sources           # AI執事のソース（情報元）管理
/butlers/{id}/reports           # AI執事のレポート設定一覧
/butlers/{id}/reports/{id}      # レポート設定詳細 + 生成レポート一覧
```

#### 画面構成

| 画面 | URL | 内容 |
|------|-----|------|
| 新着レポート | `/reports` | 全AI執事が生成したレポート一覧 |
| レポート詳細 | `/reports/{id}` | Markdownレンダリング |
| AI執事一覧 | `/butlers` | AI執事の一覧 |
| AI執事詳細 | `/butlers/{id}` | アイコン・名前・説明・ソース・レポート設定一覧 |
| ソース管理 | `/butlers/{id}/sources` | ソースの登録・編集・削除・有効/無効 |
| レポート設定 | `/butlers/{id}/reports/{id}` | 名前・説明・プロンプト・頻度・レポート一覧 |

**レイアウト:**
- PC（lg+）: 左固定サイドバー（新着 / AI執事）+ メインコンテンツ
- モバイル: 下部タブバー（新着 / AI執事）+ 横スワイプで画面切り替え

---

## 6. API仕様

すべてのAPIは Firebase Auth の ID Token で認証。

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

## 7. Cloud Functions 一覧

| Function名 | トリガー | 説明 |
|-----------|---------|------|
| `api` | HTTP（Express） | REST API |
| `fetchAndSummarize` | Cloud Scheduler（毎時） | RSS収集 + トピック単位AI要約 |
| `generateArticleScheduled` | Cloud Scheduler（digest_config設定に従う） | スケジュール記事生成 |

---

## 8. ディレクトリ構成

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
│                   ├── +page.svelte    # AI執事詳細（レポート一覧タブ）
│                   ├── sources/        # ソース（情報元）管理
│                   └── reports/        # レポート設定
│                       └── [report_id]/# レポート設定詳細
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── Spec.md
```

---

## 9. 開発ロードマップ

### Phase 1 — MVP（現在のスコープ）

**ゴール**: RSSを登録して、トピックを指定すれば、AIまとめがWebで読める

| # | Issue | 内容 | 依存 |
|---|-------|------|------|
| 1 | types.ts | 全インターフェース定義（Topic, Source, DigestConfig, Summary, Article） | - |
| 2 | vertexAiService.ts | Vertex AI（Gemini）ラッパー | 1 |
| 3 | rssService.ts | RSS取得サービス | 1 |
| 4 | REST API 基盤 | Express + 認証ミドルウェア | 1 |
| 5 | トピック API | Topic CRUD | 4 |
| 6 | ソース API | Source CRUD | 4 |
| 7 | まとめ方 API | DigestConfig CRUD | 4 |
| 8 | 要約 API | Summary 取得 | 4 |
| 9 | 記事 API | Article 取得・手動生成 | 4,7,8 |
| 10 | fetchAndSummarize | RSS収集・AI要約バッチ | 2,3 |
| 11 | generateArticle | 記事生成ロジック | 2,7,8 |
| 12 | フロントエンド基盤 | レイアウト・API クライアント・認証 | - |
| 13 | ソース管理UI | 登録・編集・削除画面 | 12,6 |
| 14 | トピック管理UI | トピック・まとめ方設定画面 | 12,5,7 |
| 15 | ダイジェスト閲覧UI | AI生成記事一覧・詳細 | 12,9 |
| 16 | 要約記事UI | Summary一覧 | 12,8 |

### Phase 2 — 品質改善

- Good / Bad フィードバック機能
- フィードバックをもとにしたプロンプト改善
- 記事クラスタリング（類似記事のグループ化）
- コンプライアンス基盤（robots.txt チェック）

### Phase 3 — 拡張

- プロンプト学習エンジン（対話によるプロンプト育成）
- AIソース発見・推薦エンジン
- メルマガ配信機能（SendGrid）
- BigQuery 分析基盤

---

*旧仕様書（v1.4.0）は `Spec_v1.4.0_archive.md` に保存済み。*
