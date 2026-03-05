# News Butler — システム仕様書

> **サービス名**: News Butler（ニュースバトラー）
> **リポジトリ**: `news-butler`
> **コンセプト**: RSSを収集し、指定したトピックで記事をAIまとめ、Webで読む
> **Version**: 2.0.0
> **Last Updated**: 2026-03-05
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

- RSSフィードの登録・管理
- 定期的な記事収集
- 記事のAI分析（要約・キーワード・カテゴリ）
- トピック指定によるAIダイジェスト生成
- WebアプリでRSS管理・記事一覧・ダイジェスト閲覧

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
│  ソース管理 │ トピック管理 │ ダイジェスト閲覧 │
│            │ 記事一覧     │                 │
└────────────┬────────────────────────────────┘
             │ REST API
┌────────────▼────────────────────────────────┐
│         Cloud Functions                      │
│                                             │
│  api（Express）   ←→  fetchRss（Scheduler）  │
│                        analyzeArticle        │
│                        generateDigest        │
└────────────┬────────────────────────────────┘
             │
┌────────────▼──────┐  ┌────────────────────┐
│    Firestore       │  │   Vertex AI         │
│                   │  │   (Gemini 1.5 Pro)   │
│  sources           │  │                    │
│  articles          │  │  記事分析・要約      │
│  topics            │  │  ダイジェスト生成    │
│  digests           │  └────────────────────┘
└───────────────────┘
```

### 2.1 データフロー

```
ユーザーがRSS登録
    ↓
Cloud Scheduler（毎時）→ fetchRss → 新着記事をFirestoreに保存
    ↓
Firestoreトリガー → analyzeArticle → AI要約・キーワード・カテゴリをArticleに書き戻し
    ↓
ユーザーがトピック指定 or 定期スケジュール → generateDigest → DigestをFirestoreに保存
    ↓
