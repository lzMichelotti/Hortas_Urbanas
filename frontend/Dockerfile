# Etapa 1: builda o React. A URL da API entra no build (Vite embute no JS).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Etapa 2: imagem final = Caddy + arquivos estáticos. Node não vai pra produção.
FROM caddy:2-alpine
COPY --from=build /app/dist /srv/app
