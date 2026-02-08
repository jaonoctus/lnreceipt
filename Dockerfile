# Stage 1: Build
FROM node:lts-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build Nuxt app (generates single HTML file)
RUN npm run generate

# Stage 2: Production
FROM nginx:stable-alpine
COPY --from=build /app/.output/public /usr/share/nginx/html

# Add nginx config for SPA (fallback to index.html)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
