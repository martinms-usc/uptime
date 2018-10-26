const _data = require('./data');
const { to, hash, createRandomString } = require('./helpers');
const TOKEN_LENGTH = 20;
const handlers = {};

// User actions
handlers.users = data => new Promise(resolve => {
  const acceptedMethods = ['post', 'get', 'put', 'delete'];
  if (acceptedMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, resolve);
  } else {
    resolve([405]);
  }
});

// Authentication
handlers.tokens = data => new Promise(resolve => {
  const acceptedMethods = ['post', 'get', 'put', 'delete'];
  if (acceptedMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, resolve);
  } else {
    resolve([405]);
  }
});



// container for submethods
handlers._users = {};
handlers._tokens = {};


handlers._users.post = async (data, done) => {
  let { firstName, lastName, phone, password, tosAgreement } = data.payload;
  // check required fields
  firstName = typeof firstName == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
  lastName = typeof lastName == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone.trim() : false;
  password = typeof password == 'string' && password.trim().length > 5 ? password.trim() : false;
  tosAgreement = typeof tosAgreement == 'boolean' && tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // make sure user doesnt already exist
    let [err, userData] = await to(_data.read('users', phone));
    if (!err || userData) done([400, { Error: 'User with that phone number exists' }]); 

    let hashedPassword = hash(password);
    let userObject = {
      firstName,
      lastName,
      phone,
      hashedPassword,
      tosAgreement: true
    };

    if (!hashedPassword) done([500, { Error: 'Hash failed' }]);
    
    // create user
    [err] = await to(_data.create('users', phone, userObject));
    if (err) done([500, { Error: 'Could not create new user' }]);
    
    done([200]);
  } else {
    done([400, { Error: 'Missing required fields' }]);
  }
};


handlers._users.get = async (data, done) => {
  let phone = typeof (data.queryString.phone) == 'string' && data.queryString.phone.trim().length === 10 ? data.queryString.phone : false;
  if (!phone) done([400, { Error: 'Missing required fields' }]);
  
  // verify user token
  let token = typeof data.headers.token === 'string' ? data.headers.token : false;
  let verifiedToken = await handlers._tokens.verifyToken(token, phone);

  if (!verifiedToken) done([403, { Error: 'Missing required token in header or token is invalid' }]);
  
  // lookup user
  let [err, userData] = await to(_data.read('users', phone));
  if (err || !userData) done([404, {Error: 'Unable to get user' }]);
  
  delete userData.hashedPassword;
  done([200, userData]);
};


handlers._users.put = async (data, done) => {
  let { firstName, lastName, password, phone } = data.payload;
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone : false;
  firstName = typeof firstName == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
  lastName = typeof lastName == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone.trim() : false;
  password = typeof password == 'string' && password.trim().length > 5 ? password.trim() : false;

  if (!phone) done([400, { Error: 'Missing required field' }]);

  let token = typeof data.headers.token === 'string' ? data.headers.token : false;
  let verifiedToken = await handlers._tokens.verifyToken(token, phone);

  if (!verifiedToken) done([403, { Error: 'Missing required token in header or token is invalid' }]);  

  if (firstName || lastName || password) {
    let [err, userData] = await to(_data.read('users', phone));

    if (err || !userData) done([400, { Error: 'The specified user does not exist' }]);
    if (firstName) userData.firstName = firstName;
    if (lastName) userData.lastName = lastName;
    if (password) userData.hashedPassword = hash(password);

    [err] = await to(_data.update('users', phone, userData));
    if (err) done([500, { Error: `Could not update user - ${err}` }]);

    done([200]);
  } else {
    done([400, { Error: 'Missing fields to update' }]);
  }
};

