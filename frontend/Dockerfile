# ──────────────────────────────────────────────────────────────────────────────
#  Frontend — Dockerfile
#  Multi-stage: builder (Node + Vite) → runtime (Nginx Alpine)
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build del bundle estático ───────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifiestos
COPY package.json package-lock.json* ./

# Instalar TODAS las dependencias (incluyendo devDeps necesarias para el build)
RUN npm ci --ignore-scripts

# Copiar código fuente
COPY . .

# VITE_API_URL se inyecta como build arg para que Vite lo empaquete en el bundle
# En Dokploy se define como build argument:
#   VITE_API_URL=https://api.tudominio.com/api
ARG VITE_API_URL=http://localhost:5001/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Stage 2: Servir con Nginx Alpine ─────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remover config default de nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuración optimizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar bundle generado por Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx escucha en 80 (Dokploy pone el proxy reverso delante)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
