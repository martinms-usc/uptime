Uptime monitoring with text alerts via Twilio in raw Node.js with async/await

### This Project
The reasoning behind this project was twofold:
1. I wanted to build a sample program in raw Node.js without the use of ANY server framework (Express, Hapi, etc.) and without the use of ANY third-party npm modules. As such you will see there is no `package.json` or `node_modules` in the project directory. Everything is built with core Node modules.
2. I also wanted to build it in a way that does not use callbacks. Yes, a Node API without callbacks (for the most part). The API, handlers, and internal libs to manipulate data are all constructed with Promises and heavy use of async/await syntax. I wanted to see how far this approach could get me and how much the readability/maintainability of a raw Node.js project could be improved by eliminating 'callback hell'.

### Conventions used:
Lately, I have been teaching myself Golang/Go, and wanted to get used to one of its idiosyncracies: explicit error checking. This is a big departure from JavaScript, which has an exception-handling control structure built in--arguably making it easier for developers to ignore them. I wanted to get used to thinking about errors and dealing with them on the spot.

In Go (Go functions can return multiple values):
```Go
data, err := db.Query("SELECT ...")
if err != nil { return err }
```

To aid in this, I used a small utility function called `to` that receives a promise and resolves the response to an array in the structure `[rejectedError, resolvedData]`, echoing the Node convention of error-first callbacks. It eliminates the need to put `await` statements in `try/catch` blocks or chain `.catch()` calls on promise expressions. 

ex:
```javascript
let [err, data] = await to(_data.read('users', phone));
```

In addition, all routing and response handling is done via promises with async/await. The results of a handler are passed back to the server for response in the structure `[statusCode, { data }]`. Yes, it's a bit uglier to return an array from every handler rather than let the callback handle the statusCode and data independently, but this isn't production code and is just an attempt at getting myself more accustomed to functions returning multiple values as in Go. 

It may seem counterproductive to write an application without callbacks in a language that champions first-class functions--where higher-order functions are commonplace in server logic, but hey, this is just an exercise in curiosity. I wanted to use as many core Node modules as possible while experimenting with the practicality of using promises and async/await to replace callbacks in a Node app wherever possible.
