# ./consumer/Dockerfile
FROM node:latest

WORKDIR /usr/src/app

# Copy both package*.json files and your source code to the working directory
COPY package*.json ./
COPY . .

# Install dependencies
RUN npm install

# Compile TypeScript to JavaScript using npx
RUN npx tsc

CMD ["node", "dist/index.js"]
