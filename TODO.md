# AI Chat 実装 TODO

## Phase 1: 環境構築

### プロジェクト初期化
- [x] ルートに `.gitignore` を作成（`node_modules`, `.env`, `.env.local`, `dist`, `.next`, `prisma/generated` 等を除外）
- [x] モノレポ構成でルートの `package.json` を作成
- [x] `backend/` ディレクトリを作成し Hono プロジェクトを初期化
  - `npm init -y` → TypeScript / tsx / @hono/node-server をインストール
  - `tsconfig.json` を設定
- [x] `frontend/` ディレクトリを作成し Next.js プロジェクトを初期化
  - `npx create-next-app@latest frontend --typescript --tailwind --app`
  - shadcn/ui を初期化 (`npx shadcn@latest init`)

### MongoDB / Prisma セットアップ
- [x] MongoDB Atlas でクラスターを作成・接続文字列を取得
- [x] `backend/` に Prisma をインストール (`npm install prisma @prisma/client`)
- [x] `prisma/schema.prisma` に `Session` / `Message` モデルを定義
- [x] `backend/.env` に `DATABASE_URL` を設定後、`npx prisma generate` でクライアントを生成

---

## Phase 2: バックエンド実装

### 基盤
- [x] `backend/src/index.ts` — Hono アプリのエントリポイントを作成
  - CORS 設定（フロントエンドのオリジンを許可）
  - ルートを登録

### AI サービス
- [x] `backend/src/services/claude.ts` を実装
  - Groq SDK をインストール（Anthropic → Groq に切り替え）
  - システムプロンプトを定義（丁寧なアシスタント）
  - ストリーミングレスポンスを返す関数を実装

### セッションサービス
- [x] `backend/src/services/session.ts` を実装
  - MongoDB ネイティブドライバーで実装（Prisma ARM64 非対応のため切り替え）
  - セッション取得・作成
  - メッセージの保存
  - 直近20ターン分の履歴取得

### APIルート
- [x] `backend/src/routes/chat.ts` を実装
  - `POST /api/chat` — メッセージ受信 → 履歴取得 → AI呼び出し → SSEでストリーミング返却 → 完了後にDBへ保存
- [x] `backend/src/routes/history.ts` を実装
  - `GET /api/history/:sessionId` — 会話履歴を返す
  - `DELETE /api/history/:sessionId` — 会話履歴を削除

### 動作確認
- [x] `npm run dev` でバックエンドを起動
- [x] curl / HTTP クライアントで各エンドポイントを手動テスト

---

## Phase 3: フロントエンド実装

### 共通
- [x] `frontend/lib/api.ts` を実装
  - `sendMessage(sessionId, message)` — SSEストリームを返す
  - `getHistory(sessionId)` — 履歴取得
  - `deleteHistory(sessionId)` — 履歴削除
- [x] `frontend/lib/session.ts` を実装
  - localStorage からセッションIDを取得 or 新規生成（crypto.randomUUID）

### UIコンポーネント
- [x] `MessageBubble.tsx` — ユーザー・AIのメッセージ表示
- [x] `ChatWindow.tsx` — メッセージ一覧の表示・自動スクロール
- [x] `InputForm.tsx` — テキスト入力・送信ボタン（Enterキー送信対応）

### ページ
- [x] `app/page.tsx` を実装
  - ページ初期化時にセッションIDを取得・履歴をロード
  - メッセージ送信 → ストリーミングでAI返答を逐次表示
  - 送信中はローディング状態を表示
  - 「会話をリセット」ボタン

### スタイル・UX
- [x] レスポンシブ対応（スマホで使いやすいレイアウト）
- [x] ストリーミング中のカーソル点滅アニメーション
- [x] スクロールが最新メッセージに追従

### 動作確認
- [x] `npm run dev` でフロントエンドを起動
- [x] ブラウザで実際に会話してストリーミング・履歴保存を確認

---

## Phase 4: Docker 化

- [x] `backend/Dockerfile` を作成（マルチステージビルド）
- [x] `frontend/Dockerfile` を作成（マルチステージビルド）
- [x] ルートに `docker-compose.yml` を作成（ローカル開発用）
- [x] `docker-compose up` でローカル動作確認（Docker Desktop のインストールが必要）

---

## Phase 4.5: デプロイ前の修正タスク

### バグ修正
- [x] `backend/src/services/session.ts` の `MAX_HISTORY` を `20`（メッセージ数）から `40` に修正
  - 仕様は「直近20ターン分」= user + assistant で 40 メッセージ
- [x] フロントエンドのエラーハンドリング追加（`frontend/app/page.tsx`）
  - `sendMessage` 失敗時に空のアシスタントメッセージをリストから除去
  - ユーザーへのエラー表示（例：「送信に失敗しました。再試行してください。」）
  - `getHistory` 失敗時のエラーハンドリング

