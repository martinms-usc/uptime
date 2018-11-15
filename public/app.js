// browser logic
const app = {};
// config
app.config = {
  sessionToken: null
};
// api REST client
app.client = {};

app.client.request = (headers, path, method, queryStringObject, payload, callback) => {
  // default params / validation
  headers = typeof headers == 'object' && headers !== null ? headers : {};
  path = typeof path == 'string' ? path : '/';
  method = typeof method == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].includes(method) ? method.toUpperCase() : 'GET';
  queryStringObject = typeof queryStringObject == 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof payload == 'object' && payload !== null ? payload : {};
  callback = typeof callback == 'function' ? callback : false;

  // add queryString params to path
  const requestUrl = path + '?';
  let count = 0;
  for (let queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      count ++;
      if (count > 1) {
        requestUrl += `&${queryKey}=${queryStringObject[queryKey]}`;
      }
    }
  }

  const xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  // add headers to request
  for (let headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // add session token 
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id);
  }

  // handle response
  xhr.onreadystatechange = () => {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      const { status, responseText } = xhr;

      // callback if requested
      if (callback) {
        try {
          const parsedResponse = JSON.parse(responseText);
          callback(status, parsedResponse);
        } catch (error) {
          callback(status, false);
        }
      }
    }
  }
  // send payload as json
  const payloadString = JSON.stringify(payload);
  xhr.send(payloadString);
};

// Bind the logout button
app.bindLogoutButton = () => {
  document.getElementById("logoutButton").addEventListener("click", e => {
    // Stop it from redirecting anywhere
    e.preventDefault();
    // Log the user out
    app.logUserOut();
  });
};

// Log the user out then redirect them
app.logUserOut = redirectUser => {
  // Set redirectUser to default to true
  redirectUser = typeof(redirectUser) == 'boolean' ? redirectUser : true;

  // Get the current token id
  const tokenId = typeof(app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;

  // Send the current token to the tokens endpoint to delete it
  const queryStringObject = { id : tokenId };

  app.client.request(null, 'api/tokens', 'DELETE', queryStringObject, null, (statusCode,responsePayload) => {
    // Set the app.config token as false
    app.setSessionToken(false);

    // Send the user to the logged out page
    if (redirectUser) {
      window.location = '/session/deleted';
    }
  });
};


// Bind the forms
app.bindForms = function() {
  if (!document.querySelector("form")) return;
  document.querySelector("form").addEventListener("submit", function(e) {
    // Stop it from submitting
    e.preventDefault();
    const formId = this.id;
    const path = this.action;
    const method = this.method.toUpperCase();

    // Hide the error message (if it's currently shown due to a previous error)
    document.querySelector(`#${formId} .formError`).style.display = 'hidden';

    // Turn the inputs into a payload
    const payload = {};
    const elements = this.elements;
    for (let i=0; i<elements.length; i++) {
      if (elements[i].type !== 'submit'){
        let elemValue = elements[i].type == 'checkbox' ? elements[i].checked : elements[i].value;
        payload[elements[i].name] = elemValue;
      }
    };

    // Call the API
    app.client.request(null , path, method, null, payload, (statusCode,responsePayload) => {
      // Display an error on the form if needed
      if(statusCode !== 200) {
        // Try to get the error from the api, or set a default error message
        const error = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';

        // Set the formError field with the error text
        document.querySelector(`#${formId} .formError`).innerHTML = error;

        // Show (unhide) the form error field on the form
        document.querySelector(`#${formId} .formError`).style.display = 'block';
      } else {
        // If successful, send to form response processor
        app.formResponseProcessor(formId, payload, responsePayload);
      }
    });
  });
};

// Form response processor
app.formResponseProcessor = (formId, requestPayload, responsePayload) => {
  let functionToCall = false;
  if (formId == 'accountCreate') {
    // Take the phone and password, and use it to log the user in
    const { phone, password } = requestPayload;
    const newPayload = { phone, password };

    app.client.request(null, 'api/tokens', 'POST', null, newPayload, (newStatusCode,newResponsePayload) => {
      // Display an error on the form if needed
      if (newStatusCode !== 200){
        // Set the formError field with the error text
        document.querySelector(`#${formId} .formError`).innerHTML = 'Sorry, an error has occured. Please try again.';
        // Show (unhide) the form error field on the form
        document.querySelector(`#${formId} .formError`).style.display = 'block';
      } else {
        // If successful, set the token and redirect the user
        app.setSessionToken(newResponsePayload);
        window.location = '/checks/all';
      }
    });
  }
  // If login was successful, set the token in localstorage and redirect the user
  if (formId == 'sessionCreate') {
    app.setSessionToken(responsePayload);
    window.location = '/checks/all';
  }
};

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = () => {
  const tokenString = localStorage.getItem('token');
  if (typeof tokenString == 'string') {
    try {
      const token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      if (typeof token == 'object') {
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    } catch(e) {
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = add => {
  const target = document.querySelector("body");
  if (add) {
    target.classList.add('loggedIn');
  } else {
    target.classList.remove('loggedIn');
  }
};

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = token => {
  app.config.sessionToken = token;
  const tokenString = JSON.stringify(token);
  localStorage.setItem('token', tokenString);

  if (typeof token == 'object') {
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

// Renew the token
app.renewToken = callback => {
  const currentToken = typeof app.config.sessionToken == 'object' ? app.config.sessionToken : false;
  if (currentToken) {
    // Update the token with a new expiration
    const payload = { id : currentToken.id, extend : true };
    app.client.request(null, 'api/tokens','PUT', null, payload, (statusCode,responsePayload) => {
      // Display an error on the form if needed
      if (statusCode == 200) {
        // Get the new token details
        const queryStringObject = { id: currentToken.id };
        app.client.request(null, 'api/tokens', 'GET', queryStringObject, null, (statusCode,responsePayload) => {
          // Display an error on the form if needed
          if(statusCode == 200) {
            app.setSessionToken(responsePayload);
            callback(false);
          } else {
            app.setSessionToken(false);
            callback(true);
          }
        });
      } else {
        app.setSessionToken(false);
        callback(true);
      }
    });
  } else {
    app.setSessionToken(false);
    callback(true);
  }
};

// Loop to renew token often
app.tokenRenewalLoop = () => {
  setInterval(() => {
    app.renewToken(err => {
      if (!err){
        console.log("Token renewed successfully @ "+Date.now());
      }
    });
  }, 1000 * 60);
};

// Init (bootstrapping)
app.init = () => {
  // Bind all form submissions
  app.bindForms();

  // Bind logout logout button
  app.bindLogoutButton();
 
  // Get the token from localstorage
  app.getSessionToken();
 
  // Renew token
  app.tokenRenewalLoop();
 
  // Load data on page
  // app.loadDataOnPage();
};

// Call the init processes after the window loads
window.onload = () => {
  app.init();
};