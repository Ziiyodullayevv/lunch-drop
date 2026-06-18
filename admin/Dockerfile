FROM node:22-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_SERVER_URL

ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

COPY package.json yarn.lock ./
RUN corepack enable
RUN yarn install --frozen-lockfile

COPY . .
RUN NODE_OPTIONS=--max-old-space-size=6144 yarn build

FROM node:22-alpine AS runner

WORKDIR /app

ARG NEXT_PUBLIC_SERVER_URL

ENV NODE_ENV=production
ENV PORT=8082
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN corepack enable

EXPOSE 8082

CMD ["yarn", "start"]
