FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build client
COPY client ./client
WORKDIR /app/client
RUN npm ci && npm run build

# Copy everything and prepare server
WORKDIR /app
COPY server ./server

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
