const environments = {};

// 80, 443
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashSecret: 'testSecret2134235423'
};

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashSecret: 'productionSecret25049823'
};

const currentEnv = typeof process.env.NODE_ENV == 'string' ? process.env.NODE_ENV.toLowerCase() : '';
const env = typeof environments[currentEnv] == 'object' ? environments[currentEnv] : environments.staging;

module.exports = env;