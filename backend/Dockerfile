FROM node:18-bullseye-slim

# Cài đặt build tools cần thiết để build native better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Cài đặt các package (bỏ qua devDependencies)
RUN npm ci --only=production

COPY . .

# Tạo sẵn thư mục chứa DB SQLite và uploads
RUN mkdir -p data uploads

EXPOSE 5001

CMD ["npm", "start"]
