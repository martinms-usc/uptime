const _data = require('../data');
const { to, hash } = require('../helpers');
const { verifyToken } = require('./token');
const userHandlers = {};

userHandlers.post = async (data, done) => {
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
    if (!hashedPassword) done([500, { Error: 'Hash failed' }]);

    let userObject = {
      firstName,
      lastName,
      phone,
      hashedPassword,
      tosAgreement: true
    };
    
    // create user
    [err] = await to(_data.create('users', phone, userObject));
    if (err) done([500, { Error: 'Could not create new user' }]);
    
    done([200]);
  } else {
    done([400, { Error: 'Missing required fields' }]);
  }
};


userHandlers.get = async (data, done) => {
  let phone = typeof (data.queryString.phone) == 'string' && data.queryString.phone.trim().length === 10 ? data.queryString.phone : false;
  if (!phone) done([400, { Error: 'Missing required fields' }]);
  
  // verify user token
  let token = typeof data.headers.token === 'string' ? data.headers.token : false;
  let verifiedToken = await verifyToken(token, phone);

  if (!verifiedToken) done([403, { Error: 'Missing required token in header or token is invalid' }]);
  
  // lookup user
  let [err, userData] = await to(_data.read('users', phone));
  if (err || !userData) done([404, {Error: 'Unable to get user' }]);
  
  delete userData.hashedPassword;
  done([200, userData]);
};


userHandlers.put = async (data, done) => {
  let { firstName, lastName, password, phone } = data.payload;
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone : false;
  firstName = typeof firstName == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
  lastName = typeof lastName == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone.trim() : false;
  password = typeof password == 'string' && password.trim().length > 5 ? password.trim() : false;

  if (!phone) done([400, { Error: 'Missing required field' }]);

  let token = typeof data.headers.token === 'string' ? data.headers.token : false;
  let verifiedToken = await verifyToken(token, phone);

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
userHandlers.delete = async (data, done) => {
  let phone = typeof (data.queryString.phone) == 'string' && data.queryString.phone.trim().length === 10 
    ? data.queryString.phone 
    : false;

  if (!phone) done([400, { Error: 'Missing required field' }]);

  // verify token
  let token = typeof data.headers.token === 'string' ? data.headers.token : false;
  let verifiedToken = await verifyToken(token, phone);
  if (!verifiedToken) done([403, { Error: 'Missing required token in header or token is invalid' }]);

  // lookup user
  let [err, userData] = await to(_data.read('users', phone));
  if (err || !userData) done([400, { Error: 'Could not find specified user' }]);

  [err] = await to(_data.delete('users', phone));
  if (err) done([500, { Error: 'Could not delete specified user' }]);

  done([200]);
};

module.exports = userHandlers;
