# Phase 0: プロジェクトブートストラップ実装計画

## Context

News Butler はAI駆動のニュースインテリジェンス＆メルマガ生成システム。現在はSpec.mdのみ存在し実装コードはゼロ。Phase 0ではFirebase/GCPプロジェクトの基盤を構築する。

## 方針

- Firebaseプロジェクトはステップバイステップで準備（コマンドをユーザーに指示）
- 1ブランチ (`feat/phase-0-bootstrap`) 上でIssue毎にコミットを分け、最後に1PR作成
- 各コマンド実行後にgitに登録し差分を確認可能にする
- Capacitorはこの段階では導入せず、MVP完成後に追加する（Viteの出力構成はCapacitor対応可能）

## 依存関係

```
Issue #1 (Firebase初期化) ──┬──> Issue #2 (monorepo構成) ──> Issue #3 (CI/CD)
                            ├──> Issue #4 (Authentication)
                            └──> Issue #5 (Firestoreルール)
```

---

## Step 1: Issue #1 — Firebase プロジェクト初期化

### 1-1. ユーザー実行コマンド（Firebase CLIセットアップ & init）
```bash
# Firebase CLIがなければインストール
npm install -g firebase-tools

# ログイン
firebase login

# firebase init で一括セットアップ（対話式）
firebase init
```

**`firebase init` の対話プロンプトで選択する内容:**

1. **サービス選択**（Spaceで選択、Enterで確定）:
   - [x] Firestore
   - [x] Functions
   - [x] Hosting
   - [x] Emulators

2. **プロジェクト選択**: 「Create a new project」を選択 → プロジェクトID `news-butler-dev` を入力

3. **Firestore**: デフォルトのルール・インデックスファイルをそのまま使用

4. **Functions**:
   - 言語: **TypeScript** を選択
   - ESLint: **Yes**
   - npm install: **Yes**

5. **Hosting**:
   - ディレクトリ: `frontend/dist` を入力（Vite出力先）
   - SPA: **Yes**（全URLを`/index.html`にリライト）

6. **Emulators**:
   - [x] Authentication Emulator
   - [x] Functions Emulator
   - [x] Firestore Emulator
   - [x] Hosting Emulator
   - Emulator UI: **Yes**
   - ポートはデフォルト（Auth:9099, Functions:5001, Firestore:8080, Hosting:5000）

**自動生成されるファイル:**

| ファイル | 生成元 |
|---------|--------|
| `firebase.json` | firebase init |
| `.firebaserc` | firebase init（プロジェクト紐付け） |
| `firestore.rules` | firebase init（デフォルトルール） |
| `firestore.indexes.json` | firebase init（空のインデックス） |
| `functions/package.json` | firebase init（TypeScript + ESLint） |
| `functions/tsconfig.json` | firebase init |
| `functions/tsconfig.dev.json` | firebase init |
| `functions/.eslintrc.js` | firebase init |
| `functions/src/index.ts` | firebase init（サンプル関数） |
| `.gitignore` | firebase init |

### 1-2. Claudeがカスタマイズ

`firebase init` で生成されたファイルを以下の点で調整:

| ファイル | カスタマイズ内容 |
|---------|----------------|
| `functions/src/index.ts` | `setGlobalOptions({ region: "asia-northeast1" })` + ヘルスチェックエンドポイント追加 |
| `functions/package.json` | `engines.node` を `22` に変更、firebase-functions v6 / firebase-admin v13 に更新 |
| `.gitignore` | `.env`, `.env.local` 等の追加 |

### 1-3. ユーザー実行コマンド（動作確認）
```bash
cd functions && npm install && npm run build
cd .. && firebase emulators:start
# 別ターミナルで:
curl http://localhost:5001/news-butler-dev/asia-northeast1/healthCheck
```

### 1-4. コミット
```
feat: Firebase プロジェクト初期化 (#1)
```

---

## Step 2: Issue #2 — monorepo 構成 & 開発環境セットアップ

### 2-1. コード作成（Claudeが実装）

| ファイル | 内容 |
|---------|------|
| `package.json` (root) | npm workspaces, 共通scripts |
| `tsconfig.base.json` | 共通TypeScript設定ベース |
| `eslint.config.mjs` | ESLint v9 flat config |
| `.prettierrc` | Prettier設定 |
| `.prettierignore` | Prettier除外 |
| `functions/tsconfig.json` | ベース継承に更新 |
| `frontend/package.json` | React 19 + Vite 6 + Vitest |
| `frontend/tsconfig.json` | ESNext, react-jsx |
| `frontend/vite.config.ts` | Vite設定 |
| `frontend/index.html` | SPAエントリ |
| `frontend/src/main.tsx` | Reactエントリ |
| `frontend/src/App.tsx` | ルートコンポーネント |
| `frontend/src/vite-env.d.ts` | Vite型定義 |
| `.env.example` | 環境変数テンプレート |
| `bigquery/schemas/.gitkeep` | ディレクトリ保持 |
| `bigquery/queries/.gitkeep` | ディレクトリ保持 |

