FROM node:20-alpine

RUN apk add --no-cache python3 py3-pip py3-virtualenv

RUN pip install --no-cache-dir textblob --break-system-packages
RUN python3 -m textblob.download_corpora

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["node", "index.js"]