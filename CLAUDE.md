# AI Chat プロジェクト仕様

## 概要

雑談・トーク特化のAIチャットボット。丁寧なアシスタントキャラクターと気軽に会話できるエンターテイメントアプリ。

## 技術スタック

### フロントエンド
- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**

### バックエンド
- **Hono** (APIサーバー)
- **Prisma** (ODM)
- **MongoDB** (会話履歴の永続化)

### AI
- **Claude API** (Anthropic)
- モデル: `claude-sonnet-4-6`
- ストリーミングレスポンス対応

### インフラ
- **Google Cloud Run** (フロントエンド・バックエンド両方をコンテナで実行)
- **MongoDB Atlas** (マネージドMongoDBを推奨)

## アーキテクチャ

```
[ブラウザ]
    ↓ HTTP / SSE (ストリーミング)
[Next.js フロントエンド] → Cloud Run
    ↓ REST API
[Hono バックエンド] → Cloud Run
    ↓              ↓
[Claude API]   [MongoDB]
```

## 機能要件

### 必須機能
- チャット画面でAIと会話できる
- AIの回答をストリーミングでリアルタイム表示
- 会話履歴をMongoDBに保存・読み込み
- セッションIDでユーザーを識別（認証なし・匿名）

### AIキャラクター
- 丁寧・親切なアシスタント口調
- システムプロンプトで人格を定義
- 会話の文脈を保持（直近Nターン分をAPIに渡す）

### 非機能要件
- 認証不要（匿名ユーザー）
- セッションIDはブラウザのlocalStorageで管理
- レスポンシブデザイン（スマホ対応）

## ディレクトリ構成

```
ai-chat/
├── frontend/          # Next.js アプリ
│   ├── app/
│   │   ├── page.tsx           # チャット画面
│   │   └── api/chat/route.ts  # Honoバックエンドへのプロキシ (任意)
│   ├── components/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   └── InputForm.tsx
│   └── lib/
│       └── api.ts             # バックエンドAPIクライアント
│
├── backend/           # Hono APIサーバー
│   ├── src/
│   │   ├── index.ts           # エントリポイント
│   │   ├── routes/
│   │   │   ├── chat.ts        # POST /chat, GET /sessions/:id
│   │   │   └── history.ts     # GET /history/:sessionId
│   │   ├── services/
│   │   │   ├── claude.ts      # Claude API呼び出し
│   │   │   └── session.ts     # セッション管理
│   │   └── prisma/
│   │       └── schema.prisma
│   └── Dockerfile
│
└── docker-compose.yml         # ローカル開発用
```

## データモデル (Prisma / MongoDB)

```prisma
model Session {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  sessionId String    @unique
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Message {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  sessionId String
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now())
  session   Session  @relation(fields: [sessionId], references: [sessionId])
}
```

## API エンドポイント (Hono)

| メソッド | パス | 説明 |
|--------|------|------|
| `POST` | `/api/chat` | メッセージ送信・AIレスポンス取得（SSEストリーミング） |
| `GET`  | `/api/history/:sessionId` | 会話履歴取得 |
| `DELETE` | `/api/history/:sessionId` | 会話履歴削除 |

### POST /api/chat リクエスト
```json
{
  "sessionId": "uuid-v4",
  "message": "こんにちは！"
}
```

## 開発ガイドライン

### コーディング規約
- TypeScriptの型は明示的に書く
- コメントは原則書かない
- 関数は小さく単一責任

### コマンド一覧（Makefile）

| コマンド | 内容 |
|---|---|
| `make install` | backend / frontend の依存パッケージをインストール |
| `make dev` | Docker Compose でローカル起動（推奨） |
| `make dev-backend` | バックエンドのみ起動（tsx watch） |
| `make dev-frontend` | フロントエンドのみ起動（next dev） |
| `make build` | ローカル Docker イメージをビルド |
| `make deploy` | バックエンド・フロントエンド両方を本番デプロイ |
| `make deploy-backend` | バックエンドのみ Cloud Run にデプロイ |
| `make deploy-frontend` | フロントエンドのみ Cloud Run にデプロイ |

> `make` が未インストールの場合: `winget install GnuWin32.Make`

### Cloud Run デプロイ
- ビルドは Cloud Build 経由で行う（`make deploy` で自動実行）
- シークレットは Secret Manager で管理（`GROQ_API_KEY` / `DATABASE_URL`）
- フロントエンドの `NEXT_PUBLIC_API_URL` はビルド時に注入される

### 環境変数

**バックエンド**
```
ANTHROPIC_API_KEY=
DATABASE_URL=mongodb+srv://...
```

**フロントエンド**
```
NEXT_PUBLIC_API_URL=https://backend-xxxxx.run.app
```

## Claude API 設定

```typescript
const systemPrompt = `あなたは親切で丁寧なAIアシスタントです。
ユーザーと楽しく雑談・会話することが得意です。
常に丁寧な口調を保ちながら、温かみのある会話をしてください。`
```

- 会話履歴は直近20ターン分をAPIに渡す
- ストリーミング: `stream: true`
- promptキャッシュを活用（システムプロンプトに `cache_control` を付与）
