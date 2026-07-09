
FROM node:20

WORKDIR /app

RUN apt-get update && \
    apt-get install -y ffmpeg imagemagick webp git curl && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]
