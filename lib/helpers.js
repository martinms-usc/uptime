const crypto = require("crypto");
const config = require("./config");
const helpers = {};

helpers.hash = function(str) {
  if (typeof str == 'string' && str.length) {
    return crypto.createHmac('sha256', config.hashSecret).update(str).digest('hex');
  } 
  return false;
};

// parse JSON to object in all cases without throwing
helpers.parseJsonToObject = function(str) {
  try {
    let obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  };
}

module.exports = helpers;