WebアプリでDigest閲覧
```

---

## 3. 技術スタック

| レイヤー | 技術 | 用途 |
|---------|------|------|
| フロントエンド | SvelteKit + TypeScript | Webアプリ |
| ホスティング | Firebase Hosting | SPA配信 |
| バックエンド | Cloud Functions (TypeScript) | API・バッチ処理 |
| データベース | Cloud Firestore | 全データ |
| AI | Vertex AI (Gemini 1.5 Pro) | 記事分析・ダイジェスト生成 |
| スケジューラ | Cloud Scheduler | RSS定期収集 |
| 認証 | Firebase Auth | ユーザー認証 |
| CI/CD | GitHub Actions | テスト・デプロイ |

---

## 4. データモデル

### 4.1 `sources/{sourceId}` — RSSソース

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `name` | `string` | ソース名 |
| `url` | `string` | RSS フィード URL |
| `category` | `string` | カテゴリ（任意） |
| `tags` | `string[]` | タグ |
| `isActive` | `boolean` | 有効/無効 |
| `fetchIntervalMinutes` | `number` | 巡回間隔（分）デフォルト: 60 |
| `lastFetchedAt` | `Timestamp \| null` | 最終取得日時 |
| `consecutiveErrors` | `number` | 連続エラー回数（3回で自動無効化） |
| `createdAt` | `Timestamp` | 作成日時 |
| `updatedAt` | `Timestamp` | 更新日時 |

### 4.2 `articles/{articleId}` — 収集記事

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `sourceId` | `string` | RSSソースID |
| `sourceName` | `string` | ソース名（非正規化） |
| `title` | `string` | 記事タイトル |
| `url` | `string` | 記事URL（ユニーク） |
| `content` | `string` | 本文テキスト（最大5,000文字） |
| `author` | `string \| null` | 著者 |
| `publishedAt` | `Timestamp` | 公開日時 |
| `fetchedAt` | `Timestamp` | 取得日時 |
| `isProcessed` | `boolean` | AI分析完了フラグ |
| `aiSummary` | `string \| null` | AI要約（200文字以内） |
| `aiKeywords` | `string[]` | AIキーワード（最大5個） |
| `aiCategory` | `string \| null` | AIカテゴリ |
| `aiRelevanceScore` | `number \| null` | 重要度スコア (0-100) |

### 4.3 `topics/{topicId}` — トピック

ユーザーが「どんな記事をまとめてほしいか」を定義する。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `name` | `string` | トピック名（例: 「AI最新動向」） |
| `description` | `string` | トピックの説明（AIへの指示に使用） |
| `keywords` | `string[]` | 関連キーワード |
| `sourceIds` | `string[]` | 対象RSSソースID（空の場合は全ソース） |
| `scheduleEnabled` | `boolean` | 定期生成の有効/無効 |
| `scheduleCron` | `string \| null` | 生成スケジュール（cron式） |
| `isActive` | `boolean` | 有効/無効 |
| `createdAt` | `Timestamp` | 作成日時 |
| `updatedAt` | `Timestamp` | 更新日時 |

### 4.4 `digests/{digestId}` — AIダイジェスト

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `topicId` | `string` | トピックID |
| `topicName` | `string` | トピック名（非正規化） |
| `content` | `string` | 生成されたダイジェスト本文（Markdown） |
| `articleIds` | `string[]` | 使用した記事ID群 |
| `articleCount` | `number` | 使用記事数 |
| `periodStart` | `Timestamp` | 対象期間の開始 |
| `periodEnd` | `Timestamp` | 対象期間の終了 |
| `generatedAt` | `Timestamp` | 生成日時 |

---

## 5. 機能仕様

### 5.1 ソース管理

- RSSフィードURLを登録・編集・削除・有効/無効切り替え
- URLバリデーション（RSSフィードとして有効か確認）
- 連続エラー3回でソースを自動無効化・ユーザーに通知

### 5.2 RSS収集（fetchRss）

- Cloud Scheduler が1時間ごとに全アクティブソースを巡回
- `rss-parser` ライブラリでフィードを取得
- URLの重複チェックでDBにない記事だけ保存
- 取得成功後に `lastFetchedAt` を更新
- エラー時は `consecutiveErrors` をインクリメント

### 5.3 AI記事分析（analyzeArticle）

- Firestore の `articles` コレクションに新規ドキュメントが作成されたとき発火
- Vertex AI (Gemini 1.5 Pro) に記事本文を送信し以下を取得:
  - **aiSummary**: 200文字以内の要約
  - **aiKeywords**: 記事を表すキーワード最大5個
  - **aiCategory**: 記事カテゴリ（例: テクノロジー、ビジネス、科学）
  - **aiRelevanceScore**: 一般的な重要度スコア 0-100
- 結果を同ドキュメントに書き戻し、`isProcessed = true` に更新

### 5.4 ダイジェスト生成（generateDigest）

- ユーザーがWebUIから「今すぐ生成」ボタンを押す、またはスケジュール発火
- トピックの `description` と `keywords` をもとに、対象期間の記事（デフォルト: 過去24時間）から関連記事を選定
- 選定した記事をVertex AI (Gemini 1.5 Pro) に渡してダイジェストを生成
  - 形式: Markdown
  - 内容: 各記事の重要ポイント、トレンドのまとめ、注目事項
- 生成結果を `digests` コレクションに保存

### 5.5 WebアプリのUI

| 画面 | 内容 |
|------|------|
| ダッシュボード | 最新ダイジェスト一覧、ソース稼働状況 |
| ソース管理 | RSS登録・編集・削除・有効/無効切り替え |
| 記事一覧 | ソース別・キーワード別フィルタ、AI要約表示 |
| トピック管理 | トピック登録・編集・削除 |
| ダイジェスト詳細 | Markdownレンダリング、使用記事リスト |

---

## 6. API仕様

すべてのAPIは Firebase Auth の ID Token で認証。

### Sources

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/sources` | ソース一覧 |
| POST | `/api/sources` | ソース追加 |
| PUT | `/api/sources/:id` | ソース更新 |
| DELETE | `/api/sources/:id` | ソース削除 |
| POST | `/api/sources/:id/toggle` | 有効/無効切り替え |

### Articles

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/articles` | 記事一覧（フィルタ: sourceId, keyword, from, to, limit） |
| GET | `/api/articles/:id` | 記事詳細 |

### Topics

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/topics` | トピック一覧 |
| POST | `/api/topics` | トピック追加 |
| PUT | `/api/topics/:id` | トピック更新 |
| DELETE | `/api/topics/:id` | トピック削除 |

