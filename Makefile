PROJECT_ID     := ai-chat-496407
REGION         := asia-northeast1
REGISTRY       := $(REGION)-docker.pkg.dev/$(PROJECT_ID)/ai-chat
BACKEND_IMAGE  := $(REGISTRY)/backend:latest
FRONTEND_IMAGE := $(REGISTRY)/frontend:latest
BACKEND_URL    := https://ai-chat-backend-471439678120.asia-northeast1.run.app
FRONTEND_URL   := https://ai-chat-frontend-471439678120.asia-northeast1.run.app

.PHONY: install dev dev-backend dev-frontend build deploy deploy-backend deploy-frontend

## 初期化
install:
	cd backend && npm install
	cd frontend && npm install

## 開発サーバー（Docker Compose）
dev:
	docker compose up --build

## バックエンドのみ起動
dev-backend:
	cd backend && npm run dev

## フロントエンドのみ起動
dev-frontend:
	cd frontend && npm run dev

## ローカル Docker イメージをビルド
build:
	docker compose build

## バックエンド・フロントエンドを両方デプロイ
deploy: deploy-backend deploy-frontend

## バックエンドのみデプロイ
deploy-backend:
	gcloud builds submit ./backend \
		--tag=$(BACKEND_IMAGE) \
		--region=$(REGION)
	gcloud run deploy ai-chat-backend \
		--image=$(BACKEND_IMAGE) \
		--region=$(REGION) \
		--platform=managed \
		--allow-unauthenticated \
		--min-instances=0 \
		--max-instances=10 \
		--memory=512Mi \
		--cpu=1 \
		--port=8080 \
		--set-secrets="GROQ_API_KEY=GROQ_API_KEY:latest,DATABASE_URL=DATABASE_URL:latest" \
		--set-env-vars="FRONTEND_URL=$(FRONTEND_URL)"

## フロントエンドのみデプロイ
deploy-frontend:
	gcloud builds submit ./frontend \
		--config=./frontend/cloudbuild.yaml \
		--region=$(REGION) \
		--substitutions="_NEXT_PUBLIC_API_URL=$(BACKEND_URL)"
	gcloud run deploy ai-chat-frontend \
		--image=$(FRONTEND_IMAGE) \
		--region=$(REGION) \
		--platform=managed \
		--allow-unauthenticated \
		--min-instances=0 \
		--max-instances=10 \
		--memory=512Mi \
		--cpu=1 \
		--port=3000
