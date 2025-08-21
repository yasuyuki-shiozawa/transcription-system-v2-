# ビルドステージ
FROM node:18-alpine AS builder

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# 本番ステージ
FROM node:18-alpine

WORKDIR /app

# 本番用の依存関係のみインストール
COPY package*.json ./
COPY --from=builder /app/prisma ./prisma
RUN npm install --production

# Prismaクライアント
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# ビルド済みのコード
COPY --from=builder /app/dist ./dist

# アップロードディレクトリ
RUN mkdir -p ./uploads

EXPOSE 3001

CMD ["node", "dist/index.js"]