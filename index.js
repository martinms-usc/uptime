const http = require("http");
const https = require("https");
const url = require("url");
const fs = require("fs");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const PORT = config.httpPort;
const HTTPS_PORT = config.httpsPort;
const _data = require('./lib/data');

// instantiate http server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});
// start http server
httpServer.listen(PORT, () => {
  console.log(`[${config.envName.toUpperCase()}] server is listening on port: ${PORT}`);
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
  console.log(`[${config.envName.toUpperCase()}] server is listening on port: ${HTTPS_PORT}`);
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
  let payload = '';

  req.on('data', data => {
    payload += decoder.write(data);
  });
  
  req.on('end', () => {
    payload += decoder.end();

    // choose handler
    let handler = typeof router[trimmedPath] !== 'undefined' ? router[trimmedPath] : handlers.notFound;
    let data = {
      trimmedPath,
      queryString,
      headers,
      payload
    };

    // route request
    handler(data, (statusCode = 200, payload = {}) => {
      let payloadString = JSON.stringify(payload);
      res.setHeader('Content-Type', 'application/json' );
      res.writeHead(statusCode);
      res.end(payloadString);
    
      console.log('request returned with ', statusCode, payloadString);
    });
  });
};


// handlers
const handlers = {}

handlers.notFound = (data, callback) => {
  callback(404, { error: 'route' });
};

handlers.ping = (data, callback) => {
  callback(200);
};

// router
const router = {
  ping: handlers.ping
};
