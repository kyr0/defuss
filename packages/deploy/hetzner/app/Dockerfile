FROM node:lts

RUN apt-get update \
    && apt-get install -y --no-install-recommends libcap2-bin \
    && rm -rf /var/lib/apt/lists/* \
    && setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

WORKDIR /app
COPY package.json server.js ./
RUN chown -R node:node /app
USER node

EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "const https=require('https');const req=https.request({host:'127.0.0.1',port:443,path:'/healthz',rejectUnauthorized:false},res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.end();"
CMD ["node", "server.js"]
