const userHandlers = require('./user');
const tokenHandlers = require('./token');
const checkHandlers = require('./checks');

const handlers = {};

handlers.users = data => new Promise(resolve => {
  const acceptedMethods = ['post', 'get', 'put', 'delete'];
  if (acceptedMethods.indexOf(data.method) > -1) {
    userHandlers[data.method](data, resolve);
  } else {
    resolve([405]);
  }
});

handlers.tokens = data => new Promise(resolve => {
  const acceptedMethods = ['post', 'get', 'put', 'delete'];
  if (acceptedMethods.indexOf(data.method) > -1) {
    tokenHandlers[data.method](data, resolve);
  } else {
    resolve([405]);
  }
});

handlers.checks = data => new Promise(resolve => {
  const acceptedMethods = ['post', 'get', 'put', 'delete'];
  if (acceptedMethods.indexOf(data.method) > -1) {
    checkHandlers[data.method](data, resolve);
  } else {
    resolve([405]);
  }
});

handlers.notFound = () => Promise.resolve([404, { error: 'route' }]);

handlers.ping = () => Promise.resolve([200]);

module.exports = handlers;