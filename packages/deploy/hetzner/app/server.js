'use strict';

const cluster = require('cluster');
const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');

const cpuCount = Math.max(1, os.availableParallelism ? os.availableParallelism() : os.cpus().length);
const httpPort = Number(process.env.APP_HTTP_PORT || 80);
const httpsPort = Number(process.env.APP_HTTPS_PORT || 443);
const certPath = process.env.TLS_CERT_PATH;
const keyPath = process.env.TLS_KEY_PATH;
const forceHttpsRedirect = (process.env.FORCE_HTTPS_REDIRECT || 'true').toLowerCase() === 'true';
const hostname = os.hostname();

function requestHandler(req, res) {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', pid: process.pid, hostname }));
    return;
  }

  if (!req.socket.encrypted && forceHttpsRedirect) {
    const host = req.headers.host || 'localhost';
    res.writeHead(301, { location: `https://${host}${req.url}` });
    res.end();
    return;
  }

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    message: 'edge-webapp is running',
    workerPid: process.pid,
    hostname,
    now: new Date().toISOString()
  }));
}

if (cluster.isPrimary) {
  for (let i = 0; i < cpuCount; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', () => {
    cluster.fork();
  });
} else {
  if (!certPath || !keyPath) {
    throw new Error('TLS_CERT_PATH and TLS_KEY_PATH are required');
  }

  const tlsOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
    minVersion: 'TLSv1.2'
  };

  http.createServer(requestHandler).listen(httpPort, '0.0.0.0');
  https.createServer(tlsOptions, requestHandler).listen(httpsPort, '0.0.0.0');
}