### バックエンド改善
- [x] MongoDB `sessionId` インデックスを起動時に自動作成（`backend/src/lib/mongodb.ts`）
  - `messages` コレクション: `{ sessionId: 1, createdAt: -1 }`
  - `sessions` コレクション: `{ sessionId: 1 }`（unique）
- [x] MongoDB 再接続ロジックを追加（`backend/src/lib/mongodb.ts`）
  - 接続断後に `client` をリセットして再接続できるようにする
- [x] graceful shutdown を追加（`backend/src/index.ts`）
  - `SIGTERM` / `SIGINT` を受けたら MongoDB 接続を閉じてプロセス終了
  - Cloud Run はコンテナ停止時に SIGTERM を送る

### Docker / ビルド最適化
- [x] `frontend/.dockerignore` を作成（`node_modules`, `.next`, `.env*` 等を除外）
- [x] `frontend/next.config.ts` に `output: 'standalone'` を追加
  - Cloud Run 向けに最小イメージを生成する
  - `frontend/Dockerfile` のランナーステージを standalone 構成に合わせて修正
- [x] `backend/package.json` から未使用の `@anthropic-ai/sdk` を削除

### セキュリティ強化
- [x] リクエストボディサイズ制限を追加（`backend/src/index.ts`）
  - Hono の bodyLimit ミドルウェアで上限を設定（例: 10KB）
- [x] メッセージ長バリデーションを追加（`backend/src/routes/chat.ts`）
  - `message` が空文字・極端に長い場合に 400 を返す（例: 上限 2000文字）
- [x] sessionId のフォーマットバリデーションを追加（UUID v4 形式のみ受け付ける）
- [x] セキュリティレスポンスヘッダーを追加（`backend/src/index.ts`）
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`

### レート制限・DoS対策
- [x] IPベースのレート制限を追加（`backend/src/index.ts`）
  - インメモリ実装で `/api/chat` に制限（20リクエスト/分）
  - Groq API のトークン課金を保護する目的
- [x] AI ストリーミングにタイムアウトを追加（`backend/src/services/claude.ts`）
  - AbortController で 30 秒後にストリームを強制終了
- [x] セッションあたりのメッセージ上限を設定（`backend/src/services/session.ts`）
  - 1セッションのメッセージ総数が 200 件を超えたら 429 を返す

### 本番環境対応強化
- [x] `/health` エンドポイントに MongoDB 接続確認を追加（`backend/src/index.ts`）
  - DB に ping を打って疎通確認・失敗時は 503 を返す
  - Cloud Run のヘルスチェックはこのエンドポイントを使う
- [x] 起動時の環境変数バリデーションを追加（`backend/src/index.ts`）
  - `GROQ_API_KEY` / `DATABASE_URL` が未設定なら起動失敗・エラーログを出す
- [x] 構造化ログ（JSON 形式）に変更（`backend/src/index.ts`）
  - Cloud Run / Cloud Logging で検索・フィルタしやすくする
  - リクエストメソッド・パス・ステータス・レスポンスタイムをログ出力

### 運用機能
- [x] MongoDB にTTLインデックスを追加（`backend/src/lib/mongodb.ts`）
  - `sessions` / `messages` コレクションに `expireAfterSeconds`（30日）を設定
  - Atlas の無料枠（512MB）を圧迫しないためのデータ自動削除
- [x] MongoDB 接続失敗時のエラーレスポンスを整備（`backend/src/index.ts`）
  - DB ダウン時にアプリがクラッシュせず 503 を返すようにする（onError ハンドラ）

---

## Phase 5: Google Cloud Run デプロイ

### 事前準備
- [x] Google Cloud プロジェクトを作成・`gcloud` CLI をセットアップ（プロジェクト: ai-chat-496407）
- [x] Artifact Registry にリポジトリを作成（asia-northeast1/ai-chat）
- [x] Secret Manager に `GROQ_API_KEY` / `DATABASE_URL` を登録

### デプロイ
- [x] バックエンドイメージをビルド・push → Cloud Run にデプロイ
  - URL: https://ai-chat-backend-471439678120.asia-northeast1.run.app
- [x] フロントエンドイメージをビルド・push（`NEXT_PUBLIC_API_URL` を注入）→ Cloud Run にデプロイ
  - URL: https://ai-chat-frontend-471439678120.asia-northeast1.run.app
- [x] 各サービスの URL を確認・環境変数を更新（FRONTEND_URL を本番 URL に設定）

### 動作確認
- [x] 本番 URL でエンドツーエンドの動作確認
- [x] ストリーミング・会話履歴の保存が正常に動作することを確認

---

## 優先順位メモ

1. **Phase 1 → 2 → 3** の順で進める（インフラは後回し）
2. ローカルで動いたら Phase 4 → 5
3 各 Phase 完了後に動作確認を必ず行う