// required field: phone
// clean up associated checks/data
handlers._users.delete = async (data, done) => {
  let phone = typeof (data.queryString.phone) == 'string' && data.queryString.phone.trim().length === 10 
    ? data.queryString.phone 
    : false;

  if (!phone) done([400, { Error: 'Missing required field' }]);

  // verify token
  let token = typeof data.headers.token === 'string' ? data.headers.token : false;
  let verifiedToken = await handlers._tokens.verifyToken(token, phone);
  if (!verifiedToken) done([403, { Error: 'Missing required token in header or token is invalid' }]);

  // lookup user
  let [err, userData] = await to(_data.read('users', phone));
  if (err || !userData) done([400, { Error: 'Could not find specified user' }]);

  [err] = await to(_data.delete('users', phone));
  if (err) done([500, { Error: 'Could not delete specified user' }]);

  done([200]);
};



handlers._tokens.post = async (data, done) => {
  let { phone, password } = data.payload;
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone.trim() : false;
  password = typeof password == 'string' && password.trim().length > 5 ? password.trim() : false;

  if (!phone || !password) done([400, { Error: 'Missing required fields' }]);

  // lookup user
  let [err, userData] = await to(_data.read('users', phone));
  if (err || !userData) done([400, { Error: 'Could not find the specified user' }]);

  // hash password and compare
  const hashedPassword = hash(password);
  if (hashedPassword !== userData.hashedPassword) done([400, { Error: 'Password did not match the specified user\'s password' }]);
  
  // create token, set expiration 
  const tokenId = createRandomString(TOKEN_LENGTH);
  const expires = Date.now() + 1000 * 60 * 60;
  const tokenObject = {
    phone,
    tokenId,
    expires
  };

  [err] = await to(_data.create('tokens', tokenId, tokenObject));
  if (err) done([500, { Error: 'Could not create new token' }]);

  done([200, tokenObject]);
};

handlers._tokens.get = async (data, done) => {
  let { id } = data.queryString;
  // validate id
  id = typeof id == 'string' && id.trim().length === TOKEN_LENGTH ? id.trim() : false;

  if (!id) done([400, { Error: 'Missing required fields' }]);

  let [err, token] = await to(_data.read('tokens', id));
  if (err || !token) done([404]);

  done([200, token]);
};

// required fields: id and extend
handlers._tokens.put = async (data, done) => {
  let { id, extend } = data.payload;
  id = typeof id == 'string' && id.trim().length === TOKEN_LENGTH ? id.trim() : false;
  extend = extend === true ? true : false;

  if (!id || !extend) done([400, { Error: 'Missing required field(s) or field(s) are invalid' }]);

  // lookup the token
  let [err, tokenData] = await to(_data.read('tokens', id));
  if (err || !tokenData) done([400, { Error: 'Specified token does not exist' }]);

  // check to make sure token is not already expired
  if (tokenData.expires > Date.now()) {
    tokenData.expires = Date.now() + 1000 * 60 * 60;

    [err] = await to(_data.update('tokens', id, tokenData ));
    if (err) done([500, { Error: 'Unable to extend token' }]);

    done([200]);
  } else {
    done([400, { Error: 'Token has alread expired and cannot be extended' }])
  }
};

// required data: id
handlers._tokens.delete = async (data, done) => {
  let { id } = data.payload;
  id = typeof id == 'string' && id.trim().length === TOKEN_LENGTH ? id.trim() : false;

  if (!id) done([400, { Error: 'Missing required field' }]);

  // lookup token
  let [err, tokenData] = await to(_data.read('tokens', id));
  if (err || !tokenData) done([400, { Error: 'Could not find specified token' }]);

  // delete
  [err] = await to(_data.delete('tokens', id));
  if (err) done([500, { Error: 'Could not delete specified token' }]);

  done([200]);
};


// Verify if a given token id is valid for a given user
handlers._tokens.verifyToken = async (id, phone) => {
  let [err, tokenData] = await to(_data.read('tokens', id));

  if (err || !tokenData) {
    return Promise.resolve(false);
  }

  if (tokenData.phone === phone && tokenData.expires > Date.now()) {
    return Promise.resolve(true);
  } else {
    return Promise.resolve(false);
  }
};


handlers.notFound = () => Promise.resolve([404, { error: 'route' }]);

handlers.ping = () => Promise.resolve([200]);

module.exports = handlers;