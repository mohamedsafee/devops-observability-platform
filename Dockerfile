FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY app.js tracing.js ./

EXPOSE 3000

CMD ["npm", "start"]