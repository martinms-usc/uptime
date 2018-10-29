const _data = require('../data');
const { to, createRandomString } = require('../helpers');
const config = require('../config');
const protocols = ['http', 'https'];
const methods = ['post', 'get', 'put', 'delete'];
const { verifyToken } = require('./token');
const TOKEN_LENGTH = 20;
const checkHandlers = {};

// protocol,url,method,successCodes,timeoutSeconds
checkHandlers.post = async (data, done) => {
  let { protocol, url, method, successCodes, timeoutSeconds } = data.payload;
  protocol = typeof protocol == 'string' && protocols.includes(protocol) ? protocol : false;
  url = typeof url === 'string' && url.length > 0 ? url : false;
  method = typeof method === 'string' && methods.includes(method) ? method : false;
  successCodes = typeof successCodes === 'object' && successCodes instanceof Array && successCodes.length > 0 ? successCodes : false;
  timeoutSeconds = typeof timeoutSeconds === 'number' && Number.isInteger(timeoutSeconds) && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    let token = typeof data.headers.token === 'string' ? data.headers.token : false;
    // verify user with token
    let [err, tokenData] = await to(_data.read('tokens', token));
    if (err || !tokenData) return done([403]);

    let phone = tokenData.phone;
    let [e, userData] = await to(_data.read('users', phone));
    if (e || !userData) return done([403]);

    let userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : [];
    if (userChecks.length === config.maxChecks) return done([400, { Error: `User has already created the maximum number of checks (${config.maxChecks})` }]);
    
    let checkId = createRandomString(20);
    const checkObject = {
      id: checkId,
      phone,
      protocol,
      url,
      method,
      successCodes,
      timeoutSeconds
    };

    [err] = await to(_data.create('checks', checkId, checkObject));
    if (err) return done([500, { Error: 'Could not create the new check' }]);

    // add check id to user object
    userData.checks = userChecks;
    userData.checks.push(checkId);

    [err] = await to(_data.update('users', phone, userData));
    if (err) return done([500, { Error: 'Could not update user check' }]);

    return done([200, checkObject]);
  } else {
    return done([400, 'Missing required inputs or inputs are invalid']);
  }
};

// check id
checkHandlers.get = async (data, done) => {
  let { id } = data.queryString;
  // validate id
  id = typeof id == 'string' && id.trim().length === TOKEN_LENGTH ? id : false;

  // lookup user checks
  let [err, checkData] = await to(_data.read('checks', id));
  if (err || !checkData) return done([404]);

  // verify given token is valid and belongs to user that created it
  let tokenIsValid = verifyToken(id, checkData.phone);
  if (!tokenIsValid) return done([403]);

  done([200, checkData]);
};


checkHandlers.put = async (data, done) => {
  let { id, protocol, url, method, successCodes, timeoutSeconds } = data.payload;
  let { token } = data.headers;
  token = typeof token === 'string' ? data.headers.token : false; 
  protocol = typeof protocol == 'string' && protocols.includes(protocol) ? protocol : false;
  url = typeof url === 'string' && url.length > 0 ? url : false;
  method = typeof method === 'string' && methods.includes(method) ? method : false;
  successCodes = typeof successCodes === 'object' && successCodes instanceof Array && successCodes.length > 0 ? successCodes : false;
  timeoutSeconds = typeof timeoutSeconds === 'number' && Number.isInteger(timeoutSeconds) && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;

  if (!id) return done([400, { Error: 'Missing required field: id' }]);
  
  if (protocol || url || method || successCodes || timeoutSeconds) {
    let [err, checkData] = await to(_data.read('checks', id));
    if (err || !checkData) return done([400, { Error: 'Check ID did not exist' }]);
    
    // validate user token
    let tokenIsValid = verifyToken(token, checkData.phone);
    if (!tokenIsValid) return done([403]);

    checkData.protocol = protocol || checkData.protocol;
    checkData.url = url || checkData.url;
    checkData.method = method || checkData.method;
    checkData.successCodes = successCodes || checkData.successCodes;
    checkData.timeoutSeconds = timeoutSeconds || checkData.timeoutSeconds;

    // write updated user data
    [err] = await to(_data.update('checks', id, checkData));
    if (err) return done([500, { Error: 'Could not update check ' + id }]);

    return done([200]);
  } else {
    return done([400, { Error: 'Missing fields to update' }]);
  }
};


// required data: id
checkHandlers.delete = async (data, done) => {
  let { id } = data.queryString;
  let { token } = data.headers;
  id = typeof id == 'string' && id.trim().length === 20 ? id.trim() : false;
  token = typeof token === 'string' ? token : false;

  if (!id) done([400, { Error: 'Missing required field' }]);
  
  // get check
  let [err, checkData] = await to(_data.read('checks', id));
  if (err || !checkData) return done([400, { Error: 'Specified checkID does not exist' }]);

  // verify token
  let tokenIsValid = verifyToken(token, checkData.phone);
  if (!tokenIsValid) return done([403]);

  // delete check
  [err] = await to(_data.delete('checks', id));
  if (err) return done([500, { Error: 'Could not delete specified token' }]);

  // lookup user object
  let [userError, userData] = await to(_data.read('users', checkData.phone));
  if (userError || !userData) return done([404, { Error: 'Could not find user who created the check' }]);

  // remove check id
  let userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : {};
  let checkIndex = userChecks.indexOf(id);
  if (checkIndex < 0) return done([500, { Error: 'Could not find check on user object' }]);

  // update user
  userChecks.splice(checkIndex, 1);
  [userError] = await to(_data.update('users', userData.phone, userData));
  if (userError) return done([])

  done([200]);
};


module.exports = checkHandlers;