const crypto = require("crypto");
const querystring = require("querystring");
const https = require("https");
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

  // let [error, req] = await this.to(requestPromise(requestDetails));
  
  let [error, req] = await helpers.to(_requestPromise(requestParams, payload));
  const { statusCode } = req;
  
  if ([200, 201].includes(statusCode)) {
    resolve();
  } else {
    console.log(error);
    reject(statusCode);
  }
});


function _requestPromise (params, postData = '') {
  return new Promise((resolve, reject) => {
    const req = https.request(params, res => {
      // reject on bad status
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('statusCode=' + res.statusCode));
      }
      // cumulate data
      let body = [];
      res.on('data', chunk => body.push(chunk))
      // resolve on end
      res.on('end', () => {
        try {
          body = JSON.parse(Buffer.concat(body).toString());
        } catch(e) {
          reject(e);
        }
        resolve(body);
      });
    });
    // reject on request error
    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

module.exports = helpers;