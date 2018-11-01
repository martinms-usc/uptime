const { getTemplate, to, addUniversalTemplate } = require('../helpers');
const staticHandlers = {};

staticHandlers.index = async (data, resolve) => {
  let templateData = {
    'head.title': 'This is the title',
    'head.description': 'Description',
    'body.title': 'Hello template world',
    'body.class': 'index'
  };

  let [err, body] = await to(getTemplate('index', templateData));
  if (err || !body) return resolve([500]);

  let [e, hydratedTemplate] = await to(addUniversalTemplate(body, templateData));
  if (e || !hydratedTemplate) return rej([500, undefined, 'html']);

  return resolve([200, hydratedTemplate, 'html']);
};

// staticHandlers.accountCreate 
// staticHandlers.accountEdit
// staticHandlers.accountDeleted
// staticHandlers.sessionCreate
// staticHandlers.sessionDeleted
// staticHandlers.checksList
// staticHandlers.checksCreate
// staticHandlers.checksEdit

module.exports = staticHandlers;