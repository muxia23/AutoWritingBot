#!/usr/bin/env bash
#
# AutoWritingBot 部署脚本
# 用法：  bash deploy.sh [端口]        默认 2567
# 可重复执行：已部署过则拉取更新并重建
#
set -euo pipefail

PORT="${1:-2567}"
APP_DIR="${APP_DIR:-/opt/AutoWritingBot}"
REPO="https://github.com/muxia23/AutoWritingBot.git"
NAME="autowritingbot"
IMAGE="autowritingbot:latest"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m!! %s\033[0m\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "未找到 docker，请先安装"
command -v git    >/dev/null 2>&1 || die "未找到 git，请先安装：apt install -y git"

say "获取代码"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --quiet origin main
  git -C "$APP_DIR" reset --hard origin/main   # 丢弃服务器上的本地改动，以远端为准
else
  git clone --quiet "$REPO" "$APP_DIR"
fi
printf '当前版本：%s\n' "$(git -C "$APP_DIR" log --oneline -1)"

say "构建镜像"
# 不加 --no-cache：Dockerfile 先 COPY package*.json 再 npm ci，
# 依赖没变时能复用缓存；源码变了 COPY . . 层会失效并重新构建
docker build -t "$IMAGE" "$APP_DIR"

say "重建容器"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  -p "${PORT}:80" \
  "$IMAGE" >/dev/null

say "等待健康检查"
for i in $(seq 1 20); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$NAME" 2>/dev/null || echo starting)"
  [ "$status" = healthy ] && break
  [ "$status" = unhealthy ] && die "容器不健康，查看日志：docker logs $NAME"
  sleep 3
done
[ "${status:-}" = healthy ] || die "健康检查超时，查看日志：docker logs $NAME"

say "验证"
# 用中文字符串字面量校验，不要用 fflate/formatArticleText 这类标识符——
# 它们在压缩后会被改名，查不到会误判成部署失败
docker exec "$NAME" sh -c 'grep -lq "下载压缩包" /usr/share/nginx/html/assets/*.js' \
  || die "构建产物里没有预期内容，构建可能用了陈旧缓存"

served="$(curl -fsS "http://127.0.0.1:${PORT}/" | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)"
printf '容器直出入口文件：%s\n' "$served"

docker ps --filter "name=$NAME" --format '{{.Status}}  {{.Ports}}'

cat <<EOF

部署完成。端口 ${PORT}。

反向代理请指向 http://127.0.0.1:${PORT}
不要用「静态页面」方式指向 dist 目录——那样容器更新不会生效，
且旧 index.html 会引用已不存在的 hash 产物，导致白屏。

清理悬空镜像（可选）： docker image prune -f
EOF
