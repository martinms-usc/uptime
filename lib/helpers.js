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
  return promise.then(data => [null, data]).catch(err => [err]);
};

// create string of random alphanumeric characters of given length
helpers.createRandomString = stringLength => {
  stringLength = typeof stringLength === 'number' && stringLength > 0 ? stringLength : false;

  if (stringLength) {
    let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz';
    let str = '';

    while (str.length < stringLength) {
      str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
    } 
    
    return str;
  } else {
    return false;
  }
};

module.exports = helpers;