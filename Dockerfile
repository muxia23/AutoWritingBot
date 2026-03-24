# ── Stage 1: 构建 ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件，利用 Docker 层缓存
COPY package*.json ./
RUN npm ci --frozen-lockfile

# 复制源码并构建
COPY . .
RUN npm run build

# ── Stage 2: 生产服务 ────────────────────────────────────────
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置（含微信代理）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
