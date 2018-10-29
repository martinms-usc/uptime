const userHandlers = require('./user');
const tokenHandlers = require('./token');
const checkHandlers = require('./checks');
const { handleAllMethods } = require('./../helpers');
const handlers = {};

handlers.users = handleAllMethods(userHandlers);

handlers.tokens = handleAllMethods(tokenHandlers);

handlers.checks = handleAllMethods(checkHandlers);

handlers.notFound = () => Promise.resolve([404, { error: 'route' }]);

handlers.ping = () => Promise.resolve([200]);

module.exports = handlers;