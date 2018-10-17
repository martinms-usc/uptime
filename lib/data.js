// storing and editing data mock

const fs = require("fs");
const path = require("path");

const lib = {};

// define base directory
lib.baseDir = path.join(__dirname, '/../.data/');

// create file
lib.create = function(dir, file, data, cb) {
  // open file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // convert data to string
      const stringData = JSON.stringify(data);
      // write to file and close it
      fs.writeFile(fileDescriptor, stringData, err => {
        if (!err) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              cb(null);
            } else {
              cb('Error closing file');
            }
          });
        } else {
          cb('Error writing to new file');
        }
      });
    } else {
      cb('Could not create new file, it may already exist');
    }
  });
};

// read file
lib.read = function(dir, file, cb) {
  fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf8', (err, data) => {
    cb(err, data);
  });
};

// update
lib.update = function(dir, file, data, cb) {
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      const stringData = JSON.stringify(data);
      // truncate contents before writing
      fs.ftruncate(fileDescriptor, err => {
        if (!err) {
          // write and close
          fs.writeFile(fileDescriptor, stringData, err => {
            if (!err) {
              fs.close(fileDescriptor, err => {
                if (!err) {
                  cb(null);
                } else {
                  cb('Error closing file');
                }
              });
            } else {
              cb('Error writing to existing file');
            }
          });
        } else {
          cb('Error truncating file');
        }
      })
    } else {
      cb('Could not open the file, it may not exist yet');
    }
  });
};

lib.delete = function(dir, file, cb) {
  fs.unlink(`${lib.baseDir}${dir}/${file}.json`, err => {
    if (!err) {
      cb(null);
    } else {
      cb('Unable to delete');
    }
  });
};

module.exports = lib;