### 2-2. ユーザー実行コマンド
```bash
npm install
npm run lint
npm run build
npm run format:check
```

### 2-3. コミット
```
feat: monorepo 構成 & 開発環境セットアップ (#2)
```

---

## Step 3: Issue #4 — Firebase Authentication セットアップ

### 3-1. ユーザー実行コマンド（Firebase Console）
- Firebase Console > Authentication > Sign-in method
  - Email/Password を有効化
  - Google を有効化

### 3-2. コード作成（Claudeが実装）

| ファイル | 内容 |
|---------|------|
| `scripts/setup-admin.ts` | 本番用admin claim設定スクリプト |
| `scripts/setup-admin-emulator.ts` | エミュレータ用admin claim設定 |
| `scripts/tsconfig.json` | スクリプト用TypeScript設定 |
| `frontend/src/lib/firebase.ts` | Firebase Client SDK初期化 + エミュレータ接続 |

`.env.example` にVITE_FIREBASE_* 変数を追加

### 3-3. ユーザー実行コマンド（動作確認）
```bash
firebase emulators:start
# Auth Emulator UIでユーザー作成後:
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 npx ts-node scripts/setup-admin-emulator.ts <uid>
```

### 3-4. コミット
```
feat: Firebase Authentication セットアップ (#4)
```

---

## Step 4: Issue #5 — Firestore セキュリティルール & インデックス定義

### 4-1. コード作成（Claudeが実装）

| ファイル | 内容 |
|---------|------|
| `firestore.rules` | 全コレクションのアクセス制御（上書き） |
| `firestore.indexes.json` | 複合インデックス16個（上書き） |
| `tests/firestore-rules.test.ts` | ルールユニットテスト |
| `jest.config.ts` | Jest設定 |

**セキュリティルール要約:**
- sources, articles: 認証済みread、admin write
- newsletters: owner read/update、admin全アクセス
- prompt_profiles + sub: newsletter owner限定（ビジネス資産保護）
- report_templates, generated_reports: userId ベース
- tracking_events: 匿名write許可、更新不可
- catch-all: 全拒否

**注意:** newsletters に `ownerId` フィールドが必要（Spec.mdには明示なし）

### 4-2. ユーザー実行コマンド
```bash
npm install  # テスト依存関係追加後
firebase emulators:exec "npx jest tests/firestore-rules.test.ts" --only firestore
```

### 4-3. コミット
```
feat: Firestore セキュリティルール & インデックス定義 (#5)
```

---

## Step 5: Issue #3 — CI/CD パイプライン（GitHub Actions）

### 5-1. コード作成（Claudeが実装）

| ファイル | 内容 |
|---------|------|
| `.github/workflows/ci.yml` | PR時: lint → test → build |
| `.github/workflows/deploy.yml` | main→staging自動, production→手動 |
| `.github/dependabot.yml` | npm + actions 週次更新 |

### 5-2. ユーザー実行コマンド（GitHub設定）
```bash
# Firebase CI トークン生成
firebase login:ci
# → GitHub Secrets に FIREBASE_TOKEN として登録
```

### 5-3. コミット
```
feat: CI/CD パイプライン（GitHub Actions）(#3)
```

---

## Step 6: PR作成

```bash
gh pr create --title "feat: Phase 0 - プロジェクトブートストラップ (#1, #2, #3, #4, #5)"
```

---

## 最終ディレクトリ構造

```
news-butler/
├── .github/workflows/{ci,deploy}.yml, dependabot.yml
├── bigquery/{schemas,queries}/.gitkeep
├── frontend/src/{lib/firebase.ts, App.tsx, main.tsx, vite-env.d.ts}
├── frontend/{index.html, package.json, tsconfig.json, vite.config.ts}
├── functions/src/index.ts
├── functions/{package.json, tsconfig.json}
├── scripts/{setup-admin.ts, setup-admin-emulator.ts, tsconfig.json}
├── tests/firestore-rules.test.ts
├── {.env.example, .firebaserc, .gitignore, .prettierrc, .prettierignore}
├── {eslint.config.mjs, firebase.json, firestore.rules, firestore.indexes.json}
├── {jest.config.ts, package.json, tsconfig.base.json}
└── Spec.md
```

## 検証手順

1. `npm install` → 依存関係インストール
2. `npm run lint` → ESLintエラーなし
3. `npm run build` → functions + frontend ビルド成功
4. `firebase emulators:start` → 全エミュレータ起動
5. ヘルスチェック応答確認
6. Firestoreルールテスト通過
7. GitHub PR作成 → CIワークフロー実行確認

## 技術決定メモ

- **Firebase先、Capacitor後**: WebでMVPを先に完成させ、モバイル対応は後から追加
- **npm workspaces**: 2パッケージ構成ではturborepoはオーバーキル
- **Firebase Functions v2**: `setGlobalOptions({ region: "asia-northeast1" })` で全関数のデフォルトリージョン設定
- **Node 22**: ローカル環境と一致
- **ESLint v9 flat config**: 最新のESLint設定形式
- **React 19 + Vite 6**: 最新フロントエンドスタック
