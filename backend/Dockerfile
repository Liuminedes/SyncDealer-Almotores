# ──────────────────────────────────────────────────────────────────────────────
#  Backend — Dockerfile
#  Multi-stage: deps → build/prune → runtime
#  Node 22 LTS Alpine (imagen mínima para producción)
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Instalar dependencias de producción ──────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Copiar manifiestos primero (aprovecha caché de capas de Docker)
COPY package.json package-lock.json* ./

# Solo dependencias de producción
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Instalar dumb-init para manejo correcto de señales en PID 1
RUN apk add --no-cache dumb-init

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodejs -u 1001

WORKDIR /app

# Copiar node_modules ya instalados del stage anterior
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar código fuente (excluye lo del .dockerignore)
COPY --chown=nodejs:nodejs . .

# Usar usuario no-root
USER nodejs

# Puerto que expone el backend
EXPOSE 5001

# dumb-init como PID 1: maneja señales SIGTERM/SIGINT correctamente
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
