FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.19 --activate

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM node:22-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production

COPY package.json yarn.lock ./
RUN corepack enable && corepack prepare yarn@1.22.19 --activate && yarn install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config

EXPOSE 5050

CMD ["node", "dist/main.js"]