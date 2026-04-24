FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN rm -f package-lock.json && npm install --legacy-peer-deps

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
