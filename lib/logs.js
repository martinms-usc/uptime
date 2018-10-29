// library for storing and rotating logs
const { open, appendFile, close, readdir, readFile, writeFile, truncate } = require('fs');
const path = require('path');
const { gzip, unzip } = require('zlib');
const { promisify } = require('util');
const { to } = require('./helpers');
const fsFuncs = [ appendFile, open, close, readdir, readFile, writeFile, gzip, unzip, truncate ];
const [ appendAsync, openFileAsync, closeFileAsync, readdirAsync, readFileAsync, writeFileAsync, gzipAsync, unzipAsync, truncateAsync ] = fsFuncs.map(promisify);
const logs = {};

logs.baseDir = path.join(__dirname, '/../.logs/');

// append string to file or create if does not exist
logs.append = (file, string) => new Promise(async(res, rej) => {
  let fileDescriptor;

  openFileAsync(`${logs.baseDir}${file}.log`, 'a')
  .then(fd => {
    fileDescriptor = fd;
    appendAsync(fileDescriptor, string+'\n')
  })
  .then(() => closeFileAsync(fileDescriptor))
  .then(() => res())
  .catch(e => rej('Could not append log'));
});

// list all logs, optionally include compressed
logs.list = includeCompressed => new Promise(async(res, rej) => {
  let [err, logFiles] = await to(readdirAsync(logs.baseDir));
  if (err || !logFiles || logFiles.length === 0) return rej(err);

  let trimmedFileNames = [];
  logFiles.forEach(fileName => {
    // add the .log files
    if (fileName.indexOf('.log') > -1) {
      trimmedFileNames.push(fileName.replace('.log', ''));
    } 
    // add on compressed files
    if (fileName.indexOf('.gz.b64') > -1 && includeCompressed) {
      trimmedFileNames.push(fileName.replace('.gz.b64', ''));
    }
  });
  return res(trimmedFileNames);
});

// compress contents of one logfile to .gz.b64
logs.compress = (logId, newFileId) => new Promise(async(resolve, reject) => {
  let sourceFile = logId + '.log';
  let destinationFile = newFileId + '.gz.b64';
  let compressedData, fileDescriptor;

  readFileAsync(logs.baseDir + sourceFile, 'utf8')
  .then(inputString => gzipAsync(inputString))
  .then(buffer => {
    compressedData = buffer;
    return openFileAsync(logs.baseDir + destinationFile, 'wx')
  })
  .then(fd => {
    fileDescriptor = fd;
    return writeFileAsync(fileDescriptor, compressedData.toString('base64'))
  })
  .then(() => closeFileAsync(fileDescriptor))
  .then(() => resolve())
  .catch(err => reject(err));
});


// to promise chain
// decompress contents of a .gz.b64 file into string
logs.decompress = fileId => new Promise(async(res, rej) => {
  let fileName = fileId + '.gz.b64';
  let err, string, outputBuffer, inputBuffer;
  
  [err, string] = await to(readFileAsync(lib.baseDir + fileName, 'utf8'));
  if (err || !string) return rej(err);

  inputBuffer = Buffer.from(string, 'base64');
  
  [err, outputBuffer] = await to(unzipAsync(inputBuffer));
  if (err || !outputBuffer) return rej(err);

  return res(outputBuffer.toString());
});

// clear file
logs.truncate = logId => new Promise(async(res, rej) => {
  let fileName = `${logs.baseDir}${logId}.log`;
  let [err] = await to(truncateAsync(fileName, 0));
  if (err) return rej(err);
  return res();
});


module.exports = logs;