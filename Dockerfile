FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx tailwindcss -i ./public/input.css -o ./public/output.css --minify

EXPOSE ${PORT}

CMD ["node", "index.js"]
