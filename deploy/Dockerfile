FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY server ./server
COPY src/lib ./src/lib

ENV NODE_ENV=production
ENV WS_HOST=0.0.0.0
ENV WS_PORT=1234
ENV DATABASE_PATH=/data/tandem.sqlite

RUN mkdir -p /data

EXPOSE 1234

CMD ["npx", "tsx", "server/index.ts"]
