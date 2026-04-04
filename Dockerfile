FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm i
RUN npx tsc -b
CMD ["node", "dist/user-service/src/server.js"]