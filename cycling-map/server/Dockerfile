# Pure-JS dependencies only (yjs, y-protocols, lib0, ws) — no native compilation needed,
# so alpine is safe here and keeps the image small on a Pi.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY relay.mjs ./

ENV HOST=0.0.0.0
ENV PORT=1234

EXPOSE 1234

CMD ["node", "relay.mjs"]
