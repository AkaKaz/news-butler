# News Butler — システム仕様書

> **サービス名**: News Butler（ニュースバトラー）
> **リポジトリ**: `news-butler`
> **コンセプト**: あなた専属のAI執事が、ニュースを集めて読んで、毎日お届けするニュースインテリジェンスシステム
> **キャラクター**: AI執事「バトラーくん」— 知的で丁寧、ちょっとユーモアのある情報専属執事。
> **Version**: 1.4.0
> **Last Updated**: 2026-03-02
> **Status**: Draft

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システムアーキテクチャ](#2-システムアーキテクチャ)
3. [技術スタック](#3-技術スタック)
4. [データモデル](#4-データモデル)
5. [機能仕様](#5-機能仕様)
   - 5.1 [情報ソース管理・収集](#51-情報ソース管理収集)
   - 5.2 [AI記事分析](#52-ai記事分析)
   - 5.3 [メルマガ管理・生成](#53-メルマガ管理生成)
   - 5.4 [プロンプト学習エンジン](#54-プロンプト学習エンジン)
   - 5.5 [配信・購読管理](#55-配信購読管理)
   - 5.6 [BigQuery分析基盤](#56-bigquery分析基盤)
   - 5.7 [管理ダッシュボード](#57-管理ダッシュボード)
   - 5.8 [パーソナルリーダー](#58-パーソナルリーダーmode-a)
6. [AIソース発見エンジン 詳細設計](#6-aiソース発見エンジン-詳細設計)
   - 6.1 [設計思想](#61-設計思想-1)
   - 6.2 [AI推薦フロー](#62-ai推薦フロー)
   - 6.3 [フィード発見パイプライン](#63-フィード発見パイプライン)
   - 6.4 [非RSSサイト対応（Webスクレイピング）](#64-非rssサイト対応webスクレイピング)
   - 6.5 [ソースの自動評価とスコアリング](#65-ソースの自動評価とスコアリング)
7. [プロンプト学習エンジン 詳細設計](#7-プロンプト学習エンジン-詳細設計)
   - 7.1 [設計思想](#71-設計思想)
   - 7.2 [対話によるプロンプト育成フロー](#72-対話によるプロンプト育成フロー)
   - 7.3 [プロンプトの構造](#73-プロンプトの構造)
   - 7.4 [記事作成プロンプトの学習](#74-記事作成プロンプトの学習)
   - 7.5 [レビュープロンプトの学習](#75-レビュープロンプトの学習)
   - 7.6 [学習シグナルの種類と重み](#76-学習シグナルの種類と重み)
   - 7.7 [プロンプト進化アルゴリズム](#77-プロンプト進化アルゴリズム)
   - 7.8 [バージョン管理とロールバック](#78-バージョン管理とロールバック)
8. [BigQuery 分析設計](#8-bigquery-分析設計)
   - 8.1 [データパイプライン](#81-データパイプライン)
   - 8.2 [記事クラスタリング](#82-記事クラスタリング)
   - 8.3 [ユーザーリアクション学習](#83-ユーザーリアクション学習)
   - 8.4 [コンテンツ最適化フィードバックループ](#84-コンテンツ最適化フィードバックループ)
   - 8.5 [プロンプト効果分析](#85-プロンプト効果分析)
9. [API仕様](#9-api仕様)
10. [Cloud Functions 一覧](#10-cloud-functions-一覧)
11. [インフラ・デプロイ](#11-インフラデプロイ)
12. [セキュリティ](#12-セキュリティ)
13. [コンプライアンス・著作権対応](#13-コンプライアンス著作権対応)
14. [運用・監視](#14-運用監視)
15. [ディレクトリ構成](#15-ディレクトリ構成)
16. [開発ロードマップ](#16-開発ロードマップ)

---

## 1. プロジェクト概要

### 1.1 背景・目的

**News Butler（ニュースバトラー）** は、メルマガ配信者や情報キュレーターが手動での情報収集・編集にかけている膨大な時間を削減するAIニュースインテリジェンスシステムである。AI執事「バトラーくん」が、RSSフィードだけでなくWebスクレイピング・Googleアラート・sitemapパースを含む複合的な情報収集、AIによるソース自動発見・推薦、AI記事分析・レポート/メルマガ生成、さらにBigQueryを活用した読者行動分析とコンテンツ最適化により、高品質な情報レポート・メルマガを持続的に提供する。

**News Butlerの核心は「プロンプト学習エンジン」と「AIソース発見エンジン」にある。** 配信者がAIに直接プロンプトを書くのではなく、メルマガごとに配信者との対話を通じてシステムがプロンプトを自動的に学び、育てていく。また、配信者が「AIニュースを集めたい」と伝えるだけで、システムがRSSフィード・スクレイピングターゲット・Googleアラートを含む最適な情報ソースを自動発見・推薦する。

### 1.2 ターゲットユーザー

| ユーザー種別                           | ニーズ                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------- |
| **個人ユーザー（パーソナルリーダー）** | **特定分野のニュースを効率的に収集し、目的に応じたレポートで読みたい** |
| メルマガ配信者                         | 情報収集〜配信の自動化、自分の「味」をAIに学ばせたい                   |
| 情報キュレーター                       | 特定分野の情報を効率的に収集・整理                                     |
| マーケティング担当者                   | ターゲットセグメントへの最適なコンテンツ配信                           |
| メディア運営者                         | コンテンツ制作コストの削減、データドリブンな改善                       |

### 1.3 利用モード

本システムは3つの利用モードを提供する。モードによってコンプライアンス要件と機能範囲が異なる。

```
┌──────────────────────────────────────────────────────────────────┐
│  Mode A: パーソナルリーダー                                       │
│  ─────────────────────────────                                   │
│  課金者が自分だけのために情報を収集・AI分析・レポート生成          │
│  「あなた専属のAI執事が毎日ニュースをお届け」                     │
│                                                                  │
│  ✅ 法的リスク: 低                                               │
│  ✅ 私的使用（著作権法30条）＋ 情報解析（30条の4）               │
│  ✅ 他人への配信がないため、市場代替リスクなし                    │
│                                                                  │
│  特徴: 同じ収集データから目的別レポートを切り替え可能             │
│        例）朝の概要ブリーフィング / 技術深掘り / 経営層向け要約   │
├──────────────────────────────────────────────────────────────────┤
│  Mode B: 執筆支援                                                │
│  ─────────────────                                               │
│  AIが準備稿を作成、配信者がレビュー・編集してから配信            │
│  「AI執事がメルマガの下書きをご用意いたします」                   │
│                                                                  │
│  ⚠ 法的リスク: 中程度                                           │
│  ⚠ 人間が編集判断を挟むため、情報収集ツールと同等               │
│  ⚠ 類似度チェック・引用要件遵守・出所明示が必要                 │
│                                                                  │
│  特徴: プロンプト学習エンジンで配信者の文体を学習                │
│        配信者承認なしには配信されない                             │
├──────────────────────────────────────────────────────────────────┤
│  Mode C: 自動配信（将来検討）                                    │
│  ─────────────────────────────                                   │
│  AIが生成→自動で読者に配信                                      │
│                                                                  │
│  🔴 法的リスク: 高                                               │
│  🔴 元記事の市場代替リスク、30条の4の適用が困難                  │
│  🔴 正式リリース前に法的レビュー必須                             │
│                                                                  │
│  v1.2時点では実装しない。将来、法的整理が進んだ段階で検討。      │
└──────────────────────────────────────────────────────────────────┘
```

### 1.4 システムが解決する課題

- 複数情報ソースからの手動収集・チェックの工数
- 記事の取捨選択とトピック構成の属人化
- 読者の反応が配信内容に反映されるまでのタイムラグ
- パーソナライゼーション不足による開封率・クリック率の低迷
- **AIへの指示（プロンプト）を自分で書けない・書く時間がない問題**
- **プロンプトを書いても、配信者の「好み」や「文体の癖」を言語化しきれない問題**
- **同じ情報ソースから目的別に異なるレポートが欲しい問題**（パーソナルリーダー）

---

## 2. システムアーキテクチャ

### 2.1 全体構成図

```
                          ┌──────────────────────────────────────────┐
                          │           管理ダッシュボード               │
                          │       (Firebase Hosting / Svelte)        │
                          │                                          │
                          │  ┌────────────────────────────────────┐  │
                          │  │   プロンプト育成チャット UI           │  │
                          │  │   (メルマガ毎の対話インターフェース)   │  │
                          │  └────────────────────────────────────┘  │
                          └────────────────┬─────────────────────────┘
                                           │ REST API / Chat API
                          ┌────────────────▼─────────────────────────┐
                          │         Cloud Functions                   │
                          │                                          │
                          │  ┌─────────────────────────────────────┐ │
                          │  │      プロンプト学習エンジン           │ │
                          │  │                                     │ │
                          │  │  対話解析 → シグナル抽出 → プロンプト │ │
                          │  │                           合成・進化 │ │
                          │  └───────────┬─────────────────────────┘ │
                          │              │                           │
                          │  ┌───────────▼───┐ ┌─────────────────┐  │
                          │  │ 記事作成      │ │ 記事レビュー     │  │
                          │  │ プロンプト     │ │ プロンプト       │  │
                          │  │ (学習済み)     │ │ (学習済み)       │  │
                          │  └───────┬───────┘ └────────┬────────┘  │
                          │          │                   │           │
                          │  ┌───────▼───────────────────▼────────┐  │
                          │  │      メルマガ生成パイプライン        │  │
                          │  │                                    │  │
                          │  │  記事選定 → AI作成 → AIレビュー     │  │
                          │  │              ↓            ↓        │  │
                          │  │           修正判定 ← レビュー結果   │  │
                          │  │              ↓                     │  │
                          │  │           最終版出力               │  │
                          │  └────────────────────────────────────┘  │
                          └──┬──────────────────┬──────────┬─────────┘
                             │                  │          │
              ┌──────────────▼──┐   ┌───────────▼──┐  ┌───▼──────────┐
              │    Firestore    │   │  Vertex AI   │  │  SendGrid    │
              │                 │   │ (Gemini Pro) │  │  / Mailgun   │
              │  articles       │   │              │  │  メール配信   │
              │  newsletters    │   │  分析・生成    │  └──────────────┘
              │  prompt_profiles│   │  プロンプト学習│
              │  conversations  │   └──────────────┘
              └────────┬────────┘
                       │ Export / Streaming
              ┌────────▼───────────────────────────────────────────┐
              │                    BigQuery                        │
              │                                                   │
              │  articles_master │ user_reactions │ prompt_metrics │
              │                                                   │
              │  BigQuery ML: クラスタリング / レコメンド /          │
              │               プロンプト効果分析                    │
              └───────────────────────────────────────────────────┘
```

### 2.2 データフロー概要

```
発見 → 収集 → 分析 → 蓄積 → 学習 → 最適化 → 生成 → レビュー → 配信 → 計測 → 学習（循環）
 ↑                                        ↑                            │
 │    AIソース発見ループ                    │    プロンプト学習ループ      │
 └── メルマガテーマから自動推薦             └──── 配信者フィードバック ────┘
```

| フェーズ     | 処理内容                                                       | 主要サービス                            |
| ------------ | -------------------------------------------------------------- | --------------------------------------- |
| **発見**     | **AIソース推薦、フィード自動検出、非RSSサイト登録**            | **Vertex AI, FeedBagel API, Puppeteer** |
| 収集         | RSS巡回 + Webスクレイピング、新着記事取得                      | Cloud Functions, rss-parser, Cheerio    |
| 分析         | 要約、キーワード抽出、カテゴリ分類、スコアリング               | Vertex AI (Gemini Pro)                  |
| 蓄積         | 記事・分析結果の保存、BigQueryへのエクスポート                 | Firestore, BigQuery                     |
| 学習         | 記事クラスタリング、ユーザー嗜好モデル、**プロンプト効果分析** | BigQuery ML                             |
| 最適化       | 記事選定の最適化、パーソナライズ                               | Cloud Functions + BQ結果参照            |
| **生成**     | **学習済み記事作成プロンプトで記事生成**                       | Vertex AI + プロンプト学習エンジン      |
| **レビュー** | **学習済みレビュープロンプトで品質チェック**                   | Vertex AI + プロンプト学習エンジン      |
| 配信         | メルマガ配信、メール送信                                       | SendGrid                                |
| 計測         | 開封、クリック、離脱トラッキング                               | Cloud Functions, BigQuery               |
| **対話学習** | **配信者フィードバックからプロンプト進化**                     | Vertex AI, Firestore                    |

---

## 3. 技術スタック

| レイヤー           | 技術                                      | 用途                                                                       |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------------------- |
| フロントエンド     | Svelte + TypeScript                       | 管理ダッシュボード、プロンプト育成チャットUI                               |
| ホスティング       | Firebase Hosting                          | SPA配信                                                                    |
| バックエンド       | Cloud Functions for Firebase (TypeScript) | API、バッチ処理、プロンプト学習エンジン、ソース発見エンジン                |
| データベース       | Cloud Firestore                           | リアルタイムデータ、設定管理、対話履歴                                     |
| 分析基盤           | BigQuery                                  | 大量データ分析、ML、プロンプト効果分析、ソース品質分析                     |
| AI/ML              | Vertex AI (Gemini 1.5 Pro)                | 記事分析、メルマガ生成、対話解析、プロンプト合成、ソース推薦、セレクタ生成 |
| ML (テーブル)      | BigQuery ML                               | クラスタリング、レコメンド                                                 |
| **スクレイピング** | **Puppeteer + Cheerio**                   | **非RSSサイトからの情報収集、セレクタ自動生成**                            |
| **フィード発見**   | **FeedBagel API / Feedsearch API**        | **ドメインからのRSSフィード自動検出**                                      |
| スケジューラ       | Cloud Scheduler                           | 定期バッチ実行                                                             |
| メール配信         | SendGrid / Mailgun                        | トランザクションメール                                                     |
| 監視               | Cloud Monitoring + Logging                | アラート、ログ管理                                                         |
| CI/CD              | GitHub Actions                            | テスト、自動デプロイ                                                       |

---

## 4. データモデル

### 4.1 Firestore コレクション

#### `sources/{sourceId}`

| フィールド             | 型                     | 説明                                                              |
| ---------------------- | ---------------------- | ----------------------------------------------------------------- |
| `name`                 | `string`               | ソース名                                                          |
| `url`                  | `string`               | RSS フィード URL またはWebページURL                               |
| `siteUrl`              | `string`               | ソースのトップページURL                                           |
| `type`                 | `string`               | `rss` / `scrape` / `google_alert` / `sitemap`                     |
| `category`             | `string`               | カテゴリ                                                          |
| `tags`                 | `string[]`             | タグ（AI付与含む）                                                |
| `isActive`             | `boolean`              | 有効/無効                                                         |
| `fetchIntervalMinutes` | `number`               | 巡回間隔（分） デフォルト: 60                                     |
| `lastFetchedAt`        | `Timestamp \| null`    | 最終取得日時                                                      |
| `reliability`          | `number`               | ソース信頼度スコア (0-100)                                        |
| `discoveredBy`         | `string`               | `manual` / `ai_recommendation` / `feed_discovery` / `opml_import` |
| `scrapeConfig`         | `ScrapeConfig \| null` | スクレイピング設定（type=scrape時のみ）                           |
| `feedMeta`             | `FeedMeta \| null`     | フィード発見時のメタ情報                                          |
| `healthStatus`         | `string`               | `healthy` / `degraded` / `broken`                                 |
| `consecutiveErrors`    | `number`               | 連続エラー回数                                                    |
| `createdAt`            | `Timestamp`            | 作成日時                                                          |
| `updatedAt`            | `Timestamp`            | 更新日時                                                          |

**ScrapeConfig（スクレイピング設定）:**

| フィールド           | 型               | 説明                               |
| -------------------- | ---------------- | ---------------------------------- |
| `listSelector`       | `string`         | 記事リストのCSSセレクタ            |
| `titleSelector`      | `string`         | タイトルのCSSセレクタ              |
| `linkSelector`       | `string`         | リンクのCSSセレクタ                |
| `dateSelector`       | `string \| null` | 日付のCSSセレクタ                  |
| `contentSelector`    | `string \| null` | 本文のCSSセレクタ                  |
| `paginationSelector` | `string \| null` | ページネーションのCSSセレクタ      |
| `requiresJs`         | `boolean`        | JavaScript実行が必要か             |
| `autoDetected`       | `boolean`        | AIが自動検出したセレクタか         |
| `lastStructureHash`  | `string`         | ページ構造のハッシュ（変更検知用） |
| `lastVerifiedAt`     | `Timestamp`      | セレクタ動作確認日時               |

**FeedMeta（フィード発見メタ情報）:**

| フィールド        | 型       | 説明                      |
| ----------------- | -------- | ------------------------- |
| `feedType`        | `string` | `rss20` / `atom` / `json` |
| `feedTitle`       | `string` | フィードのタイトル        |
| `feedDescription` | `string` | フィードの説明            |
| `velocity`        | `number` | 更新頻度（記事/日）       |
| `discoveredVia`   | `string` | 発見元API/サービス名      |

#### `source_recommendations/{recommendationId}`

| フィールド     | 型                    | 説明                               |
| -------------- | --------------------- | ---------------------------------- |
| `newsletterId` | `string`              | 対象メルマガID                     |
| `sources`      | `RecommendedSource[]` | 推薦ソース一覧                     |
| `query`        | `string`              | 推薦を生成した検索クエリ/テーマ    |
| `status`       | `string`              | `pending` / `reviewed` / `expired` |
| `createdAt`    | `Timestamp`           | 作成日時                           |
| `reviewedAt`   | `Timestamp \| null`   | 配信者レビュー日時                 |

**RecommendedSource:**

| フィールド       | 型                | 説明                              |
| ---------------- | ----------------- | --------------------------------- |
| `url`            | `string`          | フィード/サイトURL                |
| `name`           | `string`          | ソース名                          |
| `type`           | `string`          | `rss` / `scrape` / `google_alert` |
| `relevanceScore` | `number`          | 関連度スコア (0-100)              |
| `reason`         | `string`          | 推薦理由（AI生成）                |
| `accepted`       | `boolean \| null` | 配信者の承認/却下                 |

#### `report_templates/{templateId}` ★ パーソナルリーダー用

| フィールド       | 型               | 説明                                                                                                 |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| `userId`         | `string`         | オーナーユーザーID                                                                                   |
| `name`           | `string`         | テンプレート名（例:「朝の概要ブリーフィング」）                                                      |
| `description`    | `string`         | テンプレートの説明                                                                                   |
| `purpose`        | `string`         | `morning_brief` / `deep_dive` / `executive_summary` / `competitor_watch` / `trend_report` / `custom` |
| `sourceIds`      | `string[]`       | 対象ソースID群                                                                                       |
| `filters`        | `ReportFilter`   | 記事フィルタ条件                                                                                     |
| `outputConfig`   | `OutputConfig`   | 出力設定                                                                                             |
| `schedule`       | `string \| null` | 自動生成スケジュール（cron式、nullならオンデマンド）                                                 |
| `promptOverride` | `string \| null` | ユーザー独自の追加指示                                                                               |
| `isActive`       | `boolean`        | 有効/無効                                                                                            |
| `createdAt`      | `Timestamp`      | 作成日時                                                                                             |
| `updatedAt`      | `Timestamp`      | 更新日時                                                                                             |

**ReportFilter:**

| フィールド          | 型         | 説明                                   |
| ------------------- | ---------- | -------------------------------------- |
| `timeRange`         | `string`   | `24h` / `3d` / `7d` / `30d` / `custom` |
| `categories`        | `string[]` | 対象カテゴリ                           |
| `minRelevanceScore` | `number`   | 最低重要度スコア                       |
| `keywords`          | `string[]` | 含めるキーワード                       |
| `excludeKeywords`   | `string[]` | 除外キーワード                         |
| `maxArticles`       | `number`   | レポートに含める最大記事数             |

**OutputConfig:**

| フィールド           | 型         | 説明                                                                          |
| -------------------- | ---------- | ----------------------------------------------------------------------------- |
| `style`              | `string`   | `brief` / `detailed` / `analytical` / `executive`                             |
| `length`             | `string`   | `short`(〜500字) / `medium`(〜1500字) / `long`(〜3000字)                      |
| `language`           | `string`   | `ja` / `en` / `auto`                                                          |
| `includeSourceLinks` | `boolean`  | 元記事リンクを含めるか                                                        |
| `includeAnalysis`    | `boolean`  | AI独自分析を含めるか                                                          |
| `format`             | `string`   | `markdown` / `html` / `email`                                                 |
| `sections`           | `string[]` | 含めるセクション（例: `["headline", "trends", "deep_dive", "action_items"]`） |

**プリセットテンプレート（システム提供）:**

| プリセット名           | purpose             | style        | 用途                                               |
| ---------------------- | ------------------- | ------------ | -------------------------------------------------- |
| 朝の概要ブリーフィング | `morning_brief`     | `brief`      | 通勤中にさっと読める。主要ニュース5件+一言コメント |
| 技術深掘りレポート     | `deep_dive`         | `analytical` | 特定トピックの技術的な掘り下げ。実装への示唆つき   |
| 経営層向けサマリー     | `executive_summary` | `executive`  | ビジネスインパクト重視。意思決定に必要な情報を凝縮 |
| 競合動向ウォッチ       | `competitor_watch`  | `detailed`   | 競合企業の動きをトラッキング。比較分析つき         |
| 週次トレンドレポート   | `trend_report`      | `analytical` | 1週間の動向を俯瞰。トレンドの変化点を可視化        |

#### `generated_reports/{reportId}` ★ パーソナルリーダー用

| フィールド     | 型          | 説明                       |
| -------------- | ----------- | -------------------------- |
| `userId`       | `string`    | オーナーユーザーID         |
| `templateId`   | `string`    | 使用したテンプレートID     |
| `templateName` | `string`    | テンプレート名（非正規化） |
| `content`      | `string`    | 生成されたレポート本文     |
| `contentHtml`  | `string`    | HTML版                     |
| `articleIds`   | `string[]`  | レポートに使用した記事ID群 |
| `articleCount` | `number`    | 使用記事数                 |
| `generatedAt`  | `Timestamp` | 生成日時                   |
| `periodStart`  | `Timestamp` | 対象期間の開始             |
| `periodEnd`    | `Timestamp` | 対象期間の終了             |

| フィールド         | 型               | 説明                                |
| ------------------ | ---------------- | ----------------------------------- |
| `sourceId`         | `string`         | RSSソースID                         |
| `sourceName`       | `string`         | ソース名（非正規化）                |
| `title`            | `string`         | 記事タイトル                        |
| `url`              | `string`         | 記事URL（ユニーク制約）             |
| `content`          | `string`         | 本文テキスト（最大5000文字）        |
| `author`           | `string`         | 著者                                |
| `publishedAt`      | `Timestamp`      | 公開日時                            |
| `fetchedAt`        | `Timestamp`      | 取得日時                            |
| `aiSummary`        | `string`         | AI要約（200文字以内）               |
| `aiKeywords`       | `string[]`       | AIキーワード（最大5個）             |
| `aiCategory`       | `string`         | AIカテゴリ                          |
| `aiSentiment`      | `string`         | positive / negative / neutral       |
| `aiRelevanceScore` | `number`         | 重要度スコア (0-100)                |
| `aiEmbedding`      | `number[]`       | テキスト埋め込みベクトル（768次元） |
| `clusterId`        | `string \| null` | BigQueryクラスタID                  |
| `clusterLabel`     | `string \| null` | クラスタの人間可読ラベル            |
| `isProcessed`      | `boolean`        | AI分析完了フラグ                    |

#### `newsletters/{newsletterId}`

| フィールド                  | 型                  | 説明                                   |
| --------------------------- | ------------------- | -------------------------------------- |
| `name`                      | `string`            | メルマガ名                             |
| `description`               | `string`            | 概要                                   |
| `keywords`                  | `string[]`          | フィルタキーワード                     |
| `targetAudience`            | `string`            | ターゲット読者                         |
| `targetAudienceDescription` | `string`            | ターゲット詳細                         |
| `sourceIds`                 | `string[]`          | 対象RSSソースID                        |
| `deliveryInterval`          | `string`            | daily / weekly / biweekly / monthly    |
| `deliveryDay`               | `number`            | 配信曜日 (0-6) / 日 (1-31)             |
| `deliveryTime`              | `string`            | 配信時刻 HH:mm                         |
| `format`                    | `string`            | individual / digest                    |
| `tone`                      | `string`            | professional / casual / technical      |
| `language`                  | `string`            | ja / en                                |
| `maxArticles`               | `number`            | 最大記事数                             |
| `usePersonalization`        | `boolean`           | パーソナライズ有効                     |
| `promptProfileId`           | `string`            | 紐づくプロンプトプロファイルID         |
| `promptMaturity`            | `string`            | onboarding / growing / mature / expert |
| `isActive`                  | `boolean`           | 配信有効                               |
| `lastDeliveredAt`           | `Timestamp \| null` | 最終配信日時                           |
| `recipientCount`            | `number`            | 購読者数                               |
| `createdAt`                 | `Timestamp`         | 作成日時                               |
| `updatedAt`                 | `Timestamp`         | 更新日時                               |

#### `prompt_profiles/{profileId}`

メルマガごとのプロンプトプロファイル。対話を通じて学習・進化する。

| フィールド           | 型               | 説明                                   |
| -------------------- | ---------------- | -------------------------------------- |
| `newsletterId`       | `string`         | 紐づくメルマガID                       |
| `creationPrompt`     | `PromptDocument` | 記事作成プロンプト（現行版）           |
| `reviewPrompt`       | `PromptDocument` | レビュープロンプト（現行版）           |
| `maturityLevel`      | `string`         | onboarding / growing / mature / expert |
| `maturityScore`      | `number`         | 成熟度スコア (0-100)                   |
| `totalConversations` | `number`         | 累計対話セッション数                   |
| `totalFeedbacks`     | `number`         | 累計フィードバック数                   |
| `lastLearnedAt`      | `Timestamp`      | 最終学習日時                           |
| `createdAt`          | `Timestamp`      | 作成日時                               |
| `updatedAt`          | `Timestamp`      | 更新日時                               |

**PromptDocument 型（埋め込みオブジェクト）:**

| フィールド          | 型                | 説明                                   |
| ------------------- | ----------------- | -------------------------------------- |
| `version`           | `number`          | プロンプトバージョン番号               |
| `systemInstruction` | `string`          | ベースシステム指示                     |
| `learnedRules`      | `LearnedRule[]`   | 対話から学習したルール群               |
| `styleGuide`        | `StyleGuide`      | 学習済みスタイルガイド                 |
| `constraints`       | `string[]`        | 制約・禁止事項                         |
| `examples`          | `PromptExample[]` | 良い例・悪い例                         |
| `compiledPrompt`    | `string`          | 上記を統合したコンパイル済みプロンプト |
| `lastCompiledAt`    | `Timestamp`       | 最終コンパイル日時                     |

**LearnedRule 型:**

| フィールド              | 型          | 説明                                       |
| ----------------------- | ----------- | ------------------------------------------ |
| `id`                    | `string`    | ルールID                                   |
| `rule`                  | `string`    | ルール本文（例: 結論を先に書く）           |
| `source`                | `string`    | 学習元（conversation / feedback / metric） |
| `confidence`            | `number`    | 確信度 (0.0-1.0)                           |
| `learnedAt`             | `Timestamp` | 学習日時                                   |
| `reinforcedCount`       | `number`    | 同じルールが強化された回数                 |
| `sourceConversationIds` | `string[]`  | 根拠となった対話ID                         |

**StyleGuide 型:**

| フィールド       | 型         | 説明                               |
| ---------------- | ---------- | ---------------------------------- |
| `tone`           | `string`   | 文体トーン（学習により詳細化）     |
| `formality`      | `number`   | フォーマル度 (0.0-1.0)             |
| `sentenceLength` | `string`   | short / medium / long              |
| `useEmoji`       | `boolean`  | 絵文字使用                         |
| `useHumor`       | `boolean`  | ユーモア使用                       |
| `jargonLevel`    | `string`   | none / light / heavy               |
| `customTraits`   | `string[]` | 自由形式の特徴（例: 体言止め多用） |

#### `prompt_profiles/{profileId}/versions/{versionId}`

プロンプトの変更履歴。ロールバック可能。

| フィールド              | 型               | 説明                               |
| ----------------------- | ---------------- | ---------------------------------- |
| `version`               | `number`         | バージョン番号                     |
| `type`                  | `string`         | creation / review                  |
| `compiledPrompt`        | `string`         | その時点のコンパイル済みプロンプト |
| `learnedRules`          | `LearnedRule[]`  | その時点のルール群                 |
| `changeReason`          | `string`         | 変更理由（自動生成）               |
| `triggerConversationId` | `string \| null` | 変更のきっかけとなった対話ID       |
| `performanceAtCreation` | `object`         | 作成時点のメトリクス               |
| `createdAt`             | `Timestamp`      | 作成日時                           |

#### `prompt_profiles/{profileId}/conversations/{conversationId}`

配信者との対話セッション。プロンプト学習の入力となる。

| フィールド         | 型                  | 説明                                                   |
| ------------------ | ------------------- | ------------------------------------------------------ |
| `type`             | `string`            | onboarding / edition_review / style_tuning / issue_fix |
| `editionId`        | `string \| null`    | 対象メルマガ号（レビュー時）                           |
| `messages`         | `Message[]`         | 対話メッセージ配列                                     |
| `extractedSignals` | `LearningSignal[]`  | AIが抽出した学習シグナル                               |
| `promptChanges`    | `PromptDiff[]`      | この対話で発生したプロンプト変更                       |
| `status`           | `string`            | active / completed / archived                          |
| `startedAt`        | `Timestamp`         | 開始日時                                               |
| `completedAt`      | `Timestamp \| null` | 完了日時                                               |

**Message 型:**

| フィールド    | 型          | 説明                           |
| ------------- | ----------- | ------------------------------ |
| `role`        | `string`    | user / assistant / system      |
| `content`     | `string`    | メッセージ本文                 |
| `attachments` | `object[]`  | 添付（生成記事のプレビュー等） |
| `timestamp`   | `Timestamp` | 送信日時                       |

**LearningSignal 型:**

| フィールド           | 型       | 説明                                                 |
| -------------------- | -------- | ---------------------------------------------------- |
| `signalType`         | `string` | シグナル種別（6.6節参照）                            |
| `content`            | `string` | 抽出されたルール/好み                                |
| `confidence`         | `number` | 確信度 (0.0-1.0)                                     |
| `affectedPromptPart` | `string` | tone / structure / vocabulary / constraint / example |

#### `newsletters/{newsletterId}/editions/{editionId}`

| フィールド             | 型                     | 説明                                                         |
| ---------------------- | ---------------------- | ------------------------------------------------------------ |
| `subject`              | `string`               | 件名                                                         |
| `previewText`          | `string`               | プレビューテキスト                                           |
| `htmlContent`          | `string`               | HTML本文                                                     |
| `plainTextContent`     | `string`               | プレーンテキスト本文                                         |
| `articleIds`           | `string[]`             | 使用記事ID                                                   |
| `topicSummary`         | `string`               | テーマ要約                                                   |
| `promptVersionUsed`    | `number`               | 生成に使用したプロンプトバージョン                           |
| `reviewResult`         | `ReviewResult \| null` | AIレビュー結果                                               |
| `ownerApproval`        | `string`               | pending / approved / revision_requested                      |
| `revisionNotes`        | `string`               | 配信者の修正指示（学習シグナルとなる）                       |
| `generatedAt`          | `Timestamp`            | 生成日時                                                     |
| `deliveredAt`          | `Timestamp \| null`    | 配信日時                                                     |
| `status`               | `string`               | draft / reviewed / approved / scheduled / delivered / failed |
| `metrics.sent`         | `number`               | 送信数                                                       |
| `metrics.opened`       | `number`               | 開封数                                                       |
| `metrics.clicked`      | `number`               | クリック数                                                   |
| `metrics.unsubscribed` | `number`               | 配信停止数                                                   |

**ReviewResult 型:**

| フィールド     | 型              | 説明               |
| -------------- | --------------- | ------------------ |
| `overallScore` | `number`        | 総合スコア (0-100) |
| `passed`       | `boolean`       | レビュー通過       |
| `feedback`     | `string`        | レビューコメント   |
| `issues`       | `ReviewIssue[]` | 検出した問題点     |
| `suggestions`  | `string[]`      | 改善提案           |
| `reviewedAt`   | `Timestamp`     | レビュー日時       |

#### `subscribers/{subscriberId}`

| フィールド            | 型                  | 説明                           |
| --------------------- | ------------------- | ------------------------------ |
| `email`               | `string`            | メールアドレス                 |
| `name`                | `string`            | 名前                           |
| `newsletterIds`       | `string[]`          | 購読メルマガID                 |
| `isActive`            | `boolean`           | アクティブ                     |
| `preferredCategories` | `string[]`          | 好みのカテゴリ（学習結果）     |
| `engagementScore`     | `number`            | エンゲージメントスコア (0-100) |
| `subscribedAt`        | `Timestamp`         | 登録日時                       |
| `unsubscribedAt`      | `Timestamp \| null` | 配信停止日時                   |

#### `tracking_events/{eventId}`

| フィールド     | 型               | 説明                           |
| -------------- | ---------------- | ------------------------------ |
| `subscriberId` | `string`         | 購読者ID                       |
| `newsletterId` | `string`         | メルマガID                     |
| `editionId`    | `string`         | 号ID                           |
| `articleId`    | `string \| null` | 記事ID（クリック時）           |
| `eventType`    | `string`         | open / click / unsubscribe     |
| `metadata`     | `object`         | UA, デバイス, タイムスタンプ等 |
| `createdAt`    | `Timestamp`      | イベント日時                   |

### 4.2 BigQuery テーブル

#### dataset: newsletter_analytics

| テーブル                  | 説明                                 | 更新頻度               |
| ------------------------- | ------------------------------------ | ---------------------- |
| `articles_master`         | 全記事（AI分析結果含む）             | 日次エクスポート       |
| `article_embeddings`      | 記事の埋め込みベクトル               | 日次エクスポート       |
| `user_reactions`          | 開封・クリック等イベント             | リアルタイムストリーム |
| `edition_metrics`         | 号ごとの配信実績                     | 日次集計               |
| `article_clusters`        | クラスタリング結果                   | 週次バッチ             |
| `user_preferences`        | ユーザー嗜好モデル推論結果           | 週次バッチ             |
| `content_quality_scores`  | 記事品質スコア（リアクション反映）   | 週次バッチ             |
| `newsletter_performance`  | メルマガ横断パフォーマンス           | 日次集計               |
| `prompt_version_metrics`  | プロンプトバージョン別パフォーマンス | 日次集計               |
| `prompt_learning_signals` | 対話から抽出した学習シグナル         | リアルタイム           |

---

## 5. 機能仕様

### 5.1 情報ソース管理・収集

本システムはRSSフィードだけでなく、Webスクレイピング、Googleアラート、sitemapパースを含む複合的な情報収集に対応する。

**ソース種別と収集方式:**

| 種別           | 収集方式                                | 用途                             |
| -------------- | --------------------------------------- | -------------------------------- |
| `rss`          | rss-parserでフィードパース              | RSS/Atom/JSONフィード対応サイト  |
| `scrape`       | Puppeteer/Cheerio でHTML差分検出        | RSSがない企業ニュースルーム等    |
| `google_alert` | GoogleアラートRSSフィード購読           | キーワードベースの広範な情報収集 |
| `sitemap`      | sitemap.xml の `<lastmod>` 定期チェック | RSSはないがsitemapがあるサイト   |

**収集スケジュール:**

- Cloud Scheduler が1時間ごとにアクティブソースを巡回
- RSS: 5件ずつ並列取得、URL重複チェック、最大5000文字保存
- スクレイピング: ソースごとにセレクタでHTML解析、前回との差分で新着判定
- 取得失敗は3回リトライ、連続5回失敗でソースを `degraded` に変更しアラート

**AIソース発見エンジン（→ セクション6で詳述）:**

- メルマガのテーマ・キーワードからAIが情報ソースを自動推薦
- OPMLリスト検索、フィード発見API、プレスリリースサービス検索を統合
- 非RSSサイトにはスクレイピング設定をAIが自動生成

### 5.2 AI記事分析

Firestore onCreate トリガーで自動実行。Vertex AI Gemini 1.5 Pro で要約・キーワード抽出・カテゴリ分類・センチメント・重要度スコア・テキスト埋め込みを生成。収集元のソース種別（RSS/スクレイピング等）に関わらず同一の分析パイプラインを通る。

### 5.3 メルマガ管理・生成

**従来のハードコードされたプロンプトではなく、プロンプト学習エンジンが育てた compiledPrompt を使用する。**

```
記事生成フロー:

1. prompt_profiles から現行の creationPrompt.compiledPrompt を取得
2. 選定記事 + compiledPrompt で Vertex AI を呼び出し
3. 生成結果を reviewPrompt.compiledPrompt で自動レビュー
4. レビュー通過 → draft として保存
5. レビュー不通過 → レビュー指摘を反映して再生成（最大2回）
6. 配信者にプレビュー通知
7. 配信者が承認 → scheduled → delivered
8. 配信者が修正指示 → 対話セッション開始（学習シグナル）
```

### 5.4 プロンプト学習エンジン

→ セクション7で詳述

### 5.5 配信・購読管理

購読者管理、ダブルオプトイン、トラッキング（開封ピクセル、リンクラッパー）、BigQueryへのストリーミングエクスポート。

### 5.6 BigQuery分析基盤

→ セクション8で詳述

### 5.7 管理ダッシュボード

| 画面                   | 機能                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| ダッシュボード         | KPI概要、最新記事、メルマガ一覧                                             |
| **ソース管理**         | **ソースCRUD（RSS/スクレイピング/アラート）、ヘルス監視、AI推薦ソース表示** |
| **ソース発見**         | **メルマガ別AI推薦UI、OPML一括インポート、フィード検索**                    |
| 収集記事一覧           | 記事検索・フィルタ、AI分析結果表示、クラスタ表示                            |
| **パーソナルリーダー** | **レポートテンプレート管理、レポート生成・閲覧**                            |
| メルマガ管理           | メルマガCRUD、手動生成、プレビュー                                          |
| **プロンプト育成**     | **メルマガ別の対話チャットUI、プロンプト成熟度表示**                        |
| 号一覧                 | 配信履歴、メトリクス、HTMLプレビュー、レビュー結果                          |
| 購読者管理             | 購読者CRUD、エンゲージメントスコア表示                                      |
| 分析レポート           | BigQuery分析結果、**プロンプト効果分析**、**ソース品質分析**                |

### 5.8 パーソナルリーダー（Mode A）

課金ユーザーが自分だけのために情報を収集・AI分析し、目的やシーンに応じた形式でレポートを生成する機能。

#### 5.8.1 目的別レポートテンプレート

同じ収集ソースから、異なる目的・シーンに合わせてレポートの内容・構成・深さを切り替える。

```
同じ収集データ（AI関連ニュース50件）
              ↓
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🌅 朝の概要ブリーフィング     → 主要5件を1行ずつ           │
│     「通勤電車で2分で読める」    + 今日注目すべきこと1点     │
│                                                             │
│  🔬 技術深掘りレポート         → 特定トピック1-2件を深掘り  │
│     「実装に活かせる知見」       + 技術的意味合いの分析       │
│                                 + 関連技術・論文への言及     │
│                                                             │
│  👔 経営層向けサマリー         → ビジネスインパクト中心      │
│     「上司への報告に使える」     + 市場影響・競争環境の変化   │
│                                 + アクションアイテム提案     │
│                                                             │
│  🏢 競合動向ウォッチ           → 競合企業の動きに絞り込み   │
│     「競合が何をしているか」     + 自社との比較分析           │
│                                                             │
│  📊 週次トレンドレポート       → 1週間の傾向を俯瞰         │
│     「今週何が変わったか」       + トレンドの上昇/下降       │
│                                 + 来週の注目ポイント予測     │
│                                                             │
│  ✏️ カスタム                    → ユーザー独自のプロンプト   │
│     「自分の視点で読む」         + 自由な指示で生成           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 5.8.2 レポート生成フロー

```
トリガー: スケジュール（毎朝7時等）or オンデマンド
              ↓
  report_templates からテンプレート設定を取得
              ↓
  filters に基づいて対象記事を抽出
  （期間、カテゴリ、キーワード、最低relevanceScore等）
              ↓
  outputConfig.style に応じたプロンプトを構築
  ├─ brief:    「箇条書き中心、1件あたり2-3行」
  ├─ detailed: 「各記事を詳しく解説、背景情報も含む」
  ├─ analytical:「データと根拠に基づく分析、比較・推論を含む」
  └─ executive: 「結論ファースト、ビジネスインパクトと推奨アクション」
              ↓
  promptOverride があれば追加指示として連結
              ↓
  Vertex AI で レポート生成
  （元記事の表現をそのまま使わず、独自の分析視点で再構成）
              ↓
  generated_reports に保存
              ↓
  ユーザーに通知（プッシュ or メール）
```

#### 5.8.3 カスタムテンプレート作成

ユーザーはプリセットをベースにカスタマイズするか、完全に独自のテンプレートを作成できる。

```
[User]   毎朝、AI業界のニュースを「投資家視点」でまとめてほしい。
         具体的には、資金調達、M&A、IPO関連のニュースを優先して、
         各社のバリュエーションへの影響を分析してほしい。

[System] 「AI投資家ブリーフィング」テンプレートを作成しました:
         📰 対象: AI業界ソース全件
         🔍 フィルタ: "funding" OR "acquisition" OR "IPO" OR "valuation" 優先
         📝 スタイル: analytical（分析型）
         📐 長さ: medium（〜1500字）
         🕐 スケジュール: 毎朝 7:00

         セクション構成:
         1. 本日のハイライト（最重要1件）
         2. 資金調達・M&A動向（該当記事一覧+分析）
         3. バリュエーション影響分析
         4. 注目すべきシグナル

         サンプルレポートを生成しますか？
```

#### 5.8.4 競合サービスとの差別化

| 機能                   | 本システム   | Feedly                  | Inoreader               | Folo               |
| ---------------------- | ------------ | ----------------------- | ----------------------- | ------------------ |
| AI要約                 | ✅           | ✅（有料）              | ✅（有料）              | ✅（無料）         |
| 目的別レポート切替     | ✅           | △（プロンプト手動入力） | △（プロンプト手動入力） | ❌                 |
| プリセットテンプレート | ✅           | ✅（業界特化）          | ✅（定義済み）          | ❌                 |
| カスタムプロンプト     | ✅           | ✅（有料）              | ✅（有料）              | ❌                 |
| スケジュール自動生成   | ✅           | △                       | △                       | ❌                 |
| 対話でテンプレート作成 | ✅           | ❌                      | ❌                      | ❌                 |
| 非RSSソース対応        | ✅           | ❌                      | △（Web feeds）          | ❌                 |
| 料金                   | 低〜中価格帯 | 高（Market Intel）      | 中（Custom Intel）      | 無料（将来有料化） |

---

## 6. AIソース発見エンジン 詳細設計

### 6.1 設計思想

**「配信者はRSSの専門家ではない。」**

メルマガを作りたい配信者は「AIニュースを集めたい」とは言えても、具体的なRSSフィードURLやニュースルームのURLを網羅的に知っているわけではない。本エンジンは、メルマガのテーマから最適な情報ソースをAIが発見・推薦し、RSSのないサイトにも自動的にスクレイピング設定を生成する。

#### 設計原則

| 原則         | 説明                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| テーマ駆動   | URLを知らなくても「AI業界」「MLOps」等のテーマから出発できる                                            |
| 多層発見     | OPMLリスト → フィード発見API → プレスリリースサービス → Googleアラート → スクレイピング、の優先順で検索 |
| RSS優先      | 同じサイトにRSSがあればスクレイピングより常にRSSを優先                                                  |
| 配信者承認制 | AIが推薦するが、最終的な追加は配信者が選択する                                                          |
| 継続発見     | メルマガ運用中も定期的に新しいソース候補を提案する                                                      |

### 6.2 AI推薦フロー

#### 7.2.1 オンボーディング時のソース発見対話

メルマガ作成時に、プロンプト学習のオンボーディング対話と連動してソースも同時に発見する。

```
[System] メルマガのテーマを教えてください。

[User]   AI・機械学習の最新動向。特にMLOpsとLLM。

[System] いくつか確認させてください。
         ・日本語ソースのみ？それとも英語も？
         ・大手メディアの一般記事より、エンジニアリングブログのような
           実務寄りの情報が良いですか？
         ・特に注目している企業やプロジェクトはありますか？

[User]   英語もOK。実務寄りがいい。
         OpenAI、Anthropic、Google DeepMindは必ず追いたい。
         あとHugging Faceも。

[System] 了解です。以下のソースを見つけました:

         📡 RSSフィード（16件発見）
         ✅ OpenAI Blog — blog.openai.com/rss
         ✅ Anthropic Research — anthropic.com/feed.xml
         ✅ Google AI Blog — blog.google/technology/ai/rss
         ✅ Hugging Face Blog — huggingface.co/blog/feed.xml
         ✅ MLOps Community — mlops.community/feed
         ✅ The Batch (Andrew Ng) — deeplearning.ai/the-batch/feed
         ... 他10件

         🔍 RSSなし → スクレイピング候補（3件）
         ⚠ DeepMind Research — deepmind.google/research
           → ニュースルームのHTML構造を解析済み。スクレイピング設定を自動生成できます。
         ⚠ Weights & Biases Blog — wandb.ai/articles
         ⚠ Replicate Blog — replicate.com/blog

         📢 プレスリリース
         ✅ PR TIMES「AI」カテゴリ — prtimes.jp のカテゴリRSS

         🔔 Googleアラート生成候補
         ✅ "MLOps" OR "LLMOps" 新着通知
         ✅ "OpenAI" OR "Anthropic" リリース

         追加するソースを選んでください（全選択も可）。
```

#### 7.2.2 継続的なソース推薦

運用開始後も、以下のタイミングでソース推薦をバッチ実行する。

| タイミング       | トリガー                     | 推薦内容                                                                                     |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| 週次             | 毎週月曜のバッチ             | メルマガの記事クラスタから「カバーできていないトピック」を検出し、そのトピックのソースを提案 |
| メトリクス連動   | 特定記事の高エンゲージメント | 「この記事のソースから他の記事も取り込みますか？」と提案                                     |
| ソース劣化時     | 連続エラー/更新停止          | 代替ソース候補を自動提案                                                                     |
| 配信者リクエスト | 「もっとソースを追加したい」 | 対話で追加テーマをヒアリングし推薦                                                           |

### 6.3 フィード発見パイプライン

テーマやURLから情報ソースを発見する多段パイプライン。上位で見つかれば下位はスキップし、効率的に検索する。

```
入力: テーマ（キーワード群）+ 配信者の好み
                 ↓
┌─ Step 1: OPMLリスト検索 ──────────────────────────┐
│  GitHub上のキュレーション済みOPMLリストを検索       │
│  awesome-rss-feeds, awesome-tech-rss,             │
│  awesome-AI-feeds, OPML-Security-Feeds 等          │
│  → キーワードマッチで候補抽出                      │
└──────────────────────┬────────────────────────────┘
                       ↓
┌─ Step 2: フィード発見API ─────────────────────────┐
│  関連企業・メディアのドメインに対して               │
│  FeedBagel API / Feedsearch API を呼び出し         │
│  → ドメインからRSS/Atom/JSONフィードを自動検出     │
└──────────────────────┬────────────────────────────┘
                       ↓
┌─ Step 3: プレスリリースサービス検索 ──────────────┐
│  PR TIMES: 企業別RSS、カテゴリRSS                 │
│  BusinessWire / PR Newswire: API or RSS           │
│  → 企業名・カテゴリでフィード特定                  │
└──────────────────────┬────────────────────────────┘
                       ↓
┌─ Step 4: Googleアラート生成 ──────────────────────┐
│  キーワードからGoogleアラートRSSを自動生成          │
│  → メルマガ全体のキーワード + 個別企業名           │
└──────────────────────┬────────────────────────────┘
                       ↓
┌─ Step 5: スクレイピングターゲット特定 ────────────┐
│  Step 1-4で発見できなかったサイトを特定             │
│  → 各サイトのsitemap.xml存在チェック              │
│  → sitemap.xmlあれば sitemap タイプで登録          │
│  → なければスクレイピング設定をAI自動生成          │
└──────────────────────┬────────────────────────────┘
                       ↓
AI が全候補を統合・スコアリング・重複排除
                       ↓
配信者に推薦リストを提示
```

#### OPMLリスト管理

システム内にキュレーション済みOPMLカタログを保持する。

| OPMLソース          | カテゴリ                     | フィード数 |
| ------------------- | ---------------------------- | ---------- |
| awesome-rss-feeds   | 総合（国別・カテゴリ別）     | ~500       |
| awesome-tech-rss    | テック・スタートアップ・科学 | ~200       |
| awesome-AI-feeds    | AI/ML特化                    | ~100       |
| OPML-Security-Feeds | セキュリティ                 | ~300       |
| カスタムOPML        | 管理者が追加するリスト       | 可変       |

OPMLカタログは月次で自動更新（GitHub raw URLからフェッチし、フィードの死活確認を実施）。

#### OPML一括インポート

配信者が手持ちのOPMLファイルを直接アップロードすることも可能。

```
アップロードされたOPML
       ↓
XMLパース → フィード一覧抽出
       ↓
各フィードの死活確認（並列、タイムアウト10秒）
       ↓
有効フィードをメルマガのテーマとマッチング（Vertex AI）
       ↓
関連度スコア付きで配信者に提示
       ↓
配信者が選択 → sources に登録
```

### 6.4 非RSSサイト対応（Webスクレイピング）

RSSフィードを提供していないサイトから情報を収集するためのスクレイピング機構。

#### 7.4.1 AIセレクタ自動生成

配信者がURLを指定するだけで、AIがページ構造を解析しスクレイピング設定を自動生成する。

```
入力: https://example.com/news
              ↓
  Puppeteer でページ取得（JavaScript実行含む）
              ↓
  HTML構造を Vertex AI に送信
              ↓
  AIが以下を推定:
    - 記事リストの繰り返しパターン（listSelector）
    - 各記事のタイトル要素（titleSelector）
    - リンク要素（linkSelector）
    - 日付要素（dateSelector）
    - 本文要素（contentSelector）
              ↓
  テスト実行: 推定セレクタで3件以上取得できるか検証
              ↓
  成功 → ScrapeConfig として保存
  失敗 → セレクタ修正を再試行（最大3回）
       → 全失敗 → 配信者に手動設定を提案
```

#### 6.4.2 スクレイピング実行フロー

```
定期巡回トリガー（1時間ごと）
              ↓
  type=scrape のアクティブソースを取得
              ↓
  各ソースについて:
    ├─ requiresJs=true → Puppeteer でレンダリング
    └─ requiresJs=false → HTTP GET + Cheerio でパース
              ↓
  listSelector で記事リスト抽出
              ↓
  各記事の URL を抽出、既存 articles と重複チェック
              ↓
  新規記事のみ:
    ├─ contentSelector で本文取得
    └─ 本文取得不可 → 記事URLにアクセスして本文抽出
              ↓
  articles コレクションに保存
  （以降は RSS 経由と同じ AI 分析パイプラインへ）
```

#### 6.4.3 構造変更の自動検知と修復

Webサイトはリニューアル等で構造が変わることがある。これを自動検知し、可能な限り自動修復する。

```
巡回ごとにページ構造のハッシュを計算
              ↓
  前回の lastStructureHash と比較
              ↓
  ┌─ 一致 → 通常の記事抽出
  │
  └─ 不一致 → 構造変更を検知
                    ↓
              既存セレクタで抽出テスト
                    ↓
              ┌─ 抽出成功（軽微な変更）→ ハッシュ更新のみ
              │
              └─ 抽出失敗（重大な変更）
                        ↓
                  AIセレクタ再生成（6.4.1と同じフロー）
                        ↓
                  ┌─ 自動修復成功 → 新セレクタ保存、配信者に通知
                  └─ 自動修復失敗 → ソースを degraded に変更
                                     配信者に手動確認を依頼
```

#### 6.4.4 sitemap.xml ベースの収集

RSSはないが sitemap.xml を公開しているサイト向け。

```
定期巡回トリガー
      ↓
  /sitemap.xml を取得（sitemap index の場合は子sitemapも展開）
      ↓
  各 <url> の <lastmod> を前回巡回時と比較
      ↓
  新規/更新URLを検出
      ↓
  URLパターンフィルタ（ニュースページのみ抽出）
    例: /news/*, /press/*, /blog/* にマッチするもの
      ↓
  該当ページの本文をスクレイピングで取得
      ↓
  articles コレクションに保存
```

#### 6.4.5 Googleアラート連携

```
メルマガのキーワード + 企業名
      ↓
  Googleアラート作成（配信先: RSS）
      ↓
  生成されたRSSフィードURLを sources に type=google_alert で登録
      ↓
  以降は通常のRSS巡回で新着取得
      ↓
  記事はメルマガ固有のフィルタリングを通過してから使用
  （Googleアラートはノイズが多いため、AI relevance filter を適用）
```

### 6.5 ソースの自動評価とスコアリング

各ソースの品質と有用性を自動的に評価し、信頼度スコアを動的に更新する。

#### 評価指標

| 指標                 | 重み | 説明                                        |
| -------------------- | ---- | ------------------------------------------- |
| 記事採用率           | 0.30 | そのソースの記事がメルマガに何%採用されたか |
| 記事品質スコア平均   | 0.25 | AI分析の relevanceScore 平均                |
| 更新頻度の安定性     | 0.15 | 更新間隔の分散が小さいほど高評価            |
| フェッチ成功率       | 0.15 | 取得成功/試行回数                           |
| 読者エンゲージメント | 0.15 | そのソース由来記事のCTR平均                 |

#### スコアリングサイクル

```
週次バッチ（BigQuery）
      ↓
  ソースごとに上記5指標を集計
      ↓
  加重平均で reliability スコア (0-100) を算出
      ↓
  Firestore の sources/{sourceId}.reliability を更新
      ↓
  reliability < 20 のソースを自動無効化候補として配信者に通知
  reliability > 80 のソースを「高品質ソース」としてハイライト
```

#### ソース推薦への活用

高品質ソースと同じドメイン・カテゴリの未登録ソースは推薦スコアにボーナスを付与。低品質ソースと類似の特徴を持つ候補はスコアを減点。

---

## 7. プロンプト学習エンジン 詳細設計

### 7.1 設計思想

#### 7.1.1 原則

**「配信者はプロンプトエンジニアではない。」**

本システムは配信者に一切のプロンプト記述を求めない。代わりに以下の方法でプロンプトを自動学習する。

| 学習チャネル             | 説明                                     |
| ------------------------ | ---------------------------------------- |
| オンボーディング対話     | メルマガ作成時の初回ヒアリング           |
| 号レビュー対話           | 生成記事に対するフィードバック           |
| スタイルチューニング対話 | 配信者が自発的に文体・構成を調整する会話 |
| 暗黙シグナル             | 承認速度、修正頻度、配信メトリクスの変化 |

#### 7.1.2 プロンプトの成熟度モデル

```
Onboarding (0-20)  →  Growing (21-50)  →  Mature (51-80)  →  Expert (81-100)
   初期ヒアリング       フィードバック       安定した品質        配信者の分身
   汎用プロンプト       ルール蓄積中         自律運用可能        微調整のみ
```

| レベル     | スコア | システム動作                         |
| ---------- | ------ | ------------------------------------ |
| onboarding | 0-20   | 積極的に質問、毎号レビュー必須       |
| growing    | 21-50  | フィードバックを求める、レビュー推奨 |
| mature     | 51-80  | 自律生成可能、定期的にチェック提案   |
| expert     | 81-100 | 完全自律、配信者は承認のみ           |

成熟度スコアの算出:

```
maturityScore =
    min(20, totalConversations * 2)         // 対話回数 (最大20pt)
  + min(30, confirmedRules * 2)             // 確定ルール数 (最大30pt)
  + min(25, consecutiveApprovals * 5)       // 連続承認回数 (最大25pt)
  + min(25, metricImprovementScore)         // メトリクス改善度 (最大25pt)
```

### 7.2 対話によるプロンプト育成フロー

#### 7.2.1 オンボーディング対話

メルマガ新規作成時に自動開始。システムが配信者にヒアリングを行い、初期プロンプトを生成する。

```
[System] 「AIトレンドウィークリー」のメルマガを作成しますね。
         まず、どんな読者に届けたいですか？

[User]   AIに興味があるエンジニア。特にMLOpsとか実務寄りの人。

[System] なるほど、実務派のエンジニアですね。
         記事のトーンはどんなイメージですか？
         たとえば、ニュースサイトのような客観的な感じ？
         それとも、詳しい先輩が教えてくれるような感じ？

[User]   後者。でも馴れ馴れしくはなく、プロフェッショナルで。

[System] 了解です。「信頼できる同僚が共有してくれる」くらいの距離感ですね。
         最後に、これだけは避けてほしいことはありますか？

[User]   煽り系のタイトルと、根拠のない予測。

[System] 完璧です。以下の方針で初期プロンプトを作りました:
         ✅ ターゲット: MLOps実務者を含むAIエンジニア
         ✅ トーン: プロフェッショナルだが親しみやすい同僚の語り口
         ✅ 深さ: 技術的な実装詳細に踏み込む
         ❌ 禁止: 煽りタイトル、根拠なき予測

         サンプル記事を生成してみましょうか？
```

#### 7.2.2 号レビュー対話

メルマガ号が生成されるたびに、配信者にプレビューを提示しフィードバックを収集する。

```
トリガー: メルマガ号生成完了
           ↓
配信者にプレビュー通知
           ↓
┌─── 承認 ──────────── → 配信スケジュール、承認シグナル記録
│
├─── 修正指示 ────────── → 対話セッション開始
│    「見出しを変えて」      ↓
│    「もっと具体例を」    AIがフィードバックを解析
│                           ↓
│                        学習シグナル抽出
│                           ↓
│                        プロンプトにルール追加/更新
│                           ↓
│                        修正版を再生成
│                           ↓
│                        再レビュー → 承認 or 再修正
│
└─── 無視/長時間放置 ── → 関心低下シグナル記録
```

#### 7.2.3 スタイルチューニング対話

配信者がいつでも自発的にプロンプトの方向性を調整できるチャット。

```
[User]   最近の号、ちょっと文章が長くなってきた気がする。
         もう少しコンパクトにできない？

[System] 確かに直近3号を見ると、セクションあたりの平均文字数が
         380→520文字に増えています。

         どのくらいの長さが理想ですか？

[User]   1セクション300文字くらいで、要点だけ。
         興味ある人は元記事読むから。

[System] 分かりました。以下を学習しました:
         📝 セクション本文は300文字以内を目安
         📝 詳細は元記事に委ね、要点と洞察に絞る

         次号から反映します。
```

### 7.3 プロンプトの構造

#### 7.3.1 記事作成プロンプトの構成要素

学習済みルールは以下のブロックに分類され、最終的に1つの compiledPrompt に統合（コンパイル）される。

```
compiledPrompt の構造:

[A] ベースシステム指示（全メルマガ共通・変更されない）
[B] メルマガ固有コンテキスト（設定から自動生成）
[C] 学習済みスタイルガイド            ← 対話から学習
[D] 学習済み構成ルール                ← 対話から学習
[E] 学習済み制約・禁止事項            ← 対話から学習
[F] 良い例・悪い例                    ← 対話から学習
[G] 配信メトリクスから学習した知見     ← BigQueryから自動注入
```

#### 6.3.2 レビュープロンプトの構成要素

```
compiledPrompt (review) の構造:

[A] ベースレビュー指示
[B] メルマガ固有の品質基準
[C] 学習済みチェック項目              ← 対話から学習
[D] 過去の修正パターン                ← 対話から学習
[E] 見逃してはいけない項目            ← 対話から学習
```

### 7.4 記事作成プロンプトの学習

#### 7.4.1 学習トリガーと処理

| トリガー                 | 処理                                                |
| ------------------------ | --------------------------------------------------- |
| オンボーディング対話完了 | 初期ルール群を生成、compiledPrompt v1 作成          |
| 号レビューで修正指示     | フィードバック解析 → ルール追加/強化 → 再コンパイル |
| スタイルチューニング対話 | 対話解析 → ルール追加/修正 → 再コンパイル           |
| 配信メトリクス変化       | BigQuery分析結果 → メトリクス知見を [G] に注入      |
| 配信者の承認             | 既存ルールの confidence を強化                      |

#### 6.4.2 対話からのルール抽出

配信者のフィードバックは Vertex AI によってリアルタイムに解析され、構造化された LearningSignal に変換される。一時的な修正（今回だけの話）と恒久的なルール（今後ずっと適用）が自動的に区別される。

#### 6.4.3 ルールの確信度管理

| 条件                               | confidence への影響                |
| ---------------------------------- | ---------------------------------- |
| 初回抽出                           | 0.6 で開始                         |
| 配信者が明示的に同意               | +0.2                               |
| 同じ趣旨のフィードバックが再度発生 | +0.15（強化）                      |
| 反する指示が発生                   | -0.3（矛盾解消を配信者に確認）     |
| confidence < 0.3                   | ルール削除候補として配信者に確認   |
| confidence > 0.9                   | 確定ルール（コアルールとして保護） |

### 7.5 レビュープロンプトの学習

レビュープロンプトは「配信者がどこをチェックするか」を学ぶ。

| シグナル             | 学習内容                                              |
| -------------------- | ----------------------------------------------------- |
| 修正指示の内容       | 配信者はここをチェックしている → チェック項目追加     |
| 修正指示の頻度       | 同じ種類の修正が繰り返される → 重点チェック項目に昇格 |
| 承認された号の特徴   | この品質なら通る → 合格基準の学習                     |
| 修正されなかった問題 | 配信者はこれは気にしない → チェック項目の優先度下げ   |

レビュースコアの閾値は学習によって調整される。「レビュー通過したのに修正した」場合は閾値を上げ、「レビュー不通過だったが問題なかった」場合は閾値を下げる。

### 7.6 学習シグナルの種類と重み

#### 明示的シグナル（配信者の直接フィードバック）

| シグナル種別         | 重み | 例                         |
| -------------------- | ---- | -------------------------- |
| explicit_instruction | 1.0  | 「結論を先に書いて」       |
| positive_feedback    | 0.8  | 「この見出しいいね」       |
| negative_feedback    | 0.9  | 「この表現は堅すぎる」     |
| example_good         | 0.85 | 「こういう書き出しがいい」 |
| example_bad          | 0.85 | 「こういうのはやめて」     |
| constraint           | 0.95 | 「煽りタイトル禁止」       |

#### 暗黙的シグナル（行動から推測）

| シグナル種別       | 重み | 推測ロジック                         |
| ------------------ | ---- | ------------------------------------ |
| quick_approval     | 0.3  | 生成後5分以内に承認 → 高品質の証拠   |
| slow_approval      | 0.1  | 生成後24h以上放置 → 関心低下 or 満足 |
| revision_pattern   | 0.5  | 同じ箇所を3回以上修正 → 重要な好み   |
| metric_correlation | 0.4  | 特定ルール追加後にメトリクス改善     |

#### メトリクスシグナル（BigQuery分析から）

| シグナル種別          | 重み | 算出方法                                   |
| --------------------- | ---- | ------------------------------------------ |
| high_open_subject     | 0.4  | 開封率が平均+1σ以上の件名パターン          |
| high_click_structure  | 0.4  | クリック率が高い記事構成パターン           |
| low_unsubscribe       | 0.3  | 配信停止率が低い号のトーン特徴             |
| prompt_version_impact | 0.5  | プロンプトバージョン変更前後のメトリクス差 |

### 7.7 プロンプト進化アルゴリズム

#### コンパイルプロセス

```
入力:
  - ベースシステム指示 (固定)
  - メルマガ設定 (Firestore)
  - learnedRules[] (confidence順ソート)
  - styleGuide (学習済み)
  - examples[] (良い例・悪い例)
  - metricInsights[] (BigQueryから)

処理:
  1. confidence > 0.3 のルールのみ採用
  2. 矛盾するルールの解消（新しいルールを優先、配信者に確認をスケジュール）
  3. ルールをカテゴリ別に整理 ([C]~[G])
  4. Vertex AI にコンパイル依頼
  5. コンパイル結果を compiledPrompt に保存
  6. バージョン番号をインクリメント
  7. versions サブコレクションに履歴保存
```

#### コンパイル頻度

| トリガー                   | コンパイル実行   |
| -------------------------- | ---------------- |
| 新ルール追加               | 即時             |
| ルール confidence 変更     | バッチ（1日1回） |
| メトリクス知見更新         | 週次             |
| 配信者からの手動リクエスト | 即時             |

### 7.8 バージョン管理とロールバック

全バージョンが versions サブコレクションに保存。ロールバックは配信者の手動操作、または自動判定で実行可能。

```
自動ロールバック条件:
  - プロンプト更新後の3号連続で開封率が10%以上低下
  - 配信者の修正頻度が更新前の2倍以上に増加

自動ロールバック処理:
  1. 直近の安定版（3号以上連続承認されたバージョン）を特定
  2. 配信者に通知
  3. 配信者が承認 → ロールバック実行
  4. 問題を引き起こしたルールを confidence: 0.1 に低下
```

---

## 8. BigQuery 分析設計

### 8.1 データパイプライン

Firebase Extension「Stream Firestore to BigQuery」を使用。articles, tracking_events, editions, prompt conversations をストリーム/日次エクスポート。

### 8.2 記事クラスタリング

BigQuery ML K-Means（COSINE距離、20クラスタ）で記事をトピック分類。クラスタラベルはVertex AIで自動生成。メルマガセクション構成、トレンド検出、重複排除に活用。

### 8.3 ユーザーリアクション学習

Matrix Factorizationでユーザー×カテゴリ/クラスタの嗜好を学習。推論結果をFirestoreに書き戻してパーソナライズに活用。

### 8.4 コンテンツ最適化フィードバックループ

AI重要度スコアとリアクション実績を統合した品質スコアを算出。ロジスティック回帰で新規記事の品質を事前予測。

### 8.5 プロンプト効果分析

#### 7.5.1 プロンプトバージョン別パフォーマンス

各バージョンが生成した号のメトリクスを比較し、どのルール変更がパフォーマンスに影響したかを分析。

#### 7.5.2 ルール効果の帰属分析

各ルール導入前後3号のメトリクス比較により、ルール単位で効果を推定。効果の高いルールの confidence を強化し、効果のないルールの confidence を低下させる。

#### 7.5.3 週次バッチスケジュール

| 曜日 | 時刻  | 処理                                 |
| ---- | ----- | ------------------------------------ |
| 月曜 | 02:00 | 記事クラスタリング再実行             |
| 月曜 | 03:00 | クラスタラベリング（Vertex AI）      |
| 水曜 | 02:00 | ユーザー嗜好モデル再学習             |
| 水曜 | 03:00 | ユーザー嗜好推論 → Firestore同期     |
| 金曜 | 02:00 | 品質スコア再計算                     |
| 金曜 | 03:00 | 品質予測モデル再学習                 |
| 金曜 | 04:00 | プロンプトバージョン効果分析         |
| 金曜 | 05:00 | ルール効果帰属分析 → confidence 更新 |

---

## 9. API仕様

ベースURL: `https://asia-northeast1-{PROJECT_ID}.cloudfunctions.net/api`

### 情報ソース管理

| メソッド | パス                    | 説明                                           |
| -------- | ----------------------- | ---------------------------------------------- |
| GET      | /api/sources            | ソース一覧（type, healthStatusでフィルタ可）   |
| POST     | /api/sources            | ソース追加（type指定、scrapeの場合AI自動設定） |
| PUT      | /api/sources/:id        | ソース更新                                     |
| DELETE   | /api/sources/:id        | ソース削除                                     |
| POST     | /api/sources/:id/test   | ソース取得テスト実行                           |
| GET      | /api/sources/:id/health | ソースヘルス詳細                               |

### AIソース発見

| メソッド | パス                                             | 説明                                  |
| -------- | ------------------------------------------------ | ------------------------------------- |
| POST     | /api/newsletters/:id/discover-sources            | メルマガテーマからAIソース推薦を実行  |
| GET      | /api/newsletters/:id/recommendations             | 推薦ソース一覧                        |
| POST     | /api/newsletters/:id/recommendations/:rid/accept | 推薦ソースを承認（sourcesに登録）     |
| POST     | /api/newsletters/:id/recommendations/:rid/reject | 推薦ソースを却下                      |
| POST     | /api/sources/detect-feed                         | URL指定でRSSフィード自動検出          |
| POST     | /api/sources/generate-scrape-config              | URL指定でスクレイピング設定AI自動生成 |
| POST     | /api/sources/import-opml                         | OPMLファイルインポート                |
| GET      | /api/sources/opml-catalog                        | 利用可能なOPMLカタログ一覧            |
| POST     | /api/sources/opml-catalog/search                 | OPMLカタログからキーワード検索        |

### 記事

| メソッド | パス                   | 説明               |
| -------- | ---------------------- | ------------------ |
| GET      | /api/articles          | 記事一覧           |
| GET      | /api/articles/:id      | 記事詳細           |
| GET      | /api/articles/clusters | クラスタ別記事一覧 |

### メルマガ

| メソッド | パス                                        | 説明                                           |
| -------- | ------------------------------------------- | ---------------------------------------------- |
| GET      | /api/newsletters                            | メルマガ一覧                                   |
| POST     | /api/newsletters                            | メルマガ作成（プロンプトプロファイル自動生成） |
| PUT      | /api/newsletters/:id                        | メルマガ更新                                   |
| DELETE   | /api/newsletters/:id                        | メルマガ削除                                   |
| GET      | /api/newsletters/:id/editions               | 号一覧                                         |
| POST     | /api/newsletters/:id/generate               | 手動生成                                       |
| GET      | /api/newsletters/:nid/editions/:eid         | 号詳細                                         |
| GET      | /api/newsletters/:nid/editions/:eid/preview | HTMLプレビュー                                 |
| POST     | /api/newsletters/:nid/editions/:eid/approve | 配信者承認                                     |
| POST     | /api/newsletters/:nid/editions/:eid/deliver | 配信実行                                       |

### プロンプト育成チャット

| メソッド | パス                                                    | 説明                         |
| -------- | ------------------------------------------------------- | ---------------------------- |
| GET      | /api/newsletters/:id/prompt                             | プロンプトプロファイル取得   |
| GET      | /api/newsletters/:id/prompt/versions                    | バージョン履歴一覧           |
| GET      | /api/newsletters/:id/prompt/versions/:vid               | 特定バージョン詳細           |
| POST     | /api/newsletters/:id/prompt/rollback                    | 指定バージョンにロールバック |
| GET      | /api/newsletters/:id/prompt/rules                       | 学習済みルール一覧           |
| DELETE   | /api/newsletters/:id/prompt/rules/:rid                  | ルール手動削除               |
| GET      | /api/newsletters/:id/prompt/conversations               | 対話セッション一覧           |
| POST     | /api/newsletters/:id/prompt/conversations               | 新規対話セッション開始       |
| POST     | /api/newsletters/:id/prompt/conversations/:cid/messages | メッセージ送信               |
| GET      | /api/newsletters/:id/prompt/conversations/:cid          | 対話セッション取得           |
| PUT      | /api/newsletters/:id/prompt/conversations/:cid/complete | 対話セッション完了           |
| POST     | /api/newsletters/:id/prompt/compile                     | 手動プロンプト再コンパイル   |

### パーソナルリーダー

| メソッド | パス                           | 説明                                 |
| -------- | ------------------------------ | ------------------------------------ |
| GET      | /api/reports/templates         | レポートテンプレート一覧             |
| POST     | /api/reports/templates         | テンプレート作成                     |
| PUT      | /api/reports/templates/:id     | テンプレート更新                     |
| DELETE   | /api/reports/templates/:id     | テンプレート削除                     |
| GET      | /api/reports/templates/presets | プリセットテンプレート一覧           |
| POST     | /api/reports/generate          | レポート生成（オンデマンド）         |
| POST     | /api/reports/generate-preview  | レポートプレビュー生成（保存しない） |
| GET      | /api/reports                   | 生成済みレポート一覧                 |
| GET      | /api/reports/:id               | レポート詳細                         |
| DELETE   | /api/reports/:id               | レポート削除                         |

### 購読者

| メソッド | パス                 | 説明       |
| -------- | -------------------- | ---------- |
| GET      | /api/subscribers     | 購読者一覧 |
| POST     | /api/subscribers     | 購読者追加 |
| PUT      | /api/subscribers/:id | 購読者更新 |
| DELETE   | /api/subscribers/:id | 購読者削除 |

### 分析

| メソッド | パス                                        | 説明                   |
| -------- | ------------------------------------------- | ---------------------- |
| GET      | /api/analytics/overview                     | 分析概要               |
| GET      | /api/analytics/clusters                     | クラスタ分布           |
| GET      | /api/analytics/newsletter/:id/performance   | メルマガパフォーマンス |
| GET      | /api/analytics/newsletter/:id/prompt-impact | プロンプト効果分析     |

### システム

| メソッド | パス                | 説明                      |
| -------- | ------------------- | ------------------------- |
| GET      | /api/stats          | ダッシュボード統計        |
| POST     | /api/fetch-feeds    | 手動RSS取得               |
| POST     | /api/run-clustering | 手動クラスタリング実行    |
| POST     | /api/sync-bigquery  | BigQuery → Firestore 同期 |

---

## 10. Cloud Functions 一覧

| 関数名                       | トリガー                      | メモリ    | 説明                                             |
| ---------------------------- | ----------------------------- | --------- | ------------------------------------------------ |
| fetchRssFeeds                | Scheduler (毎時)              | 512MB     | 全RSSフィード巡回                                |
| **fetchScrapeSources**       | **Scheduler (毎時)**          | **1GB**   | **スクレイピングソース巡回（Puppeteer使用）**    |
| **fetchSitemapSources**      | **Scheduler (6時間ごと)**     | **256MB** | **sitemap.xmlベースの新着検出**                  |
| processArticle               | Firestore onCreate            | 512MB     | 記事AI分析                                       |
| generateEmbedding            | Firestore onUpdate            | 256MB     | 埋め込みベクトル生成                             |
| generateNewsletters          | Scheduler (毎時)              | 1GB       | メルマガ自動生成（学習済みプロンプト使用）       |
| reviewEdition                | Firestore onCreate (editions) | 1GB       | 学習済みレビュープロンプトで自動レビュー         |
| processConversationMessage   | Firestore onCreate (messages) | 1GB       | 対話メッセージ処理、学習シグナル抽出             |
| compilePrompt                | HTTP / Trigger                | 512MB     | プロンプト再コンパイル                           |
| **discoverSources**          | **HTTP**                      | **1GB**   | **AIソース発見パイプライン実行**                 |
| **detectFeed**               | **HTTP**                      | **512MB** | **URL指定でRSSフィード自動検出**                 |
| **generateScrapeConfig**     | **HTTP**                      | **1GB**   | **AIスクレイピング設定自動生成**                 |
| **verifyScrapeSelectors**    | **Scheduler (日次)**          | **1GB**   | **スクレイピングセレクタの動作確認・自動修復**   |
| **updateOpmlCatalog**        | **Scheduler (月次)**          | **256MB** | **OPMLカタログ更新・フィード死活確認**           |
| **scoreSourceReliability**   | **Scheduler (週次)**          | **256MB** | **ソース信頼度スコア再計算**                     |
| **generateReport**           | **HTTP / Scheduler**          | **1GB**   | **パーソナルリーダー: レポート生成**             |
| **generateScheduledReports** | **Scheduler (毎時)**          | **1GB**   | **スケジュール設定されたレポートの自動生成**     |
| **checkRobotsAndRsl**        | **HTTP**                      | **256MB** | **robots.txt・RSL・ToSコンプライアンスチェック** |
| **handleOptOut**             | **HTTP**                      | **256MB** | **コンテンツオーナーのオプトアウト申請処理**     |
| **similarityCheck**          | **Firestore onCreate**        | **512MB** | **生成コンテンツと元記事の類似度チェック**       |
| trackEvent                   | HTTP                          | 128MB     | 開封・クリックトラッキング                       |
| syncBigQueryResults          | Scheduler (週次)              | 512MB     | BQ分析結果をFirestoreに同期                      |
| runClustering                | Scheduler (週次月曜)          | 256MB     | クラスタリングジョブ起動                         |
| runUserPreference            | Scheduler (週次水曜)          | 256MB     | 嗜好モデル再学習                                 |
| runQualityScoring            | Scheduler (週次金曜)          | 256MB     | 品質スコア再計算                                 |
| runPromptAnalysis            | Scheduler (週次金曜)          | 256MB     | プロンプト効果分析・confidence更新               |
| checkPromptRollback          | Scheduler (日次)              | 256MB     | 自動ロールバック条件チェック                     |
| api                          | HTTP                          | 512MB     | REST API                                         |

全関数リージョン: asia-northeast1

---

## 11. インフラ・デプロイ

### GCP API 有効化

```bash
gcloud services enable \
  aiplatform.googleapis.com \
  bigquery.googleapis.com \
  bigquerydatatransfer.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudfunctions.googleapis.com \
  firestore.googleapis.com \
  --project=YOUR_PROJECT_ID
```

### デプロイ

```bash
cd functions && npm install && npm run build && cd ..
firebase deploy --only functions
firebase deploy --only firestore
cd frontend && npm run build && cd ..
firebase deploy --only hosting
```

---

## 12. セキュリティ

- Firebase Authentication (メール + Google)
- API: Bearer Token (Firebase ID Token)
- 管理操作: カスタムクレーム admin: true
- **対話データ・プロンプトプロファイルは該当メルマガのオーナーのみアクセス可**
- **プロンプトプロファイルは配信者のビジネス資産として保護**
- **スクレイピングは robots.txt を尊重、除外パスには巡回しない**
- **スクレイピング間隔は最低60秒以上の間隔を確保（サーバー負荷軽減）**
- **外部API（FeedBagel等）のAPIキーはSecret Managerで管理**
- メール配信APIキーはSecret Managerで管理

---

## 13. コンプライアンス・著作権対応

### 13.1 法的位置づけ

本システムの情報収集・AI分析・レポート生成は、以下の法的枠組みに準拠する。

| 処理フェーズ                       | 法的根拠                                                                        | リスクレベル     |
| ---------------------------------- | ------------------------------------------------------------------------------- | ---------------- |
| RSS購読・取得                      | RSSの「シンジケーション」設計意図。公開フィードの購読は通常許容                 | 低               |
| Webスクレイピング                  | robots.txt・ToS尊重が前提。公開情報の取得自体は日本法で明示的に禁止されていない | 中               |
| AI分析（要約・分類・スコアリング） | 著作権法30条の4（情報解析目的の利用）で原則許容                                 | 低               |
| パーソナルレポート生成（Mode A）   | 私的使用（著作権法30条）＋情報解析（30条の4）。他人への配信なし                 | 低               |
| 執筆支援（Mode B）                 | 人間が編集判断を挟む。情報収集ツールと同等の位置づけ                            | 中               |
| 自動配信（Mode C）                 | 元記事の市場代替リスク。30条の4の適用が困難                                     | 高（v1.2未実装） |

### 13.2 著作権法上の主要条文

**著作権法30条の4（情報解析のための利用）:**
情報解析の用に供する場合、著作物に表現された思想又は感情の享受を目的としない限り、必要と認められる限度で利用できる。ただし著作権者の利益を不当に害する場合は適用外。

**著作権法47条の5（軽微利用）:**
検索結果の提示など、軽微な利用は一定条件下で許容。レポート内でのスニペット的な引用に適用可能性あり。

**著作権法32条（引用）:**
引用の要件（主従関係、出所明示、必要最小限）を満たせば適法。AIの生成プロンプトに引用ルールを組み込む。

### 13.3 技術的コンプライアンス対策

| 対策                                   | 実装方法                                                                                     | 適用モード     |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | -------------- |
| **robots.txt 遵守**                    | 巡回前に必ずrobots.txtを取得・パースし、Disallowパスをスキップ                               | 全モード       |
| **RSL (Really Simple Licensing) 対応** | rsl.txt存在チェック。ライセンス条件を読み取り、制限付きソースにはフラグを設定                | 全モード       |
| **ToS自動チェック**                    | スクレイピング対象サイトのToSをAIで解析し、bot禁止条項の有無を判定（初回登録時）             | スクレイピング |
| **レート制限**                         | ドメインあたり最低60秒間隔。高負荷サイトには自動的にバックオフ                               | 全モード       |
| **User-Agent明示**                     | 独自のUser-Agent文字列で身元を明示（例: `NewsButlerBot/1.0; +https://news-butler.example.com/bot`） | 全モード       |
| **類似度チェック**                     | 生成レポートと元記事の類似度をベクトル比較。閾値（0.85）超過で自動ブロック・再生成           | Mode B, C      |
| **引用ガイドライン**                   | AI生成プロンプトに「元記事の表現をそのまま使わない」「出典リンクを必ず含める」を組み込み     | Mode B, C      |
| **オプトアウト機構**                   | コンテンツオーナーがソース除外を申請できるフォーム＋APIエンドポイント                        | 全モード       |

### 13.4 ソースカテゴリ別の利用ルール

| ソースカテゴリ           | 再利用の許容度                       | 対応方針                                             |
| ------------------------ | ------------------------------------ | ---------------------------------------------------- |
| **プレスリリース**       | 高（再利用を前提として発行）         | 要約・分析に積極的に使用可。出所明示                 |
| **企業公式ブログ**       | 中（広報目的）                       | 要約はOK、本文の大量引用は避ける。リンク必須         |
| **ニュースメディア記事** | 低（著作権保護が強い）               | 事実の報道部分のみ利用。表現の複製は不可。リンク必須 |
| **学術論文・レポート**   | 中（引用文化が確立）                 | 引用要件を遵守。著者・出典の明示                     |
| **SNS投稿**              | 低〜中（プラットフォーム規約に依存） | 埋め込みリンクを推奨。本文コピーは避ける             |

### 13.5 運用的コンプライアンス

| 対策                           | 内容                                                                   |
| ------------------------------ | ---------------------------------------------------------------------- |
| **利用ポリシー公開**           | 「どのように記事を収集・利用しているか」の透明性ポリシーをサイトに掲載 |
| **コンテンツオーナー連絡窓口** | 問い合わせ・削除要請に対応する窓口を設ける                             |
| **オプトアウト対応SLA**        | 削除要請から48時間以内にソースを無効化                                 |
| **法的レビュー**               | 正式リリース前に知財専門の弁護士に仕様レビューを受ける                 |
| **コンプライアンスログ**       | robots.txt確認、ToSチェック、オプトアウト対応の全記録を保持            |
| **定期監査**                   | 四半期ごとにソースの利用状況とコンプライアンス状態を監査               |

### 13.6 国際対応（英語ソースを含む場合）

| 法域                       | 主要要件                                            | 対応                                                               |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| **EU (AI Act / GDPR)**     | オプトアウト尊重、学習データ透明性                  | EU圏ソースにはrobots.txt + RSL + オプトアウトの三重チェック        |
| **米国 (DMCA / Fair Use)** | 技術的保護手段の回避禁止、フェアユースの4要素テスト | DMCA回避行為の禁止。変形的利用（transformative use）を意識した設計 |
| **日本**                   | 著作権法30条の4、不正競争防止法                     | 情報解析目的の範囲内で利用。市場代替を避ける設計                   |

---

## 14. 運用・監視

### アラート

| アラート条件                                   | 通知先             |
| ---------------------------------------------- | ------------------ |
| Cloud Functions エラー率 > 5%                  | Slack / メール     |
| RSS取得の連続失敗 3回以上                      | Slack              |
| **スクレイピング構造変更検知（自動修復成功）** | **Slack**          |
| **スクレイピング構造変更検知（自動修復失敗）** | **Slack / メール** |
| **ソース信頼度 < 20（自動無効化候補）**        | **Slack**          |
| メルマガ生成失敗                               | Slack / メール     |
| Vertex AI API エラー                           | Slack              |
| BigQuery ジョブ失敗                            | Slack              |
| **プロンプト自動ロールバック発生**             | **Slack / メール** |
| **プロンプト成熟度が低下**                     | **Slack**          |

---

## 15. ディレクトリ構成

```
ai-newsletter-system/
├── .github/workflows/deploy.yml
├── docs/
│   ├── SPECIFICATION.md
│   └── ARCHITECTURE.md
├── functions/src/
│   ├── index.ts
│   ├── models/types.ts
│   ├── services/
│   │   ├── vertexAiService.ts
│   │   ├── rssService.ts
│   │   ├── newsletterService.ts
│   │   ├── bigqueryService.ts
│   │   ├── trackingService.ts
│   │   ├── embeddingService.ts
│   │   ├── sourceDiscovery/              ★ AIソース発見エンジン
│   │   │   ├── discoveryEngine.ts         発見エンジンコア
│   │   │   ├── feedDetector.ts            RSSフィード自動検出
│   │   │   ├── opmlManager.ts             OPMLカタログ管理・検索
│   │   │   ├── pressReleaseSearch.ts      プレスリリースサービス検索
│   │   │   ├── googleAlertGenerator.ts    Googleアラート生成
│   │   │   ├── sourceRecommender.ts       AI推薦・スコアリング
│   │   │   └── sourceHealthChecker.ts     ソースヘルスチェック
│   │   ├── scraping/                      ★ スクレイピングエンジン
│   │   │   ├── scrapeExecutor.ts          スクレイピング実行
│   │   │   ├── selectorGenerator.ts       AIセレクタ自動生成
│   │   │   ├── structureMonitor.ts        構造変更検知・自動修復
│   │   │   ├── sitemapParser.ts           sitemap.xmlパーサ
│   │   │   └── puppeteerPool.ts           Puppeteerインスタンス管理
│   │   ├── personalReader/                ★ パーソナルリーダーエンジン
│   │   │   ├── reportGenerator.ts         レポート生成コア
│   │   │   ├── templateManager.ts         テンプレート管理
│   │   │   ├── presetTemplates.ts         プリセットテンプレート定義
│   │   │   └── reportScheduler.ts         レポートスケジュール管理
│   │   ├── compliance/                    ★ コンプライアンスエンジン
│   │   │   ├── robotsTxtChecker.ts        robots.txt解析
│   │   │   ├── rslChecker.ts              RSL (Really Simple Licensing) 解析
│   │   │   ├── tosAnalyzer.ts             ToS AI解析
│   │   │   ├── similarityChecker.ts       生成物と元記事の類似度チェック
│   │   │   └── optOutHandler.ts           オプトアウト処理
│   │   └── promptLearning/               ★ プロンプト学習エンジン
│   │       ├── engine.ts                  学習エンジンコア
│   │       ├── signalExtractor.ts         対話→学習シグナル抽出
│   │       ├── promptCompiler.ts          ルール→プロンプト合成
│   │       ├── conversationHandler.ts     対話セッション管理
│   │       ├── reviewEngine.ts            レビュープロンプト実行
│   │       ├── rollbackManager.ts         バージョン管理・ロールバック
│   │       └── metricFeedback.ts          BQ分析→confidence更新
│   └── utils/
├── bigquery/
│   ├── schemas/
│   └── queries/
│       ├── clustering.sql
│       ├── user_preference.sql
│       ├── quality_scoring.sql
│       ├── source_reliability.sql         ★ ソース信頼度スコア算出
│       ├── prompt_version_analysis.sql    ★ プロンプト効果分析
│       └── rule_attribution.sql           ★ ルール帰属分析
├── opml/                                  ★ OPMLカタログ
│   ├── awesome-rss-feeds.opml
│   ├── awesome-tech-rss.opml
│   ├── awesome-ai-feeds.opml
│   └── custom/                             管理者追加OPML
├── frontend/src/
│   ├── components/
│   │   ├── SourceDiscovery/               ★ ソース発見UI
│   │   │   ├── SourceDiscovery.tsx          メイン画面
│   │   │   ├── RecommendationList.tsx       AI推薦リスト
│   │   │   ├── FeedDetector.tsx             フィード検出UI
│   │   │   ├── ScrapeConfigEditor.tsx       スクレイピング設定編集
│   │   │   ├── OpmlImporter.tsx             OPMLインポートUI
│   │   │   └── SourceHealthDashboard.tsx    ソースヘルス表示
│   │   ├── PersonalReader/                ★ パーソナルリーダーUI
│   │   │   ├── ReportViewer.tsx             レポート閲覧画面
│   │   │   ├── TemplateManager.tsx          テンプレート管理画面
│   │   │   ├── TemplateEditor.tsx           テンプレート作成・編集
│   │   │   ├── PresetSelector.tsx           プリセット選択UI
│   │   │   └── ReportHistory.tsx            レポート履歴一覧
│   │   ├── PromptStudio/                  ★ プロンプト育成UI
│   │   │   ├── PromptStudio.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MaturityIndicator.tsx
│   │   │   ├── RulesList.tsx
│   │   │   ├── VersionHistory.tsx
│   │   │   └── VersionDiff.tsx
│   │   └── ...
│   └── hooks/
│       ├── useChat.ts
│       └── useSourceDiscovery.ts           ★ ソース発見hook
├── firebase.json
├── firestore.rules
└── firestore.indexes.json
```

---

## 16. 開発ロードマップ

### Phase 1: MVP（基盤構築）— 2〜3週間

- [x] Firestoreデータモデル設計
- [x] Cloud Functions: RSS収集・AI記事分析・メルマガ生成・REST API
- [x] Firestoreセキュリティルール & インデックス
- [ ] 管理ダッシュボード（Svelte）
- [ ] メール配信連携（SendGrid）
- [ ] Firebase Authentication統合
- [ ] CI/CD（GitHub Actions）
- [ ] **コンプライアンス基盤（robots.txt/RSLチェッカー、オプトアウトAPI）**

### Phase 1.5: パーソナルリーダー（Mode A）— 1〜2週間

- [ ] データモデル: report_templates, generated_reports
- [ ] プリセットテンプレート5種実装（朝ブリーフィング/技術深掘り/経営者向け/競合/週次）
- [ ] レポート生成エンジン（reportGenerator.ts, templateManager.ts）
- [ ] カスタムテンプレート作成（対話 or フォーム）
- [ ] スケジュール自動生成（reportScheduler.ts）
- [ ] パーソナルリーダーUI（PersonalReader/）
- [ ] レポート閲覧・履歴管理

### Phase 2: AIソース発見エンジン & 複合収集 — 2〜3週間

- [ ] データモデル: sources（type拡張）, source_recommendations
- [ ] フィード発見パイプライン（feedDetector.ts, opmlManager.ts）
- [ ] OPMLカタログ統合・検索（awesome-rss-feeds等のインポート）
- [ ] プレスリリースサービス検索（PR TIMES RSS等）
- [ ] Googleアラート連携
- [ ] AIスクレイピング設定自動生成（selectorGenerator.ts）
- [ ] スクレイピング実行エンジン（scrapeExecutor.ts, puppeteerPool.ts）
- [ ] sitemap.xmlパーサ（sitemapParser.ts）
- [ ] 構造変更検知・自動修復（structureMonitor.ts）
- [ ] AIソース推薦UI（SourceDiscovery/）
- [ ] OPMLインポートUI
- [ ] ソースヘルスモニタリング

### Phase 3: プロンプト学習エンジン（コア）— 3週間

- [ ] データモデル: prompt_profiles, conversations, versions
- [ ] 学習エンジンコア（engine.ts）
- [ ] 対話→学習シグナル抽出（signalExtractor.ts）
- [ ] ルール→プロンプト合成コンパイラ（promptCompiler.ts）
- [ ] 対話セッション管理（conversationHandler.ts）
- [ ] オンボーディング対話フロー（ソース発見と連動）
- [ ] 号レビュー対話フロー
- [ ] プロンプト育成チャットUI（PromptStudio/）
- [ ] 成熟度スコア算出
- [ ] バージョン管理・ロールバック（rollbackManager.ts）
- [ ] 記事生成パイプラインへの統合
- [ ] レビュープロンプトによる自動レビュー（reviewEngine.ts）

### Phase 4: トラッキング & BigQuery基盤 — 2週間

- [ ] トラッキングピクセル / リンクラッパー
- [ ] Firestore → BigQuery ストリーミング
- [ ] BigQueryテーブルスキーマ（prompt_version_metrics, source_metrics含む）
- [ ] 日次集計バッチ

### Phase 5: 記事クラスタリング — 1〜2週間

- [ ] 埋め込みベクトル生成
- [ ] BigQuery ML K-Meansクラスタリング
- [ ] クラスタラベリング → Firestore同期

### Phase 6: パーソナライゼーション & 効果分析 — 2〜3週間

- [ ] ユーザー嗜好モデル（Matrix Factorization）
- [ ] 品質スコア・予測モデル
- [ ] **プロンプトバージョン別パフォーマンス分析**
- [ ] **ルール効果帰属分析 → confidence自動更新**
- [ ] **メトリクスシグナルのプロンプトへのフィードバック**
- [ ] **自動ロールバック条件チェック**
- [ ] **ソース信頼度スコア算出・自動無効化**
- [ ] **継続的ソース推薦（カバレッジギャップ検出）**

### Phase 7: 運用改善 & 拡張 — 継続的

- [ ] A/Bテスト（プロンプトバリアント含む）
- [ ] マルチ言語対応
- [ ] プロンプトテンプレート共有（メルマガ間でのルール共有）

---

## 変更履歴

| 日付       | バージョン | 変更内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-02-27 | 1.0.0      | 初版作成                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-02-27 | 1.1.0      | プロンプト学習エンジン追加（セクション6）、対話によるプロンプト育成フロー、レビュープロンプト学習、バージョン管理・ロールバック、BigQueryプロンプト効果分析（セクション7.5）、関連データモデル・API・Cloud Functions・ディレクトリ構成の更新                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-02-27 | 1.2.0      | AIソース発見エンジン追加（セクション6）。情報ソースをRSS単一からRSS/スクレイピング/Googleアラート/sitemapの4種に拡張。OPMLカタログ検索、フィード発見API連携、AI推薦フロー、AIセレクタ自動生成、構造変更検知・自動修復、ソース信頼度スコアリング。データモデル（sources拡張、ScrapeConfig、source_recommendations）、API 9エンドポイント追加、Cloud Functions 8関数追加、ロードマップPhase 2に配置。全セクション番号を繰り下げ。                                                                                                                                                                              |
| 2026-02-27 | 1.3.0      | 利用モード3区分（パーソナルリーダー/執筆支援/自動配信）導入。パーソナルリーダー機能（セクション5.8）: 目的別レポートテンプレート（5種プリセット+カスタム）、レポート生成エンジン、スケジュール自動生成。コンプライアンス・著作権対応セクション（セクション13）新設: 著作権法30条の4/32条/47条の5の法的整理、技術的コンプライアンス対策（robots.txt/RSL/ToS/類似度チェック/オプトアウト）、ソースカテゴリ別利用ルール、国際対応。データモデル（report_templates, generated_reports）、API 10エンドポイント追加、Cloud Functions 5関数追加、ロードマップPhase 1.5追加。競合分析（Feedly/Inoreader/Folo比較）。 |
| 2026-02-27 | 1.3.1      | サービス名「Omokane（思兼）」決定。リポジトリ名 `omokane`。仕様書全体にブランディング反映。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-03-02 | 1.4.0      | サービス名を「News Butler（ニュースバトラー）」に変更。AI執事キャラクター「バトラーくん」導入。リポジトリ名 `news-butler`。コンセプトを「あなた専属のAI執事がニュースを届ける」に刷新。仕様書全体にブランディング反映。                                                                                                                                                                                                                                                                                                                                                                                         |
