const { getTemplate, to, addUniversalTemplate, getStaticAsset } = require('../helpers');
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

staticHandlers.favicon = async (data, resolve) => {
  // read in favicon data
  let [err, faviconData] = await to(getStaticAsset('favicon.ico'));
  if (err || !data) return resolve([500]);

  return resolve([200, faviconData, 'favicon']);
};

staticHandlers.public = async (data, resolve) => {
  // get file name requested

  const trimmedAssetName = data.trimmedPath.replace('public/', '');
  if (!trimmedAssetName.length > 0) return resolve([404]);

  let [err, asset] = await to(getStaticAsset(trimmedAssetName));

  if (err || !asset) return resolve([404]);

  // determine content type
  let contentType = 'plain';
  if (trimmedAssetName.indexOf('.css') > -1) contentType = 'css';
  if (trimmedAssetName.indexOf('.png') > -1) contentType = 'png';
  if (trimmedAssetName.indexOf('.jpeg') > -1) contentType = 'jpeg';
  if (trimmedAssetName.indexOf('.ico') > -1) contentType = 'favicon';

  
  return resolve([200, asset, contentType]);
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