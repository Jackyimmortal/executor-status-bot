FROM node:24-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/index.js"]
