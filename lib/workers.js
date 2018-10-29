// perform webside checking configured by users
const url = require('url');
const https = require('https');
const http = require('http');
const { checkInterval } = require('./config');
const _data = require('./data');
const _logs = require('./logs');
const { to, sendTwilioSMS } = require('./helpers');
const { debuglog } = require('util');
const debug = debuglog('workers');
const workers = {};

workers.gatherAllChecks = async () => {
  // lookup checks
  let [err, checks] = await to(_data.list('checks'));
  if (err || !checks || checks.length === 0) {
    debug('Error: could not find checks to process');
  } else {
    // get check data for each in list
    checks.forEach(async c => {
      let [e, checkData] = await to(_data.read('checks', c));
      if (e || !checkData) {
        debug('Error: unable to read check data ' + c);
      }
      // validate check
      workers.validateCheck(checkData);
    });
  }
};

workers.validateCheck = checkData => {
  checkData = typeof checkData == 'object' && checkData !== null ? checkData : {};
  checkData.id = typeof checkData.id == 'string' && checkData.id.length == 20 ? checkData.id : false;
  checkData.phone = typeof checkData.phone == 'string' && checkData.phone.length == 10 ? checkData.phone : false;
  checkData.protocol = typeof checkData.protocol == 'string' && ['http', 'https'].includes(checkData.protocol) ? checkData.protocol : false;
  checkData.url = typeof checkData.url == 'string' && checkData.url.length > 0 ? checkData.url : false;
  checkData.method = typeof checkData.method == 'string' && ['post', 'get', 'put', 'delete'].includes(checkData.method) ? checkData.method : false;
  checkData.successCodes = typeof checkData.successCodes == 'object' && checkData.successCodes instanceof Array && checkData.successCodes.length > 0 ? checkData.successCodes : false;
  checkData.timeoutSeconds = typeof checkData.timeoutSeconds === 'number' && Number.isInteger(checkData.timeoutSeconds) && checkData.timeoutSeconds >= 1 && checkData.timeoutSeconds <= 5 ? checkData.timeoutSeconds : false;

  // set keys that may not be set
  checkData.state = typeof checkData.state == 'string' && ['up', 'down'].includes(checkData.state) ? checkData.state : 'down';
  checkData.lastChecked = typeof checkData.lastChecked === 'number' && checkData.lastChecked > 0 ? checkData.lastChecked : false;

  // if all checks pass, pass data along
  if (checkData.id && checkData.phone && checkData.protocol && checkData.url && checkData.method && checkData.successCodes && checkData.timeoutSeconds) {
    workers.performCheck(checkData);
  } else {
    debug('Error: one of the checks is not properly formatted');
  }
};

workers.performCheck = checkData => {
  // prepare initial check outcome
  let outcomeSent = false;
  const checkOutcome = {
    error: null,
    responseCode: null
  };
  // parse hostname and path
  const parsedUrl = url.parse(`${checkData.protocol}://${checkData.url}`, true);
  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path; // to get full querystring
  // construct request
  const requestParams = {
    protocol: checkData.protocol + ':',
    method: checkData.method.toUpperCase(),
    timeout: checkData.timeoutSeconds * 1000,
    hostname,
    path
  };
  const requestModule = checkData.protocol === 'https' ? https : http;

  // create and send request
  const req = requestModule.request(requestParams, res => {
    checkOutcome.responseCode = res.statusCode;
    // update check outcome
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });
  // bind to error
  req.on('error', e => {
    checkOutcome.error = {
      error: true,
      value: e
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });
  // bind to timeout
  req.on('timeout', () => {
    checkOutcome.error = {
      error: true,
      value: 'timeout'
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });
  // send request
  req.end();
};

// check outcome, trigger alert if outcome switched
workers.processCheckOutcome = async (originalCheckData, checkOutcome) => {
  // determine result of check
  let state = !checkOutcome.error 
    && checkOutcome.responseCode 
    && originalCheckData.successCodes.includes(checkOutcome.responseCode)
    ? 'up'
    : 'down';
    
  // decide if alert is warranted (no alert on first check)
  let alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state;
  let timeOfCheck = Date.now();

  // log outcome
  workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

  // update check data
  let lastChecked = timeOfCheck;
  let newCheckData = Object.assign(originalCheckData, { state }, { lastChecked });

  let [err] = await to(_data.update('checks', newCheckData.id, newCheckData));
  if (err) {
    debug('Error saving updates to check');
  } else {
    if (alertWarranted) {
      debug('Alert triggered ', newCheckData.id)
      workers.alertUserToStatusChange(newCheckData);
    } else {
      debug('Check outcome not changed, no alert')
    }
  }
};

// alert user to change
workers.alertUserToStatusChange = async checkData => {
  let message = `Alert: Your check for ${checkData.method.toUpperCase()} ${checkData.protocol}://${checkData.url} is currently ${checkData.state}`;
  let [err] = await to(sendTwilioSMS(checkData.phone, message));
  
  if (!err) {
    debug(`Success: User ${checkData.phone} was alerted to status change in check via sms\n  "${message}"`);
  } else {
    debug('Error: Could not alert user to state change in check via sms: ', err);
  }
};

workers.log = async(checkData, outcome, state, alert, time) => {
  let logData = {
    check: checkData,
    outcome,
    state,
    alert,
    time
  };
  logData = JSON.stringify(logData);
  let logFileId = checkData.id;

  // append logstring to file
  let [err] = await to(_logs.append(logFileId, logData));
  if (err) {
    debug('Error: log failed - ' + logFileId, err);
  } else {
    debug('Log succeeded - ' + logFileId);
  }
};

// rotate (compress) log files
workers.rotateLogs = async () => {
  // list all non-compressed logFiles
  let [err, logFiles] = await to(_logs.list(false));
  if (err || !logFiles || logFiles.length === 0) {
    debug('Error: could not find logs to rotate');
  } else {
    logFiles.forEach(async logName => {
      // compress data to different file
      let logId = logName.replace('.log', '');
      let newFileId = `${logId}-${Date.now()}`;

      _logs.compress(logId, newFileId)
      .then(() => _logs.truncate(logId))
      .then(() => {
        debug('Success compressing log - ' + logId);
      })
      .catch(e => {
        debug('Error rotating logs: \n', e)
      });
    });
  }
};

// timer to execute log-rotation once daily
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

// timer to execute worker process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, checkInterval);
};

workers.init = () => {
  // send to console
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');
  // execute all checks
  workers.gatherAllChecks();
  // call loop for checks to continue executing
  workers.loop();
  // compress all logs immediately
  workers.rotateLogs();
  // start compression loop
  workers.logRotationLoop();
};

module.exports = workers;