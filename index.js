const http = require("http");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;

const PORT = 3001;

const server = http.createServer((req, res) => {
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
      // send the response
      res.writeHead(statusCode);
      res.end(payloadString);
    
      // log request
      console.log('request returned with ', statusCode, payloadString);
    });
  });
});


server.listen(PORT, () => {
  console.log(`the server is listening on port ${PORT}`);
});


// handlers
const handlers = {}

handlers.sample = (data, callback) => {
  callback(201, { name: 'sample handler' });
};

handlers.notFound = (data, callback) => {
  callback(404);
};

// router
const router = {
  sample: handlers.sample
};
