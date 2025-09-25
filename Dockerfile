# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:24-alpine AS builder
WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:24-alpine AS runner
WORKDIR /app

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled app
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

# App listens on PORT
EXPOSE 3000

CMD ["node", "dist/main.js"]


