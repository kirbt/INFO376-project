FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install large dependencies individually to help Docker commit layers
RUN pip install --no-cache-dir numpy
RUN pip install --no-cache-dir pandas
RUN pip install --no-cache-dir scikit-learn

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["node", "index.js"]
