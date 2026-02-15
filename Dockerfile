FROM node:20-alpine AS build
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server.js .
RUN npm install express
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["node", "server.js"]
