# ビルドステージ
FROM node:18-alpine AS builder

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm install

# Prismaの設定とクライアント生成
COPY prisma ./prisma
RUN npx prisma generate

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# 本番ステージ
FROM node:18-alpine

WORKDIR /app

# 本番用の依存関係のみインストール
COPY package*.json ./
RUN npm install --production

# Prismaの設定とクライアント
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# ビルド済みのコード
COPY --from=builder /app/dist ./dist

# アップロードディレクトリ
RUN mkdir -p ./uploads

EXPOSE 3001

CMD ["node", "dist/index.js"]