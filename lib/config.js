const { accountSid, authToken, fromPhone } = require('./privateConfig');
const environments = {};

// 80, 443
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashSecret: 'testSecret2134235423',
  maxChecks: 5,
  twilio: {	
    accountSid : 'ACb32d411ad7fe886aac54c665d25e5c5d',	
    authToken : '9455e3eb3109edc12e3d8c92768f7a67',	
    fromPhone : '+15005550006'	
  }
};

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashSecret: 'productionSecret25049823',
  maxChecks: 5,
  twilio: {	
    accountSid,	
    authToken,	
    fromPhone	
  }
};

const currentEnv = typeof process.env.NODE_ENV == 'string' ? process.env.NODE_ENV.toLowerCase() : '';
const env = typeof environments[currentEnv] == 'object' ? environments[currentEnv] : environments.staging;

module.exports = env;