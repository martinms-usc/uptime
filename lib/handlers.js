const _data = require('./data');
const { to, hash } = require('./helpers');
const handlers = {};

// TODO:  Handlers to use promises, not callback
// convention: 
// reject({statusCode, data: error })
// resolve({statusCode, data})

handlers.notFound = (data, callback) => {
  callback(404, { error: 'route' });
};

handlers.ping = (data, callback) => {
  callback(200);
};

handlers.users = function(data, callback) {
  const acceptedMethods = ['post', 'get', 'put', 'delete'];
  if (acceptedMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// container for users submethods
handlers._users = {};

handlers._users.post = async (data, callback) => {
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
    if (!err || userData) callback(400, { Error: 'User with that phone number exists' }); 

    let hashedPassword = hash(password);
    let userObject = {
      firstName,
      lastName,
      phone,
      hashedPassword,
      tosAgreement: true
    };

    if (hashedPassword) {
      // create user
      [err] = await to(_data.create('users', phone, userObject));
      if (err) callback(500, { Error: 'Could not create new user' });
      callback(200);
    } else {
      callback(500, { Error: 'Hash failed' });
    }
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// required data: phone
// TODO: only let authenticated users access their own data
handlers._users.get = async (data, callback) => {
  let phone = typeof (data.queryString.phone) == 'string' && data.queryString.phone.trim().length === 10 ? data.queryString.phone : false;
  if (!phone) callback(400, { Error: 'Missing required fields' });
  // lookup user
  let [err, userData] = await to(_data.read('users', phone));
  if (err || !userData) callback(404, {Error: 'Unable to get user' });
  if (!err && userData) {
    delete userData.hashedPassword;
    callback(200, userData);
  }
};

// required data: phone
// optional data: everything else - first/last/password
// @TODO: only let authenticated user update their own object
handlers._users.put = async (data, callback) => {
  let { firstName, lastName, password, phone } = data.payload;
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone : false;
  firstName = typeof firstName == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
  lastName = typeof lastName == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone.trim() : false;
  password = typeof password == 'string' && password.trim().length > 5 ? password.trim() : false;

  if (!phone) callback(400, { Error: 'Missing required field' });

  if (firstName || lastName || password) {
    let [err, userData] = await to(_data.read('users', phone));
    if (err || !userData) callback(400, { Error: 'The specified user does not exist' });

    if (firstName) userData.firstName = firstName;
    if (lastName) userData.lastName = lastName;
    if (password) userData.hashedPassword = hash(password);

    [err] = await to(_data.update('users', phone, userData));
    if (err) callback(500, { Error: `Could not update user - ${err}` });
    callback(200);
  } else {
    callback(400, { Error: 'Missing fields to update' });
  }
};

// required field: phone
// only authenticated users can delete their user data
// clean up associated checks/data
handlers._users.delete = async (data, callback) => {
  let phone = typeof (data.queryString.phone) == 'string' && data.queryString.phone.trim().length === 10 
    ? data.queryString.phone 
    : false;
  if (phone) {
    // lookup user
    let [err, data] = await to(_data.read('users', phone));
    if (err || !data) callback(400, { Error: 'Could not find specified user' });

    [err] = await to(_data.delete('users', phone));
    if (err) callback(500, { Error: 'Could not delete specified user' })
    callback(200);
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

module.exports = handlers;