### Digests

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/digests` | ダイジェスト一覧（フィルタ: topicId） |
| GET | `/api/digests/:id` | ダイジェスト詳細 |
| POST | `/api/digests/generate` | ダイジェスト手動生成（body: topicId, from?, to?） |

---

## 7. Cloud Functions 一覧

| Function名 | トリガー | 説明 |
|-----------|---------|------|
| `api` | HTTP（Express） | REST API |
| `fetchRss` | Cloud Scheduler（毎時） | 全アクティブソースのRSS取得 |
| `analyzeArticle` | Firestore onCreate（articles） | 記事AI分析 |
| `generateDigestScheduled` | Cloud Scheduler（Topic設定に従う） | スケジュールダイジェスト生成 |

---

## 8. ディレクトリ構成

```
news-butler/
├── functions/
│   └── src/
│       ├── index.ts              # Functions エントリポイント
│       ├── types.ts              # 全インターフェース定義
│       ├── services/
│       │   ├── rssService.ts     # RSS取得
│       │   └── vertexAiService.ts # Vertex AI ラッパー
│       ├── api/
│       │   ├── router.ts         # Express ルーター
│       │   ├── sources.ts        # ソース CRUD
│       │   ├── articles.ts       # 記事取得
│       │   ├── topics.ts         # トピック CRUD
│       │   └── digests.ts        # ダイジェスト操作
│       └── handlers/
│           ├── fetchRss.ts       # RSS収集バッチ
│           ├── analyzeArticle.ts # 記事分析トリガー
│           └── generateDigest.ts # ダイジェスト生成ロジック
├── frontend/
│   └── src/
│       ├── lib/
│       │   ├── api.ts            # API クライアント
│       │   └── firebase.ts       # Firebase 初期化
│       └── routes/
│           ├── +page.svelte      # ダッシュボード
│           ├── sources/          # ソース管理
│           ├── articles/         # 記事一覧
│           ├── topics/           # トピック管理
│           └── digests/          # ダイジェスト閲覧
├── firebase.json
├── firestore.rules
└── Spec.md
```

---

## 9. 開発ロードマップ

### Phase 1 — MVP（現在のスコープ）

**ゴール**: RSSを登録して、トピックを指定すれば、AIまとめがWebで読める

| # | Issue | 内容 | 依存 |
|---|-------|------|------|
| 1 | types.ts | 全インターフェース定義 | - |
| 2 | vertexAiService.ts | Vertex AI（Gemini）ラッパー | 1 |
| 3 | rssService.ts | RSS取得サービス | 1 |
| 4 | REST API 基盤 | Express + 認証ミドルウェア | 1 |
| 5 | ソース管理 API | Source CRUD | 4 |
| 6 | 記事取得 API | Article 一覧・詳細 | 4 |
| 7 | トピック管理 API | Topic CRUD | 4 |
| 8 | ダイジェスト API | Digest 生成・取得 | 4,7 |
| 9 | fetchRss Function | RSS収集バッチ | 3 |
| 10 | analyzeArticle Function | 記事AI分析トリガー | 2 |
| 11 | generateDigest Function | ダイジェスト生成ロジック | 2,7,8 |
| 12 | フロントエンド基盤 | SvelteKit 初期化・API クライアント | - |
| 13 | ソース管理UI | 登録・編集・削除画面 | 12,5 |
| 14 | 記事一覧UI | フィルタ付き一覧 | 12,6 |
| 15 | トピック管理UI | 登録・編集・削除画面 | 12,7 |
| 16 | ダイジェスト閲覧UI | Markdown表示・記事リスト | 12,8 |
| 17 | ダッシュボード | 最新ダイジェスト・ソース状態 | 13〜16 |

### Phase 2 — 品質改善

- Good / Bad フィードバック機能（記事・ダイジェストへの評価）
- フィードバックをもとにしたダイジェスト生成の精度向上
- 記事クラスタリング（類似記事のグループ化）
- コンプライアンス基盤（robots.txt チェック）

### Phase 3 — 拡張

- プロンプト学習エンジン（対話によるプロンプト育成）
- AIソース発見・推薦エンジン
- メルマガ配信機能（SendGrid）
- BigQuery 分析基盤

---

*旧仕様書（v1.4.0）は `Spec_v1.4.0_archive.md` に保存済み。*
