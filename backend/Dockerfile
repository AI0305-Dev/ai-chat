FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/index.js"]
