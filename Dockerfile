FROM node:12.20.0-alpine3.12

WORKDIR /src

COPY . .

RUN npm install

EXPOSE 9090

CMD ["node", "index.js"]