const crypto = require("crypto");
const config = require("./config");
const helpers = {};

// sha256 hash for passwords
helpers.hash = str => {
  if (typeof str == 'string' && str.length) {
    return crypto.createHmac('sha256', config.hashSecret).update(str).digest('hex');
  } 
  return false;
};

// parse JSON to object in all cases without throwing
helpers.parseJsonToObject = str => {
  try {
    let obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  };
}

// eliminates need for try/catch with async/await
// to(Promise) will return [err, data] instead of throwing errors
helpers.to = promise => {
  return promise.then(data => {
    return [null, data];
 })
 .catch(err => [err]);
};

module.exports = helpers;