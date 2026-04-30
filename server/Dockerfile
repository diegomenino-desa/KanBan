# ── build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN rm -f package-lock.json && npm install --legacy-peer-deps

COPY . .
RUN npm run build

# ── runtime stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN rm -f package-lock.json && npm install --legacy-peer-deps --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
