# Stage 1: Build Angular static bundle
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration=production

# Stage 2: Serve using Nginx
FROM nginx:alpine
COPY --from=build /app/dist/floworchestra-frontend /usr/share/nginx/html
# Custom nginx config to handle Angular routing redirects
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
