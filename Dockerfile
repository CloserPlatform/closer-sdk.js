FROM node:14.8.0-alpine3.11

WORKDIR /workdir

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY tslint.json .
COPY tsconfig.json .
COPY tsconfig.sdk.json .
COPY webpack.config.js .
COPY src src

RUN npm run build

# web demo app
COPY web-demo-app web-demo-app
WORKDIR /workdir/web-demo-app
RUN npm i
RUN npm run build

CMD npm run start