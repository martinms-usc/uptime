const _data = require('../data');
const { to, hash, createRandomString } = require('../helpers');
const TOKEN_LENGTH = 20;
const tokenHandlers = {};

// phone, password
tokenHandlers.post = async (data, done) => {
  let { phone, password } = data.payload;
  phone = typeof phone == 'string' ? phone : false;
  password = typeof password == 'string' ? password : false;

  if (!phone || !password) return done([400, { Error: 'Missing required fields' }]);

  // lookup user
  let [err, userData] = await to(_data.read('users', phone));
  if (err || !userData) return done([400, { Error: 'Could not find the specified user' }]);

  // hash password and compare
  const hashedPassword = hash(password);
  if (hashedPassword !== userData.hashedPassword) return done([400, { Error: 'Password did not match the specified user\'s password' }]);
  
  // create token, set expiration 
  const tokenId = createRandomString(TOKEN_LENGTH);
  const expires = Date.now() + 1000 * 60 * 60;
  const tokenObject = {
    phone,
    tokenId,
    expires
  };

  [err] = await to(_data.create('tokens', tokenId, tokenObject));
  if (err) return done([500, { Error: 'Could not create new token' }]);

  return done([200, tokenObject]);
};

tokenHandlers.get = async (data, done) => {
  let { id } = data.queryString;
  // validate id
  id = typeof id == 'string' && id.trim().length === TOKEN_LENGTH ? id.trim() : false;

  if (!id) return done([400, { Error: 'Missing required fields' }]);

  let [err, token] = await to(_data.read('tokens', id));
  if (err || !token) return done([404]);

  return done([200, token]);
};

// required fields: id and extend
tokenHandlers.put = async (data, done) => {
  let { id, extend } = data.payload;
  id = typeof id == 'string' && id.trim().length === TOKEN_LENGTH ? id.trim() : false;
  extend = extend === true ? true : false;

  if (!id || !extend) return done([400, { Error: 'Missing required field(s) or field(s) are invalid' }]);

  // lookup the token
  let [err, tokenData] = await to(_data.read('tokens', id));
  if (err || !tokenData) return done([400, { Error: 'Specified token does not exist' }]);

  // check to make sure token is not already expired
  if (tokenData.expires > Date.now()) {
    tokenData.expires = Date.now() + 1000 * 60 * 60;

    [err] = await to(_data.update('tokens', id, tokenData ));
    if (err) return done([500, { Error: 'Unable to extend token' }]);

    return done([200]);
  } else {
    return done([400, { Error: 'Token has alread expired and cannot be extended' }])
  }
};

// required data: id
tokenHandlers.delete = async (data, done) => {
  let { id } = data.payload;
  id = typeof id == 'string' && id.trim().length === TOKEN_LENGTH ? id.trim() : false;

  if (!id) return done([400, { Error: 'Missing required field' }]);

  // lookup token
  let [err, tokenData] = await to(_data.read('tokens', id));
  if (err || !tokenData) return done([400, { Error: 'Could not find specified token' }]);

  // delete
  [err] = await to(_data.delete('tokens', id));
  if (err) return done([500, { Error: 'Could not delete specified token' }]);

  return done([200]);
};


// Verify if a given token id is valid for a given user
tokenHandlers.verifyToken = async (id, phone) => {
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

module.exports = tokenHandlers;