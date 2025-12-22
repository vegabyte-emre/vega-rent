# Frontend Dockerfile
FROM node:18-alpine as build

WORKDIR /app

# Increase Node memory limit
ENV NODE_OPTIONS=--max_old_space_size=4096
ENV CI=false
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true

# Copy package.json
COPY package.json ./

# Install ALL dependencies
ENV NODE_ENV=development
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Build using npx craco directly
RUN npx craco build

# Production stage - serve with nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
