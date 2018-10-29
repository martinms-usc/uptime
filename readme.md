## Uptime monitoring 
##### In raw Node.js & async/await with text alerts via Twilio

### This Project
The reasoning behind this project was twofold:
1. I wanted to build a program in raw Node.js without the use of ANY server framework (Express, Hapi, etc.) and without the use of ANY third-party npm modules. As such you will see there is no `package.json` or `node_modules` in the project directory. Everything is built with core Node modules.
2. I also wanted to build it in a way that does not use callbacks. Yes, a Node API without callbacks (for the most part). The API, handlers, and internal libs to manipulate data are all constructed with Promises and heavy use of async/await syntax. I wanted to see how far this approach could get me not just in terms of eliminating 'callback hell'; but also in its effect on improving brevity, readability & maintainability. 

The 'Promises Rule' approach did cost a little extra boilerplate in returning promises and wrapping promise expressions in a helper to avoid chaining `.catch()` off everything, but there was an overall improvement readability (with some implactions for error handling).

Overall a callback-style file compression method went from this:

```javascript
lib.compress = function(logId,newFileId,callback){
  var sourceFile = logId+'.log';
  var destFile = newFileId+'.gz.b64';
  // Read the source file
  fs.readFile(lib.baseDir+sourceFile, 'utf8', function(err,inputString){
    if(!err && inputString){
      // Compress the data using gzip
      zlib.gzip(inputString,function(err,buffer){
        if(!err && buffer){
          // Send the data to the destination file
          fs.open(lib.baseDir+destFile, 'wx', function(err, fileDescriptor){
            if(!err && fileDescriptor){
              // Write to the destination file
              fs.writeFile(fileDescriptor, buffer.toString('base64'),function(err){
                if(!err){
                  // Close the destination file
                  fs.close(fileDescriptor,function(err){
                    if(!err){
                      callback(false);
                    } else {
                      callback(err);
                    }
                  });
                } else {
                  callback(err);
                }
              });
            } else {
              callback(err);
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};
```

To This: 

```javascript
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
```

### Conventions:
Lately, I have been learning Golang, and wanted to get used to one of its idiosyncracies: explicit error checking. This is a big departure from JavaScript, which has an exception-handling control structure built in - arguably making it easier for developers to ignore them. I wanted to get used to thinking about errors and dealing with them on the spot.

In Go (functions can return multiple values):
```Go
data, err := db.Query("SELECT ...")
if err != nil { return err }
```

To aid in this, I used a small utility function called `to` that receives a promise and resolves the response to an array in the structure `[rejectedError, resolvedData]`, echoing the Node convention of error-first callbacks. This was an attempt at getting myself more accustomed to functions returning multiple values as in Go, but more importantly in dealing with errors as soon as they are encountered.

Using async/await and `to`:
```javascript
let [err, userData] = await to(_data.read('users', id));
```

The goal was to make async code terse and flat. Rather than chain `.catch()` calls on every promise (which would get wordy) or a single `catch()` at the end of a long chain (harder to pin down exactly where the error is coming from), a resolved value from a promise cannot be obtained without also first declaring or defining the rejected error. This quite literally forced me to think of errors first.

It also conveniently eliminated the need to put `await` statements in `try/catch` blocks to prevent uncaught exceptions.

In cases where multiple errors are rejected by a promise in the same fashion, I used typical promise chaining. This was typically done in background worker processes or in cases where the error itself would never be visible outside the console.

e.g. Instead of using `to()` and rejecting similar errors:
```javascript
  [err] = await to(truncateAsync(fileDescriptor));
  if (err) rej('Error truncating file');

  [err] = await to(writeFileAsync(fileDescriptor, stringData));
  if (err) rej('Error writing to existing file');
  
  [err] = await to(closeAsync(fileDescriptor));
  if (err) rej('Error closing file');
  
  res(null);
```

Promises could be chained: 
```javascript
  truncateAsync(fileDescriptor)
  .then(() => writeFileAsync(fileDescriptor, stringData))
  .then(() => closeAsync(fileDescriptor))
  .then(() => res())
  .catch(err => rej(err))
```

Heavy use of wrapped promises and async/await in request routing and response handling made server logic much more brief, flat and synchronous-looking. 

The results of a handler are passed back to the server for response in the structure `[statusCode, { data or error }]`. Yes, it's a bit uglier to return an array from every handler rather than let the callback handle the status code and data for response independently, but it got me warmed up to using functions that return multiple values and led me to perform more granular error checking at regular intervals.


### Conclusion
At times it felt counterproductive to write an application without callbacks in a language that champions first-class functions - where higher-order functions are commonplace in server logic, but overall this was a positive exercise in curiosity. I was able to use as many core Node modules as possible while demonstrating the practicality of using promises and async/await to replace callbacks in a Node app wherever possible - with some additional benefits in error handling. 
