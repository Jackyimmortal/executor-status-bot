FROM node:24-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Run migrations
RUN npm run migrate

ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/index.js"]
