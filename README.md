# News Butler

RSSを収集し、AI執事が指定テーマでレポートを生成するニュース集約Webアプリ。

| ドキュメント | 内容 |
|-------------|------|
| [Spec_service.md](./Spec_service.md) | サービス仕様・機能・UI |
| [Spec.md](./Spec.md) | システム仕様・API・CI/CD |

---

## 環境構築

新しい環境（開発PC・新規プロジェクト）でゼロからセットアップする手順。

### 前提ツール

| ツール | バージョン | インストール |
|-------|-----------|------------|
| Node.js | 20.x | [nodejs.org](https://nodejs.org/) |
| Firebase CLI | 最新 | `npm install -g firebase-tools` |
| Google Cloud SDK | 最新 | [インストール手順](https://cloud.google.com/sdk/docs/install) |

---

## 1. GCP / Firebase プロジェクト初期設定

> **既存プロジェクト（`akanmi-news-butler`）に参加する場合はオーナーに招待を依頼。**
> 新規にプロジェクトを作る場合は以下を実施。

### 1.1 GCP プロジェクト作成と API 有効化

```bash
# GCP にログイン
gcloud auth login

# プロジェクト作成（既存なら不要）
gcloud projects create akanmi-news-butler --name="News Butler"
gcloud config set project akanmi-news-butler

# 必要な API を有効化
gcloud services enable \
  cloudfunctions.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  identitytoolkit.googleapis.com \
  aiplatform.googleapis.com \
  cloudscheduler.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com
```

### 1.2 Firebase プロジェクトの設定

Firebase コンソール（https://console.firebase.google.com）で以下を設定。

**Firestore:**
1. Build → Firestore Database → データベースを作成
2. ロケーション: `nam5`（us-central）
3. 本番モードで開始（セキュリティルールはリポジトリの `firestore.rules` で管理）

**Firebase Auth:**
1. Build → Authentication → 始める
2. Sign-in method → メール/パスワード を有効化
3. Authorized domains に `localhost` が含まれていることを確認

**Firebase Hosting:**
1. Build → Hosting → 始める
2. ウィザードをスキップ（`firebase.json` で設定済み）

**Firebase App の登録:**
1. プロジェクトの設定 → 全般 → マイアプリ → Web アプリを追加
2. 「Firebase Hosting も設定する」にチェック
3. 表示された設定値（`apiKey`, `authDomain`, `projectId`, `appId`）を控える

### 1.3 Vertex AI の有効化

```bash
# Vertex AI API が有効化されていることを確認（1.1で実施済み）
# リージョンは us-central1 を使用（Cloud Functions と同リージョン）
```

---

## 2. サービスアカウントの作成と IAM 設定

CI/CD で使用するサービスアカウントを2つ作成する。

### 2.1 Firebase デプロイ用 SA（`github-action-*`）

Firebase Hosting / Functions / Firestore Rules のデプロイと、
Firebase Auth Authorized Domains の操作に使用。

```bash
# Firebase CLI が自動生成するため通常は手動作成不要
# GitHub Actions ワークフローで FirebaseExtended/action-hosting-deploy を使うと
# 以下のコマンドで SA が自動作成・設定される:
firebase init hosting:github
```

自動作成されない場合や権限が不足している場合は手動で付与：

```bash
SA_EMAIL="github-action-<数字>@akanmi-news-butler.iam.gserviceaccount.com"

# 必要なロール
gcloud projects add-iam-policy-binding akanmi-news-butler \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding akanmi-news-butler \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudfunctions.developer"

gcloud projects add-iam-policy-binding akanmi-news-butler \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/firebaserules.admin"

# Firebase Auth Authorized Domains 操作に必要
gcloud projects add-iam-policy-binding akanmi-news-butler \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/identityplatform.admin"

# Functions デプロイ時に必要（サービスアカウントを使用するため）
gcloud projects add-iam-policy-binding akanmi-news-butler \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"
```

**キーのエクスポート（GitHub Secrets に登録する JSON）:**

```bash
gcloud iam service-accounts keys create /tmp/firebase-sa.json \
  --iam-account="${SA_EMAIL}"

# 表示される JSON の中身を GitHub Secret に登録
cat /tmp/firebase-sa.json
```

### 2.2 GCS レポートアップロード用 SA

CI テスト・カバレッジ・VRT レポートを GCS にアップロードするために使用。

```bash
# SA 作成
gcloud iam service-accounts create ci-gcs-reporter \
  --display-name="CI GCS Reporter"

SA_GCS="ci-gcs-reporter@akanmi-news-butler.iam.gserviceaccount.com"

# GCS バケットへの書き込み権限を付与（後述のバケット作成後に実行）
gsutil iam ch "serviceAccount:${SA_GCS}:roles/storage.objectAdmin" \
  gs://akanmi-news-butler-ci

# キーのエクスポート
gcloud iam service-accounts keys create /tmp/gcs-sa.json \
  --iam-account="${SA_GCS}"

# client_email と private_key を GitHub Secrets に登録
python3 -c "
import json
with open('/tmp/gcs-sa.json') as f:
    d = json.load(f)
print('GCS_CLIENT_EMAIL:', d['client_email'])
print()
print('GCS_PRIVATE_KEY:')
print(d['private_key'])
"
```

---

## 3. GCS バケットの作成

CI レポート（テスト・カバレッジ・VRT）の保存先。

```bash
# バケット作成（ロケーションは Functions と同じ us-central1 推奨）
gsutil mb -p akanmi-news-butler -l us-central1 gs://akanmi-news-butler-ci

# CORS 設定（ブラウザからのレポート閲覧用）
cat > /tmp/cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set /tmp/cors.json gs://akanmi-news-butler-ci

# パブリック読み取りを許可（レポート URL をブラウザで直接開くため）
gsutil iam ch allUsers:objectViewer gs://akanmi-news-butler-ci

# GCS レポート用 SA に書き込み権限付与（2.2 で SA を作成した後）
gsutil iam ch \
  "serviceAccount:ci-gcs-reporter@akanmi-news-butler.iam.gserviceaccount.com:roles/storage.objectAdmin" \
  gs://akanmi-news-butler-ci
```

---

## 4. GitHub Actions の設定

### 4.1 Secrets の登録

GitHub リポジトリ → Settings → Secrets and variables → Actions → **Secrets** タブ

| Secret 名 | 値 | 取得元 |
|-----------|-----|-------|
| `FIREBASE_SERVICE_ACCOUNT_AKANMI_NEWS_BUTLER` | Firebase デプロイ用 SA の JSON 全体 | 2.1 で作成したキー |
| `GCS_CLIENT_EMAIL` | GCS 用 SA の `client_email` | 2.2 の出力 |
| `GCS_PRIVATE_KEY` | GCS 用 SA の `private_key`（`-----BEGIN...` から末尾まで） | 2.2 の出力 |

> `GCS_PRIVATE_KEY` は改行が `\n` に変換されていても問題ない（ワークフロー内で変換処理済み）。

### 4.2 Variables の登録

GitHub リポジトリ → Settings → Secrets and variables → Actions → **Variables** タブ

| Variable 名 | 値 |
|------------|-----|
| `VITE_FIREBASE_API_KEY` | Firebase アプリの API キー |
| `VITE_FIREBASE_AUTH_DOMAIN` | `akanmi-news-butler.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `akanmi-news-butler` |
| `VITE_FIREBASE_APP_ID` | Firebase アプリの App ID |
| `VITE_API_BASE_URL` | `https://us-central1-akanmi-news-butler.cloudfunctions.net/api` |

> **Secrets ではなく Variables に登録すること。**
> `VITE_FIREBASE_*` はビルド時にフロントエンドの JS に埋め込まれる公開値のため、
> Secrets（暗号化）にすると CI ログにマスク処理が入り余計な問題が起きる。

---

## 5. ローカル開発環境のセットアップ

### 5.1 リポジトリのクローン

```bash
git clone https://github.com/AkaKaz/news-butler.git
cd news-butler
```

### 5.2 依存関係のインストール

```bash
cd frontend && npm ci && cd ..
cd functions && npm ci && cd ..
```

### 5.3 フロントエンドの環境変数

`frontend/.env.local` を作成（Git 管理外）：

```env
VITE_FIREBASE_API_KEY=<Firebase API キー>
VITE_FIREBASE_AUTH_DOMAIN=akanmi-news-butler.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=akanmi-news-butler
VITE_FIREBASE_APP_ID=<Firebase アプリ ID>
VITE_API_BASE_URL=http://127.0.0.1:5001/akanmi-news-butler/us-central1/api
```

> 値は Firebase コンソール → プロジェクトの設定 → 全般 → マイアプリ から取得。

### 5.4 Firebase へのログインとプロジェクト設定

```bash
firebase login
firebase use akanmi-news-butler
```

### 5.5 エミュレータの起動

```bash
# Functions をビルドしてからエミュレータ起動
cd functions && npm run build && cd ..
firebase emulators:start
```

別ターミナルでフロントエンド起動：

```bash
cd frontend && npm run dev
```

| URL | 説明 |
|-----|------|
| http://localhost:5173 | フロントエンド |
| http://localhost:4000 | Firebase Emulator UI |
| http://localhost:8080 | Firestore エミュレータ |
| http://localhost:5001 | Functions エミュレータ |
| http://localhost:9099 | Auth エミュレータ |

---

## 6. 開発コマンド

### Functions

```bash
cd functions

npm run lint          # ESLint
npm run build         # TypeScript コンパイル
npm run build:watch   # ウォッチモード
npm test              # ユニットテスト
npm run test:coverage # ユニットテスト + カバレッジレポート生成
```

### フロントエンド

```bash
cd frontend

npm run dev              # 開発サーバ起動
npm run build            # 本番ビルド（frontend/dist/ に出力）
npm run check            # svelte-check 型チェック
npm run test:unit        # ユニットテスト（Vitest）
npm run test:coverage    # ユニットテスト + カバレッジ
npm run test:visual      # VRT スクリーンショット取得（Playwright）
npm run test:e2e         # E2E テスト（Playwright）
```

---

## 7. デプロイ

### 自動デプロイ（推奨）

- **本番**: `main` ブランチへのマージで自動実行
- **プレビュー**: PR 作成・更新で自動生成（PR ごとに固有 URL）

### 手動デプロイ

```bash
# フロントエンドビルド（本番用環境変数を設定した上で）
cd frontend && npm run build && cd ..

# Functions ビルド
cd functions && npm run build && cd ..

# 全リソースをデプロイ
firebase deploy --project akanmi-news-butler
```

個別デプロイ：

```bash
firebase deploy --only hosting --project akanmi-news-butler
firebase deploy --only functions --project akanmi-news-butler
firebase deploy --only firestore:rules --project akanmi-news-butler
```

---

## 8. VRT（ビジュアルリグレッションテスト）のセットアップ

reg-suit と GCS を使った VRT の設定。

### 設定ファイル

`frontend/regconfig.json`:

```json
{
  "core": {
    "workingDir": ".reg",
    "actualDir": "tests/snapshots-actual",
    "thresholdRate": 0.01
  },
  "plugins": {
    "reg-keygen-git-hash-plugin": true,
    "reg-publish-gcs-plugin": {
      "bucketName": "akanmi-news-butler-ci",
      "pathPrefix": "vrt"
    }
  }
}
```

### ベースラインの初回登録

`main` ブランチへの最初のプッシュ時に `update_visual_baseline` ジョブが自動実行され、
GCS にベースラインが登録される。

手動でベースラインを更新したい場合：

```bash
cd frontend

# ダミー設定でビルド
VITE_FIREBASE_API_KEY=dummy \
VITE_FIREBASE_AUTH_DOMAIN=dummy.firebaseapp.com \
VITE_FIREBASE_PROJECT_ID=dummy \
VITE_FIREBASE_APP_ID=dummy \
VITE_API_BASE_URL=http://localhost:3000 \
npm run build

# スクリーンショット取得
npm run test:visual

# GCS にアップロード（GOOGLE_APPLICATION_CREDENTIALS が設定されていること）
npx reg-suit run
```
