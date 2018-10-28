// storing and editing data to filesystem
const path = require("path");
const { promisify } = require("util");
const { open, close, writeFile, readFile, ftruncate, unlink, readdir } = require("fs");
const fsFuncs =  [open, close, writeFile, readFile, ftruncate, unlink, readdir];
const [ openAsync, closeAsync, writeFileAsync, readFileAsync, truncateAsync, unlinkAsync, readdirAsync ] = fsFuncs.map(promisify);
const { to, parseJsonToObject } = require('./helpers');
const lib = {};

// define base directory
lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = (dir, file, data) => {
  return new Promise(async (res, rej) => {
    const stringData = JSON.stringify(data);
    let [err, fileDescriptor] = await to(openAsync(`${lib.baseDir}${dir}/${file}.json`, 'wx'));
    if (err || !fileDescriptor) rej('Could not create new file, it may already exist');

    [err] = await to(writeFileAsync(fileDescriptor, stringData));
    if (err) rej('Error writing to new file');

    [err] = await to(closeAsync(fileDescriptor));
    if (err) rej('Error closing file');

    res(null);
  });
};

// read file
lib.read = (dir, file) => {
  return new Promise(async (res, rej) => {
    let [err, data] = await to(readFileAsync(`${lib.baseDir}${dir}/${file}.json`, 'utf8'));
    if (err || !data) rej('Unable to read file');
    res(parseJsonToObject(data));
  });
};

// update
lib.update = (dir, file, data) => {
  return new Promise(async (res, rej) => {
    const stringData = JSON.stringify(data);
    let [err, fileDescriptor] = await to(openAsync(`${lib.baseDir}${dir}/${file}.json`, 'r+'));
    if (err || !fileDescriptor) rej('Could not open the file, it may not exist yet');

    [err] = await to(truncateAsync(fileDescriptor));
    if (err) rej('Error truncating file');

    [err] = await to(writeFileAsync(fileDescriptor, stringData));
    if (err) rej('Error writing to existing file');

    [err] = await to(closeAsync(fileDescriptor));
    if (err) rej('Error closing file');

    res(null);
  });
}

// delete
lib.delete = (dir, file) =>  new Promise(async (res, rej) => {
  let [err] = await to(unlinkAsync(`${lib.baseDir}${dir}/${file}.json`));
  if (err) rej(`Unable to delete ${dir} data: ${file}`);
  res(null);
});

// list all items in a directory
lib.list = dir => new Promise(async (res, rej) => {
  let [err, data] = await to(readdirAsync(`${lib.baseDir}/${dir}`));
  if (err || !data || data.length === 0) rej(`Unable to read dir ${dir}`);
  let trimmedFileNames = data.map(n => n.replace('.json', ''));
  res(trimmedFileNames);
});

module.exports = lib;