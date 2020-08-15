FROM node:14.8.0-alpine3.11

WORKDIR /build

COPY package.json .
COPY package-lock.json .
COPY .npmrc .

RUN npm ci

COPY tslint.json .
COPY tsconfig.json .
COPY tsconfig.sdk.json .
COPY tsconfig.demoapp.json .
COPY webpack.config.js .
COPY webpack.demo-app.config.js .

COPY src src
COPY src-demo-app src-demo-app

RUN npm run build
RUN npm run build-demo-app