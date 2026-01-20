FROM node:latest

RUN apt-get update && apt-get install -y git

WORKDIR /app

# Only copy manifests first for better caching
COPY package.json ./

# Install (tsx is needed at runtime since we're running TS directly)
RUN npm install

COPY ./src ./src

ENV NODE_ENV=production
EXPOSE 3001 3002 3003 3004 3005 3006 3007 3008

CMD ["npm", "run", "start"]
