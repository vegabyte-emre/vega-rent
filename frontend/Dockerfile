# Frontend Dockerfile
FROM node:18-alpine as build

WORKDIR /app

# Increase Node memory limit
ENV NODE_OPTIONS=--max_old_space_size=4096

# Copy package files
COPY package.json yarn.lock* ./

# Install ALL dependencies (including devDependencies for build)
RUN yarn install --frozen-lockfile || yarn install

# Copy all source files
COPY . .

# Build the app
RUN yarn build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Create nginx config inline
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
