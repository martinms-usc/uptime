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
  let requestUrl = path + '?';
  let count = 0;
  for (let queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      count++;
      // If at least one query string parameter has already been added, preprend new ones with an ampersand
      if (count > 1) {
        requestUrl += '&';
      }
      // Add the key and value
      requestUrl += `${queryKey}=${queryStringObject[queryKey]}`;
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
    xhr.setRequestHeader('token', app.config.sessionToken.tokenId);
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
app.bindLogoutButton = function () {
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
  redirectUser = typeof redirectUser == 'boolean' ? redirectUser : true;
  // Get the current token id
  const tokenId = typeof app.config.sessionToken.tokenId == 'string' ? app.config.sessionToken.tokenId : false;
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
    let method = this.method.toUpperCase();
    // Hide the error message (if it's currently shown due to a previous error)
    document.querySelector(`#${formId} .formError`).style.display = 'none';

    // Hide the success message (if it's currently shown due to a previous error)
    if (document.querySelector(`#${formId} .formSuccess`)) {
      document.querySelector(`#${formId} .formSuccess`).style.display = 'none';
    }

    // Turn the inputs into a payload
    const payload = {};
    const elements = this.elements;
    for (let element of elements) {
      if (element.type !== 'submit') {
        // Determine class of element and set value accordingly
        let classOfElement = typeof element.classList.value  == 'string' && element.classList.value.length > 0 ? element.classList.value : '';
        let valueOfElement = element.type == 'checkbox' && classOfElement.indexOf('multiselect') == -1 ? element.checked : classOfElement.indexOf('intval') == -1 ? element.value : parseInt(element.value);
        let elementIsChecked = element.checked;
        // Override the method of the form if the input's name is _method
        let nameOfElement = element.name;
        if (nameOfElement == '_method'){
          method = valueOfElement;
        } else {
          // Fix mismatched element names for payload
          nameOfElement = nameOfElement == 'httpmethod' ? 'method' : nameOfElement;
          nameOfElement = nameOfElement == 'uid' ? 'id' : nameOfElement;

          // If the element has the class "multiselect" add its value(s) as array elements
          if (classOfElement.indexOf('multiselect') > -1) {
            if (elementIsChecked) {
              payload[nameOfElement] = typeof payload[nameOfElement] == 'object' && payload[nameOfElement] instanceof Array ? payload[nameOfElement] : [];
              payload[nameOfElement].push(valueOfElement);
            }
          } else {
            payload[nameOfElement] = valueOfElement;
          }
        }
      }
    }

    // If the method is DELETE, the payload should be a queryStringObject instead
    var queryStringObject = method == 'DELETE' ? payload : {};
    
    app.client.request(null, path, method, queryStringObject, payload, (statusCode,responsePayload) => {
      // Display an error on the form if needed
      if (statusCode !== 200) {
        // Try to get the error from the api, or set a default error message
        const error = typeof responsePayload.Error  == 'string' ? responsePayload.Error : 'An error has occured, please try again';
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

app.formResponseProcessor = function (formId, requestPayload, responsePayload) {
  // let functionToCall = false;
  if (formId == 'accountCreate') {
    // Take the phone and password, and use it to log the user in
    const { phone, password } = requestPayload;
    const newPayload = { phone, password };

    app.client.request(null, 'api/tokens', 'POST', null, newPayload, (newStatusCode, newResponsePayload) => {
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

  // If forms saved successfully and they have success messages, show them
  const formsWithSuccessMessages = ['accountEdit1', 'accountEdit2','checksEdit1'];
  if (formsWithSuccessMessages.includes(formId)) {
    document.querySelector(`#${formId} .formSuccess`).style.display = 'block';
  }

  if (formId == 'accountEdit3') {
    app.logUserOut(false);
    window.location = '/account/deleted';
  }

  // If the user just created a new check successfully, redirect back to the dashboard
  if (formId == 'checksCreate') {
    window.location = '/checks/all';
  }

  // If the user just deleted a check, redirect them to the dashboard
  if (formId == 'checksEdit2') { 
    window.location = '/checks/all';
  }
};


// Load data on the page
app.loadDataOnPage = () => {
  // Get the current page from the body class
  const bodyClasses = document.querySelector("body").classList;
  const primaryClass = typeof bodyClasses[0] == 'string' ? bodyClasses[0] : false;

  // Logic for account settings page
  if (primaryClass == 'accountEdit') {
    app.loadAccountEditPage();
  }

  // Logic for dashboard page
  if (primaryClass == 'checksList') {
    app.loadChecksListPage();
  }

  // Logic for check details page
  if (primaryClass == 'checksEdit') {
    app.loadChecksEditPage();
  }
};

// Load the account edit page 
app.loadAccountEditPage = function() {
  // Get the phone number from the current token, or log the user out if none is there
  const phone = typeof (app.config.sessionToken.phone) == 'string' ? app.config.sessionToken.phone : false;
  if (phone) {
    // Fetch the user data
    const queryStringObject = { phone };
    
    app.client.request(null, 'api/users', 'GET', queryStringObject, null, function(statusCode,responsePayload) {
      if (statusCode == 200) {
        // Put the data into the forms as values where needed
        document.querySelector("#accountEdit1 .firstNameInput").value = responsePayload.firstName;
        document.querySelector("#accountEdit1 .lastNameInput").value = responsePayload.lastName;
        document.querySelector("#accountEdit1 .displayPhoneInput").value = responsePayload.phone;
        
        // Put the hidden phone field into both forms
        const hiddenPhoneInputs = document.querySelectorAll("input.hiddenPhoneNumberInput");
        for (let input of hiddenPhoneInputs) {
          input.value = responsePayload.phone;
        }
      } else {
        // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
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
    const payload = { id : currentToken.tokenId, extend : true };
    app.client.request(null, 'api/tokens','PUT', null, payload, (statusCode,responsePayload) => {
      // Display an error on the form if needed
      if (statusCode == 200) {
        // Get the new token details
        const queryStringObject = { id: currentToken.tokenId };
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
        console.log(`Token renewed successfully @ ${Date.now()}`);
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
  app.loadDataOnPage();
};

// Call the init processes after the window loads
window.onload = () => {
  app.init();
};