FROM oven/bun:alpine

WORKDIR /app

COPY proxy.ts package.json ./

EXPOSE 3001

CMD ["bun", "run", "proxy.ts"]
