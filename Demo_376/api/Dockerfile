FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# For Worker, CMD would be 'node index.js', for API 'node index.js'
CMD ["node", "index.js"]