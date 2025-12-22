# Frontend Dockerfile - Pre-built static files
FROM nginx:alpine

# Copy pre-built files directly
COPY build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
