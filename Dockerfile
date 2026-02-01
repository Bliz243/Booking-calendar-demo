# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++ nodejs

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Install runtime dependencies for better-sqlite3 and Node.js for running the build
RUN apk add --no-cache libstdc++ nodejs

# Copy built application and dependencies
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy schema.sql for database initialization (read at runtime)
COPY --from=builder /app/src/lib/server/db/schema.sql ./build/server/schema.sql

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/calendar.db

EXPOSE 3000

# Run with Node.js (SvelteKit adapter-node output)
CMD ["node", "build"]
