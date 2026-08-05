# Build context is the monorepo root (iot_app/) because this is an npm workspace.
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY backend/prisma ./backend/prisma
RUN npm ci --workspace=backend

COPY backend ./backend
RUN npm run build --workspace=backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend ./backend

EXPOSE 3001
CMD sh -c "npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/main.js"
