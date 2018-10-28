const http              = require("http");
const https             = require("https");
const url               = require("url");
const fs                = require("fs");
const StringDecoder     = require("string_decoder").StringDecoder;
const config            = require("./lib/config");
const handlers          = require("./lib/handlers");
const helpers           = require("./lib/helpers");
const PORT              = config.httpPort;
const HTTPS_PORT        = config.httpsPort;

// instantiate http server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});
// start http server
httpServer.listen(PORT, () => {
  console.log(`[${config.envName.toUpperCase()}] http  server is listening on port: ${PORT}`);
});

// instantiate https server
const httpsServerOpts = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOpts, (req, res) => {
  unifiedServer(req, res);
});
// start https server
httpsServer.listen(HTTPS_PORT, () => {
  console.log(`[${config.envName.toUpperCase()}] https server is listening on port: ${HTTPS_PORT}`);
});


const unifiedServer = function (req, res) {
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
    let handler = typeof router[trimmedPath] !== 'undefined' ? router[trimmedPath] : handlers.notFound;
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
const router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
};
