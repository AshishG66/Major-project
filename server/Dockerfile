FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Generate Prisma Client and build TypeScript bundle
RUN npx prisma generate
RUN npm run build

EXPOSE 5000

ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
