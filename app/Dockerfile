FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/api/types.ts ./src/api/types.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --production

RUN mkdir -p /app/data

ENV PORT=3456
ENV DB_PATH=/app/data/analytics.db
EXPOSE 3456

CMD ["bun", "run", "server/index.ts"]
