#!/usr/bin/env bash
# 학교 서버에 새 버전 올리기 (docs/school-server.md 5장). Cloudflare처럼 자동 배포가 없어 이 스크립트로 올립니다.
#   ./deploy/school/update.sh          # Docker
#   ./deploy/school/update.sh node     # Docker 없이 Node + systemd
set -euo pipefail
cd "$(dirname "$0")/../.."

git pull --ff-only origin main

if [ "${1:-docker}" = "node" ]; then
  set -a; . deploy/school/.env; set +a
  npm ci --no-audit --no-fund
  npm run build
  # standalone에는 정적 파일이 빠져 있어 옆에 복사합니다.
  rm -rf .next/standalone/.next/static .next/standalone/public
  cp -r .next/static .next/standalone/.next/static
  cp -r public .next/standalone/public
  sudo systemctl restart hoseo-mentor
else
  (cd deploy/school && docker compose up -d --build)
  docker image prune -f >/dev/null
fi

sleep 5
curl -fsS -o /dev/null -w "확인: /about %{http_code}\n" http://127.0.0.1:3000/about
