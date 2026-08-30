FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.server.json ./
COPY server ./server
RUN npx tsc --project tsconfig.server.json

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts=false \
  && npm cache clean --force

COPY --from=build /app/server-dist ./server-dist

USER node
EXPOSE 3001

CMD ["node", "server-dist/index.js"]
