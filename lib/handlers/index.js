const userHandlers = require('./user');
const tokenHandlers = require('./token');
const checkHandlers = require('./checks');
const staticHandlers = require('./static');
const { handleAllMethods, handleGetRequest } = require('./../helpers');
const handlers = {};

for (let handlerName in staticHandlers) {
  Object.assign(handlers, { [handlerName]: handleGetRequest(staticHandlers[handlerName]) });
}

handlers.users = handleAllMethods(userHandlers);

handlers.tokens = handleAllMethods(tokenHandlers);

handlers.checks = handleAllMethods(checkHandlers);

handlers.notFound = () => Promise.resolve([404, { error: 'route' }]);

handlers.ping = () => Promise.resolve([200]);

module.exports = handlers;