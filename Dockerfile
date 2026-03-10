# Stage Music App - Docker Configuration for Cloud Run

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app files
COPY server.js ./
COPY public ./public
COPY stage_music.db ./

# Expose port
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Start app
CMD ["node", "server.js"]
