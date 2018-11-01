const crypto = require("crypto");
const querystring = require("querystring");
const https = require("https");
const config = require("./config");
const path = require("path");
const { readFile } = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(readFile);
const helpers = {};

// return a function handler
helpers.handleAllMethods = handler => data => new Promise(resolve => {
  const acceptedMethods = ['post', 'get', 'put', 'delete'];
  if (acceptedMethods.includes(data.method)) {
    handler[data.method](data, resolve);
  } else {
    resolve([405]);
  }
});

helpers.handleGetRequest = handler => data => new Promise(async resolve => {
  if (data.method = 'get') {
    handler(data, resolve);
  } else {
    return resolve([405, undefined, 'html']);
  }
});


// get string content of template
helpers.getTemplate = (templateName, data) => new Promise(async(res, rej) => {
  templateName = typeof templateName == 'string' && templateName.length > 0 ? templateName : false;
  data = typeof data == 'object' && data !== null ? data : {};
  
  if (!templateName) return rej(new Error('Template not found'));
  let templates = path.join(__dirname, '/../templates/');

  let [err, string] = await helpers.to(readFileAsync(`${templates}/${templateName}.html`, 'utf8'));
  if (err || !string || string.lengt == 0) return rej('No template could be found');

  return res(string);
});

// add universal header and footer to string, pass provided data to header & footer
helpers.addUniversalTemplate = (string, data) => new Promise(async(resolve, reject) => {
  string = typeof string == 'string' && string.length > 0 ? string: '';
  data = typeof data == 'object' && data !== null ? data : {};
  let err, header, footer;

  [err, header] = await helpers.to(helpers.getTemplate('_header', data));
  if (err || !header) return reject('Could not find header template');

  [err, footer] = await helpers.to(helpers.getTemplate('_footer', data));
  if (err || !footer) return reject('Could not find header template');

  let fullTemplate = header + string + footer;
  fullTemplate = helpers.interpolate(fullTemplate, data);
  return resolve(fullTemplate);
});

// take given string and data object and replace keys
helpers.interpolate = (string, data) => {
  string = typeof string == 'string' && string.length > 0 ? string: '';
  data = typeof data == 'object' && data !== null ? data : {};

  // add template globals
  for (let key in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(key)) {
      data[`global.${key}`] = config.templateGlobals[key];
    }
  }

  // for each key in data object, insert into string at placeholder
  for (let key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] == 'string') {
      string = string.replace(`{${key}}`, data[key]);
    }
  }
  return string;
};

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
    let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz', str = '';
    while (str.length < stringLength) {
      str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
    } 
    return str;
  } else {
    return false;
  }
};


// use twilio api to send sms messages
helpers.sendTwilioSMS = (phone, message) => new Promise(async (resolve, reject) => {
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone : false;
  message = typeof message == 'string' && message.trim().length > 0 && message.trim().length < 1600 ? message.trim() : false;
  if (!phone || !message) reject(new Error('Given message parameters were missing or invalid'));

  // configure request payload
  let payload = {
    From: config.twilio.fromPhone,
    To: `+1${phone}`,
    Body: message
  };
  // use qs due to api content-type
  payload = querystring.stringify(payload);

  // construct request
  const requestParams = {
    protocol: 'https:',
    hostname: 'api.twilio.com',
    method: 'POST',
    path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
    auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(requestParams, res => {
    const { statusCode } = res;
    // reject on bad status
    if ([200,201].includes(statusCode)) {
      return resolve();
    } else {
      return reject(new Error(statusCode));
    }
  });

  // reject on request error, write payload, send request
  req.on('error', err => reject(err));
  req.write(payload);
  req.end();
});


module.exports = helpers;