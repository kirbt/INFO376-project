# FROM node:20-alpine
FROM node:20

# RUN apk add --no-cache python3 py3-pip py3-virtualenv
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# add virtual env
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# RUN pip install --no-cache-dir textblob --break-system-packages
RUN pip install --no-cache-dir textblob sentence-transformers
RUN python3 -m textblob.download_corpora

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["node", "index.js"]