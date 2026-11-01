FROM node:22-bookworm-slim

WORKDIR /app

# Linux node_modules live in the image (and a named volume); the Windows host copy is never used.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 3001
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3001"]
