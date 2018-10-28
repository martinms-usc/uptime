const server = require('./lib/server');
const workers = require('./lib/workers');

// declare app
const app = {};

// init 
app.init = function() {
  // start server
  server.init();
  // start workers
  workers.init();
};

// execute
app.init();

// export app
module.exports = app;