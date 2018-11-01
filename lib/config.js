const { accountSid, authToken, fromPhone } = require('./privateConfig');
const environments = {};
const http_port = 3000;
const https_port = 5000;

// 80, 443
environments.staging = {
  httpPort: http_port,
  httpsPort: 3001,
  envName: 'staging',
  hashSecret: 'testSecret2134235423',
  maxChecks: 5,
  checkInterval: 1000 * 60,
  twilio: {	
    accountSid : 'ACb32d411ad7fe886aac54c665d25e5c5d',	
    authToken : '9455e3eb3109edc12e3d8c92768f7a67',	
    fromPhone : '+15005550006'
  }, 
  templateGlobals: {
    appName: 'Uptime Checker', 
    companyName: 'Michael Martin',
    yearCreated: '2018',
    baseUrl: `http://localhost:${http_port}`
  }
};

environments.production = {
  httpPort: https_port,
  httpsPort: 5001,
  envName: 'production',
  hashSecret: 'productionSecret25049823',
  maxChecks: 5,
  checkInterval: 1000 * 60,
  twilio: {	
    accountSid,	
    authToken,	
    fromPhone	
  },
  templateGlobals: {
    appName: 'Uptime Checker', 
    companyName: 'Michael Martin',
    yearCreated: '2018',
    baseUrl: `http://localhost:${https_port}`
  }
};

const currentEnv = typeof process.env.NODE_ENV == 'string' ? process.env.NODE_ENV.toLowerCase() : '';
const env = typeof environments[currentEnv] == 'object' ? environments[currentEnv] : environments.staging;

module.exports = env;