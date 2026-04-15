# Build stage
FROM node:20-alpine

WORKDIR /app

# Ensure we have the necessary tools for some node builds
RUN apk add --no-cache libc6-compat

COPY package*.json ./
# Remove host lockfile to ensure container-specific native bindings are fetched
RUN rm -f package-lock.json && npm install --legacy-peer-deps

COPY . .

# Vite default port is 5173
EXPOSE 5173

CMD ["npm", "run", "dev"]
