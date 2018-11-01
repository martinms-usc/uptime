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
const { debuglog }      = require("util");
const debug             = debuglog("server");

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
    let [statusCode = 200, payload = {}, contentType = 'json'] = await handler(data);
    let payloadString = '';
    
    // return  content-specific parts
    if (contentType == 'json') {
      payloadString = JSON.stringify(payload);
      res.setHeader('Content-Type', 'application/json');
    }
    if (contentType == 'html') {
      payloadString = typeof payload === 'string' ? payload : '';
      res.setHeader('Content-Type', 'text/html');
    }

    // return response parts shared across content types
    res.writeHead(statusCode);
    res.end(payloadString);

    // if response is 200 print green
    if (statusCode === 200) {
      debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
    } else {
      debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode} ${payload.error || ''}`);
    }
  });
};

// router
server.router = {
  '': handlers.index,
  'account/create': handlers.accountCreate, 
  'account/edit': handlers.accountEdit,
  'account/deleted': handlers.accountDeleted,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'checks/all': handlers.checksList,
  'checks/create': handlers.checksCreate,
  'checks/edit': handlers.checksEdit,
  'ping': handlers.ping,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks
};

server.init = function() {
  // start http server
  server.httpServer.listen(PORT, () => {
    console.log('\x1b[36m%s\x1b[0m', `[${config.envName.toUpperCase()}] http  server is listening on port: ${PORT}`);
  });

  // start https server
  server.httpsServer.listen(HTTPS_PORT, () => {
    console.log('\x1b[35m%s\x1b[0m', `[${config.envName.toUpperCase()}] https server is listening on port: ${HTTPS_PORT}`);
  });
};

module.exports = server;
