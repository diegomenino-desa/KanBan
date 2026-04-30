# ── build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN rm -f package-lock.json && npm install --legacy-peer-deps

COPY . .
ARG VITE_AUTH_MODE=local
ENV VITE_AUTH_MODE=$VITE_AUTH_MODE
RUN npm run build

# ── runtime stage ──────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
