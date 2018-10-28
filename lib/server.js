const http              = require("http");
const https             = require("https");
const url               = require("url");
const fs                = require("fs");
const path              = require("path");
const StringDecoder     = require("string_decoder").StringDecoder;
const config            = require("./config");
const handlers          = require("./handlers");
const helpers           = require("./helpers");
const PORT              = config.httpPort;
const HTTPS_PORT        = config.httpsPort;

// server module object
const server = {};

// instantiate http server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// instantiate https server
server.httpsServerOpts = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOpts, (req, res) => {
  server.unifiedServer(req, res);
});


server.unifiedServer = function (req, res) {
  let parsedUrl = url.parse(req.url, true);
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g, '');
  let queryString = parsedUrl.query;
  let method = req.method.toLowerCase();
  let headers = req.headers;

  // payload
  let decoder = new StringDecoder('utf-8');
  let payloadBuffer = '';

  req.on('data', data => {
    payloadBuffer += decoder.write(data);
  });
  
  req.on('end', async () => {
    payloadBuffer += decoder.end();

    // choose handler
    let handler = typeof server.router[trimmedPath] !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;
    let data = {
      trimmedPath,
      queryString,
      headers,
      method,
      payload: helpers.parseJsonToObject(payloadBuffer)
    };

    // route request
    let [statusCode = 200, payload = {}] = await handler(data);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(JSON.stringify(payload));

    console.log('request returned with', statusCode, payload);
  });
};

// router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
};

server.init = function() {
  // start http server
  server.httpServer.listen(PORT, () => {
    console.log(`[${config.envName.toUpperCase()}] http  server is listening on port: ${PORT}`);
  });

  // start https server
  server.httpsServer.listen(HTTPS_PORT, () => {
    console.log(`[${config.envName.toUpperCase()}] https server is listening on port: ${HTTPS_PORT}`);
  });
};

module.exports = server;
