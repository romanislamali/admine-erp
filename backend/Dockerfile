FROM node:22-alpine

RUN apk --no-cache add postgresql-client

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]