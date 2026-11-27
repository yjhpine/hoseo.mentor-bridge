# 학교 서버용 웹 이미지 (docs/school-server.md, docs/architecture.md 11장 11번)
# 저장소 맨 위에서 빌드합니다:
#   docker build -f deploy/school/Dockerfile \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
#     -t hoseo-mentor .
# NEXT_PUBLIC_ 값은 브라우저 코드에 빌드할 때 박히므로 빌드 인자로 넘깁니다(공개 값, secret 아님).
# 보통은 docker-compose.yml이 .env를 읽어 대신 넘깁니다.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# next build의 standalone 결과물: server.js와 실행에 필요한 node_modules만 들어 있습니다.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# 하루 한 번 Supabase 깨우기 (cron에서 docker exec로 부름)
COPY --from=build --chown=node:node /app/scripts/keepalive.mjs ./keepalive.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/about || exit 1
CMD ["node", "server.js"]
