FROM node:22-alpine AS production

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json

RUN npm ci --omit=dev --workspace server

COPY server/src ./server/src

ENV NODE_ENV=production

WORKDIR /app/server

USER node

EXPOSE 5000

CMD ["node", "src/server.js"]