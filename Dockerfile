# Multi-stage build for Next.js Frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments - Must be set at build time for Next.js to bake into JS bundle
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_GATEWAY_URL
ARG NEXT_PUBLIC_USE_GATEWAY=true
ARG NEXT_PUBLIC_BLOCKCHAIN_RPC_URL
ARG AI_API_URL

# Set environment variables for build
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_PUBLIC_USE_GATEWAY=$NEXT_PUBLIC_USE_GATEWAY
ENV NEXT_PUBLIC_BLOCKCHAIN_RPC_URL=$NEXT_PUBLIC_BLOCKCHAIN_RPC_URL

# Debug: Print env vars during build
RUN echo "Building with NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL"
RUN echo "Building with NEXT_PUBLIC_BLOCKCHAIN_RPC_URL=$NEXT_PUBLIC_BLOCKCHAIN_RPC_URL"

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G nodejs nextjs

# Copy package files
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Set correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["npm", "start"]