# Stage 1: Build with Bun on Alpine
FROM oven/bun:alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Stage 2: Serve static files with BusyBox httpd
FROM busybox:stable

WORKDIR /var/www

COPY --from=build /app/dist .

EXPOSE 80

CMD ["busybox", "httpd", "-f", "-v", "-p", "80"]
