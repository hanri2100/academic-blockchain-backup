FROM node:24-slim

# Set variabel CI agar pnpm tidak meminta konfirmasi interaktif
ENV CI=true

WORKDIR /app

# Install pnpm secara global
RUN npm install -g pnpm

# Copy package.json dan lockfile terlebih dahulu (untuk optimasi cache Docker)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy seluruh source code
COPY . .

# Build TypeScript ke JavaScript
RUN pnpm build

EXPOSE 9999
ENV CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999

CMD ["npm", "start"]