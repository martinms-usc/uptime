const _data = require('./data');
const helpers = require('./helpers');
const handlers = {};

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

// required data, firstName, lastName, phone, password, tosAgreement
handlers._users.post = function(data, callback) {
  let { firstName, lastName, phone, password, tosAgreement } = data.payload;
  // check required fields
  firstName = typeof firstName == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
  lastName = typeof lastName == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone.trim() : false;
  password = typeof password == 'string' && password.trim().length > 5 ? password.trim() : false;
  tosAgreement = typeof tosAgreement == 'boolean' && tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // make sure user doesnt already exist
    _data.read('users', phone, (err, data) => {
      if (err) {
        // create user and hash password
        let hashedPassword = helpers.hash(password);
        let userObject = {
          firstName,
          lastName,
          phone,
          hashedPassword,
          tosAgreement: true
        };

        if (hashedPassword) {
          // store user
          _data.create('users', phone, userObject, err => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { Error: 'Could not create new user' });
            }
          });
        } else {
          callback(500, { Error: 'Hash failed' });
        }
      } else {
        // user exists
        callback(400, { Error: 'User with that phone number exists' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// required data: phone
// only let authenticated users access their own data
handlers._users.get = function(data, callback) {
  let phone = typeof (data.queryString.phone) == 'string' && data.queryString.phone.trim().length === 10 ? data.queryString.phone : false;
  if (phone) {
    // lookup user
    _data.read('users', phone, (err, data) => {
      if (!err && data) {
        // remove hashed password
        delete data.hashedPassword;
        callback(200, data);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Unable to get user' });
  }
};

// required data: phone
// optional data: everything else - first/last/password
// @TODO: only let authenticated user update their own object
handlers._users.put = function(data, callback) {
  let { firstName, lastName, password, phone } = data.payload;
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone : false;
  firstName = typeof firstName == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
  lastName = typeof lastName == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
  phone = typeof phone == 'string' && phone.trim().length === 10 ? phone.trim() : false;
  password = typeof password == 'string' && password.trim().length > 5 ? password.trim() : false;

  if (phone) {
    if (firstName || lastName || password) {
      _data.read('users', phone, (err, userData) => {
        if (!err && userData) {
          // update necessary fields
          if (firstName) {
            userData.firstName = firstName;
          }
          if (lastName) {
            userData.lastName = lastName;
          }
          if (password) {
            userData.hashedPassword = helpers.hash(password);
          }

          // persist changes
          _data.update('users', phone, userData, err => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { Error: 'Could not update user' });
            }
          });
        } else {
          callback(400, { Error: 'The specified user does not exist' });
        }
      });
    } else {
      callback(400, { Error: 'Missing fields to update' });
    }
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};


// required field: phone
// only authenticated users can delete their user data
// clean up associated checks/data
handlers._users.delete = function(data, callback) {
  let phone = typeof (data.queryString.phone) == 'string' && data.queryString.phone.trim().length === 10 ? data.queryString.phone : false;
  if (phone) {
    // lookup user
    _data.read('users', phone, (err, data) => {
      if (!err && data) {
        _data.delete('users', phone, err => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: 'Could not delete specified user' });
          }
        })
      } else {
        callback(400, { Error: 'Could not find specified user' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

module.exports = handlers;