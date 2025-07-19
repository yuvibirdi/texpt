# Multi-stage build for lighter final image
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Development stage (for hot reload)
FROM node:18-alpine AS development

RUN apk add --no-cache \
    bash \
    xvfb \
    gtk+3.0 \
    nss \
    texlive \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-xetex \
    poppler-utils \
    && rm -rf /var/cache/apk/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

ENV DISPLAY=:99
EXPOSE 3000 3001

# Production stage
FROM node:18-alpine AS production

# Install minimal runtime dependencies
RUN apk add --no-cache \
    bash \
    dumb-init \
    # Minimal X11 for Electron
    xvfb \
    gtk+3.0 \
    nss \
    # LaTeX essentials for presentations
    texlive \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-xetex \
    # PDF utilities
    poppler-utils \
    && rm -rf /var/cache/apk/* \
    # Clean up TeX installation to save space
    && find /usr/share/texlive -name "doc" -type d -exec rm -rf {} + 2>/dev/null || true \
    && find /usr/share/texlive -name "*.pdf" -delete 2>/dev/null || true \
    && find /usr/share/texlive -name "*.dvi" -delete 2>/dev/null || true

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/build ./build
COPY --from=builder /app/electron ./electron
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S electron -u 1001 -G nodejs

# Create optimized startup script
RUN cat > /app/start.sh << 'EOF'
#!/bin/bash
set -e

# Function to check if LaTeX is working
check_latex() {
    echo "Checking LaTeX installation..."
    if command -v pdflatex >/dev/null 2>&1; then
        echo "✓ pdflatex found"
        pdflatex --version | head -1
    else
        echo "✗ pdflatex not found"
        exit 1
    fi
    
    if command -v xelatex >/dev/null 2>&1; then
        echo "✓ xelatex found"
    else
        echo "✗ xelatex not found"
    fi
}

# Start virtual display for Electron
echo "Starting virtual display..."
Xvfb :99 -screen 0 1024x768x24 -ac > /dev/null 2>&1 &
XVFB_PID=$!

# Wait for X server
sleep 2

# Check LaTeX installation
check_latex

# Cleanup function
cleanup() {
    echo "Shutting down..."
    kill $XVFB_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGTERM SIGINT

echo "Starting application..."
exec "$@"
EOF

RUN chmod +x /app/start.sh

# Set environment variables
ENV DISPLAY=:99
ENV NODE_ENV=production
ENV ELECTRON_DISABLE_SECURITY_WARNINGS=true

# Change ownership
RUN chown -R electron:nodejs /app

# Switch to non-root user
USER electron

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD pdflatex --version > /dev/null || exit 1

EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/app/start.sh", "npm", "start"]