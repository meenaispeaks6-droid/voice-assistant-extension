FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose the port (Hugging Face Spaces uses PORT env var)
EXPOSE 7860

# Start the server
CMD ["node", "server.js"]
