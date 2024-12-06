(function(){
"use strict";
/**
 * @name  Helpers
 * @class  Helpers
 */
var Helpers = {
  /**
   * Concatenates property and returns concatenated obj
   * @param  o object to be returned with new products
   * @param  O object to be concatenated
   * @return returns object with concatenates products property
   * @memberOf Helpers
   */
  merge: function(o,O) {
    for (var property in O) {
      if (O.hasOwnProperty(property)) {
        try {
          if (property === 'products') {
            o.products = o.products || [];
            o.products = o.products.concat(O.products);
          } else if (typeof o[property] === 'object') {
            o[property] = Helpers.merge(o[property], O[property]);
          } else {
            o[property] = O[property];
          }
        } catch(e) {
          o[property] = O[property];
        }
      }
    }

    return o;
  },

  /**
   * @memberOf Helpers
   */
  returnMeaningful: function (P) {
    P.reverse();

    var x = {};
    var r = [];

    P.forEach(function (p) {
      if (!x.hasOwnProperty(p.path)) {
        x[p.path] = true;
        r.push(p);
      }
    });

    return r;
  },

  runCallback: function(callback, args) {
    //run callback function if it's function or string
    if (typeof callback  === 'function') {
      callback.apply(null, args);
    }
  }
};

function isEmpty(obj) {
  if (typeof obj === 'undefined' || obj === null) {
    return true;
  }

  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      return false;
    }
  }

  return JSON.stringify(obj) === JSON.stringify({});
}

function debug(string) {
  if (API.debug || Helpers.storage.getItem('debug')) {
    var args = Array.prototype.slice.call(arguments);
    if (typeof string === 'string') {
      args.unshift('[FastSpring API] ' + args.shift());
    }
    console.log.apply(console, args);
  }
}

function error(string) {
  var args = Array.prototype.slice.call(arguments);
  if (typeof string === 'string') {
    args.unshift('[FastSpring API] ' + args.shift());
  }
  (console.error || console.log).apply(console, args);
}

var storageAccessible = true;
try {
  window.localStorage.setItem('fs','fs');
  window.localStorage.removeItem('fs');
} catch(e) {
  storageAccessible = false;
}

Object.defineProperty(Helpers, 'storage', {
  get: function _getStorage() {
    if (storageAccessible && ('localStorage' in window)) {
      return window.localStorage;
    } else {
      if (typeof _getStorage.storage === 'undefined') {
        _getStorage.storage = {
          _data       : {},
          setItem     : function(id, val) { return this._data[id] = String(val); },
          getItem     : function(id) { return this._data.hasOwnProperty(id) ? this._data[id] : undefined; },
          removeItem  : function(id) { return delete this._data[id]; },
          clear       : function() { return this._data = {}; }
        };
      }
      return _getStorage.storage;
    }
  }
});
;
/**
 * @name Spinner
 * @class Spinner
 */
var Spinner = {
  attach: function () {
    if (API.isInlineCheckout) {
      return;
    }
    this.spinSVG.style.position = 'absolute';
    this.spinSVG.style.top = '50%';
    this.spinSVG.style.marginTop = '-50px';
    this.spinSVG.style.left = '50%';
    this.spinSVG.style.marginLeft = '-50px';
    this.spinSVG.style.zIndex = '100000000000000';
    this.spinSVG.style.display = 'block';
    Popup.canvas.appendChild(this.spinSVG);
  },

  remove: function () {
    if (API.isInlineCheckout) {
      return;
    }
    if (typeof this.spinSVG !== 'undefined') {
      this.spinSVG.style.display = 'none';
    }
  }
};
;
/**
 * @name  API
 * @class  API
 */
var API = {

  assignAttributeValues: function($fscContainer) {
    /** @property {boolean}  this.animateFader - default: true */
    this.animateFader = ($fscContainer.getAttribute('data-animate-fader') || 'true');

    this.beforeRequests = $fscContainer.getAttribute('data-before-requests-callback');
    this.afterRequests = $fscContainer.getAttribute('data-after-requests-callback');

    this.beforeMarkup = $fscContainer.getAttribute('data-before-markup-callback');
    this.afterMarkup = $fscContainer.getAttribute('data-after-markup-callback');

    this.decorateCallback = $fscContainer.getAttribute('data-decorate-callback');
    this.dataCallback = $fscContainer.getAttribute('data-data-callback');
    this.errorCallback = $fscContainer.getAttribute('data-error-callback');
    this.validationCallback = $fscContainer.getAttribute('data-validation-callback');
    this.markupHelpers = $fscContainer.getAttribute('data-markup-helpers-callback');

    this.popupClosed = $fscContainer.getAttribute('data-popup-closed');
    this.popupWebhookReceived = $fscContainer.getAttribute('data-popup-webhook-received');
    this.popupEventReceived = $fscContainer.getAttribute('data-popup-event-received');

    this.storefront = $fscContainer.getAttribute('data-storefront');
    this.debug = ($fscContainer.getAttribute('data-debug') === 'true');
    this.aKey = $fscContainer.getAttribute('data-access-key');
    this.continuous = ($fscContainer.getAttribute('data-continuous') === 'true');
    this.sblVersion = $fscContainer.getAttribute('src');
  },

  /**
   * Starting function
   * @memberOf API
   */
  init: function () {
    this.assignAttributeValues(fscContainer);

    this.isInlineCheckout = false;
    this.checkoutMode = 'redirect';
    if (this.storefront.match(/pinhole/) !== null || this.storefront.match(/popup/) !== null) {
      this.checkoutMode = 'popup';
    }
    if (this.storefront.match(/inapp/) !== null) {
      this.checkoutMode = 'inapp';
    }
    if (this.storefront.match(/embedded/) !== null) {
      this.checkoutMode = 'popup'; // checkoutMode variable is used  by the builder API. We are using the popup flow behind the scene for inline
      this.isInlineCheckout = true;
    }

    debug('Checkout mode:', this.checkoutMode);

    this.testMode = false;

    if ((/\.test\./).test(this.storefront)) {
      this.testMode = true;
    }
    else if ((/(localhost:[^?]*\*)/).test(this.storefront)) {
      this.testMode = true;
    }

    debug('Test mode:', this.testMode);

    if (this.aKey !== null) {
      debug('Access key:', this.aKey);
    }

    if (this.checkoutMode === 'popup' && !API.isInlineCheckout) {
      Spinner.spinSVG = document.createElement('img');
      Spinner.spinSVG.src = 'https://sbl.onfastspring.com/pinhole/spin.svg';
    }

    this.sessionID = null;
    this.data = {};
    this.finishSilently = false;
    this.builder = '/builder';
    this.refreshPath = '/refresh';
    this.requests = [];

    if (this.checkoutMode !== 'inapp') {
      Popup.checkURL();
    }

    this.parseInput(fscSession);
    APIInitialized = true;
  },

  /**
   * Gets session from LocalStorage if continuous mode enabled
   * @memberOf API
   */
  continuousGet: function () {
      debug(' -> Checking for existing session');

      var serial = null;
      var maybeSerial = Helpers.storage.getItem('fscSerial-' + this.storefront);

      if (maybeSerial) {
        maybeSerial = JSON.parse(maybeSerial);
        if (maybeSerial.hasOwnProperty('session') && maybeSerial.hasOwnProperty('expires')) {
            serial = maybeSerial.session;
          }
        }
        return serial;
  },

  /**
   * Stores Session in local storage for continuous mode
   * @param  serial
   * @memberOf API
   */
  continuousStore: function (serial) {
    debug(' <- Writing to storage:', serial);
    Helpers.storage.setItem('fscSerial-' + this.storefront, JSON.stringify(serial));
  },

  /**
   * Removes Session in local storage for continuous mode
   * @memberOf API
   */
  continuousReset: function () {
    debug(' <- Resetting session');
    Helpers.storage.removeItem('fscSerial-' + this.storefront);
    this.sessionID = null;
  },

  /**
   * Updates Session in local storage for continuous mode
   * @memberOf API
   */
  updateSession: function () {
    debug(' <- Updating session');
    var payload = {};
    var sessionRefreshId = Helpers.storage.getItem('fscLatestSession-' + API.storefront);
    var endpoint = sessionRefreshId ? 'https://' + this.storefront + this.builder + '/refresh/' + sessionRefreshId : 'https://' + this.storefront + this.builder + '/refresh/';
    this.chain({
      endpoint:    endpoint,
      method:      'GET',
      payload:     payload,
      skipsession: true
    });
  },

  /**
   * Gets everything from Push(s)
   * @memberOf API
   * @param  {Object} input
   * @param {Function} callback
   */
  parseInput: function (input, callback) {
    var output = this.sanitizeInput(input);
    debug('Input: ', input, 'Sanitized output:', output);

    // Check if secure payload exists
    if (input.hasOwnProperty('secure')) {
      if (this.aKey === null) {
        error('No access key found in payload');
      } else if (!input.secure.hasOwnProperty('payload')) {
        error('No secure payload found in request');
      } else {
        if (this.testMode) {
          if (!input.secure.hasOwnProperty('key')) {
            output['accessKey'] = this.aKey;
            Helpers.merge(output, input.secure.payload);
          } else {
            output['accessKey'] = this.aKey;
            output['secureKey'] = input.secure.key;
            output['securePayload'] = input.secure.payload;
          }
        } else {
          if (input.secure.hasOwnProperty('key')) {
            output['accessKey'] = this.aKey;
            output['secureKey'] = input.secure.key;
            output['securePayload'] = input.secure.payload;
          } else {
            error('No secure key found in payload');
          }
        }
      }
    }

    // Check if authenticate exist
    if (input.hasOwnProperty('authenticate')) {
      debug('Found authentication payload', input.authenticate);
      if (this.aKey === null) {
        debug('No access key found while authenticating user');
        Helpers.runCallback(callback);
        return;
      }

      if (input.authenticate.hasOwnProperty('key')) {
        this.authenticateUser(input.authenticate.payload, input.authenticate.key);
      } else {
        this.authenticateUser(input.authenticate.payload);
      }
    }

    if (input.hasOwnProperty('reset')) {
      this.continuousReset();
    }

    if (input.hasOwnProperty('clean')) {
      fscCleanCheckout = true;
    }

    if (input.hasOwnProperty('session')) {
      this.sessionID = input['session'];
      debug('Session found in input:', this.sessionID);
    } else if (this.continuous && !this.sessionID) {
      this.sessionID = this.continuousGet();
      debug('Continuous mode session:', this.sessionID);
    }

    if (input.hasOwnProperty('close')) {
      this.updateSession();
    }

    if (input.hasOwnProperty('checkout')) {
      if (API.checkoutMode === 'popup') {
        Popup.drawCanvas();
      }

      if (input.checkout !== 'true' && input.checkout !== 'false' && input.checkout.length > 10) {
        Helpers.storage.setItem('fscLatestSession-' + this.storefront, input.checkout);
        var url = 'https://' + this.storefront + '/session/' + input.checkout;
        API.continueCheckoutWithURL(url, callback);

      } else {
        API.checkoutRedirect(output, callback);
      }
    } else {
      if (!input.hasOwnProperty('authenticate')) {
        this.loadProducts(output, callback);
      }
    }

    this.flushChain();

    fscSession = {};
  },

  /**
   * Adds request to the queue
   * @param r request
   * @memberOf API
   */
  chain: function (r) {
    debug(' >> Chaining request:', r);
    this.requests.push(r);
  },

  /**
   * Check if there are any requests running to prevent parallel execution
   * @memberOf API
   *
   */
  flushChain: function () {
    debug('Is requests chain locked?', API.ajaxInProgress);

    if (!API.ajaxInProgress) {
      if (typeof window[this.beforeRequests] === 'function') {

        debug(' <- Calling ', this.beforeRequests);
        try {
          window[this.beforeRequests].call(null);
        } catch (e) {
          error('Error in before-requests', e);
        }
      }

      debug('Preparing to make requests:', JSON.stringify(this.requests));

      //next request - or first request
      this.nextRequest();
    }
  },

  /**
   * running next request in the requests chain
   * @memberOf API
   */
  nextRequest: function () {
    var r;

    if (typeof this.requests[0] !== 'undefined') {
      r = this.requests.shift();
      this.request(r.endpoint, r.method, r.payload, r.hasOwnProperty('skipsession'), r.callback);
    } else {
      debug('Unlocking request chain');

      API.ajaxInProgress = false;

      // if (typeof API.passedCallbackFunction === "function") {

      //     API.passedCallbackFunction.call(null, Markup.data);
      //     API.passedCallbackFunction = null;

      // }

      if (typeof window[this.afterRequests] === "function") {
        debug(' <- Calling ', this.afterRequests);
        try {
          window[this.afterRequests]();
        } catch(e) {
          error('Error in data-after-requests-callback', e);
        }
      }
    }
  },

  uninstall: function _uninstall() {
    this.requests.splice(0, this.requests.length);
  },

  /**
   * For side by side SBL & and inline checkout, the following steps are executed, after every sucessful request to the builder API.
   * i)  a request to the finalize API is made to synchronize SBL changes with the checkout session.
   * ii) a ping message is sent to the iframe that holds the inline checkout to refresh the UI.
   * @param {String} responseURL 
   */
  syncInlineSession: function(responseURL, method, hasSelections) {
    try {
      if (this.isInlineCheckout && responseURL && responseURL.indexOf(this.builder) !== -1 && responseURL.indexOf(this.refreshPath) === -1) {
        if (Popup.checkoutUpdatedByUser === true) {
          Popup.checkoutUpdatedByUser = false;
          return;
        }
        var inlineChekoutiFrame = document.querySelector('#fsc-popup-frame');
        if (inlineChekoutiFrame && inlineChekoutiFrame.contentWindow) {
          if (hasSelections) {
            this.checkoutRedirect({}, function(data, b) {
               inlineChekoutiFrame.contentWindow.postMessage({refreshUI: true}, '*');
            });
          } else {
            inlineChekoutiFrame.contentWindow.postMessage({emptySession: true}, '*');
          }
        } else if (hasSelections) {
          var continuousSessionID = null;
          // data-continous is set, so the session is updated in the local storage
          if (this.continuous) {
            continuousSessionID = this.continuousGet();
          }
          if (continuousSessionID || (!continuousSessionID && method === 'POST')) {
            // check DOM is avaialble
            if (document.getElementById(Popup.inlineCheckoutContainerId)) {
              Markup.Checkout();
            } else {
              // worst case scenario, customer has a lot of CSS, scripts on inital load
              // and our API is fired really fast even before DOM is painted. Looping to wait for container DOM
              var implicitLoaderInterval;
              try {
                var implicitLoaderIntervalCounter = 0;
                implicitLoaderInterval = setInterval(function() {
                  // exit strategy (exit the interval if DOM is found (or) a max of 4 seconds)
                  if (implicitLoaderIntervalCounter >= 80) {
                    clearInterval(implicitLoaderInterval);
                  }
                  implicitLoaderIntervalCounter++;
                  var inlineContainerDIV = document.getElementById(Popup.inlineCheckoutContainerId);
                  if (inlineContainerDIV) {
                    clearInterval(implicitLoaderInterval);
                    Markup.Checkout();
                  }
                }, 50);
              } catch(e) {
                if (implicitLoaderInterval) {
                  clearInterval(implicitLoaderInterval);
                }
              }
            }
          }
        }
      }
    } catch(e) {
      error('Error in messaging to iframe for inline checkout', e);
    }
  },

  /**
   * HandleData is called when new JSON received from server
   * @param  {Object} data - data received from the server
   * @memberOf API
   */
  handleData: function (data, responseURL, callback, method) {
    data = this.sanitize(data);

    if (typeof this.requests[0] !== 'undefined') {
      debug('Running next request');
      Helpers.runCallback(callback, [data]);
      return;
    }

    if (this.finishSilently) {
      debug('Finishing silently and returning no data');
      Helpers.runCallback(callback, [data]);
      return;
    }

    if (typeof window[this.dataCallback] === 'function') {
      debug('<- Calling ', this.dataCallback );
      try {
        window[this.dataCallback](data);
      }
      catch(e) {
        error('Error in data-callback', e);
      }
    }

    this.syncInlineSession(responseURL, method, data.selections);
    Markup.setData(data);
    Helpers.runCallback(callback, [data]);
    Markup.process();

    this.data = {};
  },
  /**
   * Saves serialized session and sets values
   * @param  serial  - session serial
   * @param  expires - expiration date
   * @return sessionID - sessionID
   * @memberOf API
   */
  handleSerial: function (serial, expires) {
    if (this.sessionID !== serial) {
      this.sessionID = serial;
      this.expires = expires;
      if (this.continuous) {
        debug('Storing session ID for continuity');
        this.continuousStore({'session': this.sessionID, 'expires': expires});
      }

      debug('New session ID:', this.sessionID);

      return this.sessionID;
    }
  },

  /**
   * Clears the input. Removes redundant fields
   * @param  data - data to be sanitized
   * @return data - data without unnecessary fields
   * @memberOf API
   */
  sanitize: function (data) { //TODO: cleanup this function

    delete data['serial'];
    delete data['expires'];

    API.groupsByProduct = {};

    data.groups.forEach(function(group) {

      group.selectables = false;
      group.selectableReplacements = false;
      group.selectableAdditions = false;

      group.items.forEach(function(item) {
        item.selectables = false;
        item.selectableReplacements = false;
        item.selectableAdditions = false;

        if (!item.selected) {
          group.selectables = true;
          if (group.type === 'add') { group.selectableAdditions = true; }
          if (group.type === 'replace') { group.selectableReplacements = true; }
        }

        API.groupsByProduct[item.path] = this.driver;

        item.groups.forEach(function(group) {

          group.items.forEach(function(item) {

            if (!item.selected) {
              group.selectables = true;
              item.selectables = true;

              if (group.type === 'replace') {
                group.selectableReplacements = true;
              }
            }

          }, group);

          if (group.selectables === true) { item.selectables = true; }

          if (group.selectableReplacements === true) { item.selectableReplacements = true; }

          if (group.type === 'options') {

            API.newGroupItemsNamed = {};
            API.newGroupItems = [];

            group.items.forEach(function(item) {
              API.newGroupItemsNamed[item.path] = item;
            });

            API.newGroupItemsNamed[this.path] = this;

            group.ordering.forEach(function(path) {
              API.newGroupItems.push(API.newGroupItemsNamed[path]);
            });

            group.items = API.newGroupItems;

            API.newGroupItemsNamed = {};
            API.newGroupItems = [];
          }
        }, item);
      }, group);
    });

    data.groups.forEach(function(group) {
      group.driverType = 'storefront';
      if (group.type === 'add') {
        if (API.groupsByProduct.hasOwnProperty(group.driver)) {
          group.driverType = 'product';
          group.driverOrigin = API.groupsByProduct[group.driver];
        }
      }
    });

    API.groupsByProduct = {};
    return data;
  },

  /**
   * Returns sanitized output
   * @param  Object input
   * @return Object output
   * @memberOf API
   */
  sanitizeInput: function (input) {
    var output = {};

    if (input.hasOwnProperty('coupon')) {
      output['coupon'] = input['coupon'];
    }

    if (input.hasOwnProperty('postalCode')){
      output['postalCode'] = input['postalCode'];
    }

    if (input.hasOwnProperty('products') && input['products'].length > 0) {
      output['items'] = Helpers.returnMeaningful( input['products'] );
    }

    if (input.hasOwnProperty('tags')) {
      output['tags'] = input['tags'];
    }

    if (input.hasOwnProperty('paymentContact')) {
      output['paymentContact'] = input['paymentContact'];
    }

    if (input.hasOwnProperty('recipient')) {
      output['recipient'] = input['recipient'];
    }

    if (input.hasOwnProperty('country')) {
      output['country'] = input['country'];
    }

    if (input.hasOwnProperty('language')) {
      output['language'] = input['language'];
    }

    if (input.hasOwnProperty('taxId')) {
        output['taxId'] = input['taxId'];
    }

    if (input.hasOwnProperty('paymentMethod')) {
        output['paymentMethod'] = input['paymentMethod'];
    }

    if (input.hasOwnProperty('cartViewEnabled')) {
      output['cartViewEnabled'] = input['cartViewEnabled'];
    }

    if (input.hasOwnProperty('invoiceDueDate')) {
      output['invoiceDueDate'] = input['invoiceDueDate'];
    }

    return output;
  },
  /**
   * Authentication via payload
   * @param  accountPayload
   * @param  secureKey
   * @memberOf API
   */
  authenticateUser: function (accountPayload, secureKey) {
    var payload;
    var endpoint;

    debug('Authenticating user');

    if (!this.testMode) {
      if (!secureKey) {
        debug('No secure key found while authenticating user');
        return;
      }

      payload = {'securePayload': accountPayload, 'accessKey': this.aKey, 'secureKey': secureKey};
    } else {
      payload = accountPayload;
      payload.accessKey = this.aKey;
    }

    endpoint = 'https://' + API.storefront + '/account/authenticate';
    payload = {'data': JSON.stringify(payload)};
    this.chain({
      endpoint:    endpoint,
      method:      'POST',
      payload:     payload,
      skipsession: true
    });
  },

  /**
   * Method which queues a request to get products
   * @param  input input
   * @param  callback callback
   * @memberOf API
   */
  loadProducts: function (input, callback) {
    var payload;
    var endpoint;

    debug(' + Getting products');

    endpoint = 'https://' + API.storefront + API.builder;

    var method = 'POST';
    // when refreshing or coming back to store we will do a check on the expiration. If too old then we will call initData endpoint
    // expiresSBL is the expiration time we save in SBL after the first POST request is called
    var expiresSBL = this.expires ? this.expires < new Date().getTime() : null;
    // expiresLocalStorage is the expiration time we save in local storage after the first POST request call until checkout is hit.
    var expiresLocalStorage = Helpers.storage.getItem('fscSerial-' + this.storefront) ? JSON.parse(Helpers.storage.getItem('fscSerial-' + this.storefront)).expires < new Date().getTime() : null;
    // if expiresSBL is null and expiresLocalStorage is existant this happens when redirecting back to store page. We first check if expires SBL is null or not. In this case it is null because the saved expiration in sbl variables is lost after refresh. But we save it in local storage.
    // if expiresSBL or expiresLocalStorage is already expired then we initialize a brand new session if not expired then we continue doing the same thing.
    if(expiresSBL == null && expiresLocalStorage) {
      expiresSBL = expiresLocalStorage;
    }
    if (isEmpty(input) || expiresSBL) {
      payload = {};
      if (!this.sessionID) { //specific case which can use the optimized 'GET' request
        method = 'GET';
      }
    } else {
      // this.sblVersion is currently = ".../sbl/0.8.1/..." but we want just "0.8.1"
      var sblVersionNumber = null;
      if(this.sblVersion.indexOf('sbl') !== -1) {
        var sblDirectoryPath = this.sblVersion.substring(this.sblVersion.indexOf('sbl'));
        sblVersionNumber = sblDirectoryPath.substring(sblDirectoryPath.indexOf("/") + 1, sblDirectoryPath.lastIndexOf("/"));
      }
      input["sblVersion"] = sblVersionNumber;
      payload = {'put': JSON.stringify(input)};
    }

    if(this.sessionID && expiresSBL) {
      method = 'GET';
    }

    this.chain({
      endpoint: endpoint,
      method:   method,
      payload:  payload,
      callback: callback
    });
  },

  /**
   * redirect to checkout page
   * @param  input input
   * @param  callback callback
   * @memberOf API
   */
  checkoutRedirect: function (input, callback) {
    var payload;
    var endpoint;

    debug(' + Redirecting to checkout');

    endpoint = 'https://' + API.storefront + API.builder + '/finalize';

    if (API.checkoutMode === "popup" || API.checkoutMode === "inapp") {
      input['origin'] = document.location.href;
    }

    var sessionFinder = Helpers.storage.getItem('fscLatestSession-' + API.storefront);

    if (input) {
      var sblVersionNumber = null;
      if(this.sblVersion.indexOf('sbl') !== -1) {
        var sblDirectoryPath = this.sblVersion.substring(this.sblVersion.indexOf('sbl'));
        sblVersionNumber = sblDirectoryPath.substring(sblDirectoryPath.indexOf("/") + 1, sblDirectoryPath.lastIndexOf("/"));
      }
      input["sblVersion"] = sblVersionNumber;
      payload = {'put': JSON.stringify(input)};
    }
    else {
      payload = {};
    }

    if(sessionFinder) {
      payload['sessionId'] = sessionFinder;
    }

    this.chain({'endpoint': endpoint, 'method': 'POST', 'payload': payload, 'callback': callback});
  },


  /**
   * Executes XHR
   * @param  {string} url - url for req.open
   * @param  {string} method  - method for req.open
   * @param  {object} payload - payload obj
   * @param  {function} callback
   * @param  {boolean} skipsession
   * @memberOf API
   */
  request: function (url, method, payload, skipsession, callback) {
    debug('Locking requests chain');
    API.ajaxInProgress = true;

    if (this.sessionID && !skipsession) {
      payload['session'] = this.sessionID;
    }

    var sendPayload = this.toQueryString(payload);
    debug(" > > > Making request to " + url + " (" + method + ") with data:", sendPayload);
    try {
      var req = new XMLHttpRequest();
      req.open(method, url, true);
      req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      req.setRequestHeader('Accept', 'application/json, text/javascript, */*; q=0.01');

      req.onerror = function() {
        error("(!) Error received: ", req.status, req.responseText);
        API.runErrorCallback(req.status, req.responseText);
        Helpers.runCallback(callback, [false]);
        API.nextRequest();
      };

      req.onreadystatechange = function() {
        if (req.readyState === 4) {
          if (req.status >= 200 && req.status < 400) {
            API.successHandler(req, callback, method);
          } else {
            error("(!) Error: Error received: ", req.status, req.responseText);

            if (API.checkoutMode === 'popup') {
              Popup.destroy();
            }

            API.runErrorCallback(req.status, req.responseText);
            Helpers.runCallback(callback, [false]);
            API.nextRequest();
          }
        }
      };

      req.send(sendPayload);
    } catch (e) {
      error('Exception: ', e);
    }
  },

  /**
   * runs API.errorCallback or request fail if that is function
   * @param  status       [description]
   * @param  responseText [description]
   * @memberOf API
   */
  runErrorCallback: function(status, responseText) {
    if (typeof window[API.errorCallback] === "function") {
      debug(" <- Calling ", API.errorCallback);
      try {
        window[API.errorCallback](status, responseText);
      }
      catch(e) {
        error('Error in error-callback', e);
      }
    }
  },

  /**
  * runs API.validationCallback
   * @param  fields [JSON object of data validation returned by builder backend]
   * @memberOf API
   */
   runValidationCallback: function(fields) {
     if (typeof window[API.validationCallback] === "function") {
        try {
          window[API.validationCallback](fields);
        }
        catch(e) {
          error('Error in validation-callback', e);
        }
     }
    },

  /**
   * handler function called from req.onreadystatechange and req.onload within request function
   * @param  req request
   * @memberOf API
   */
  successHandler: function (req, callback, method) {
    var responseData;
    try {
      responseData = JSON.parse(req.responseText);
    } catch(e) {
      API.runErrorCallback(req.status, req.responseText);
      return Helpers.runCallback(callback, [false, req && req.responseText]);
    }

    debug('Request is OK, returned data: ', responseData);

    var fields = responseData.fields;
    for (var field in fields) {
      if (fields[field].hasOwnProperty("valid") && !fields[field]["valid"]) {
         API.runValidationCallback(fields);
         break;
      }
    }

    if (responseData.hasOwnProperty('url') && !responseData.hasOwnProperty('serial')) {
      Helpers.runCallback(callback, [responseData]);
      API.nextRequest();
      debug('Obtained redirection parameter', responseData['url']);
      var url = responseData['url'];

      if (responseData.hasOwnProperty('session')) {
        Helpers.storage.setItem('fscLatestSession-' + API.storefront, responseData['session']);
      }

      if(responseData.hasOwnProperty('serialCheckout')) {
        this.handleSerial(responseData['serialCheckout'], responseData['expires']);
      }

      API.continueCheckoutWithURL(url);

      return;
    }

    this.handleSerial(responseData['serial'], responseData['expires']);
    this.handleData(responseData, req.responseURL, callback, method);
    this.nextRequest();
  },

  /**
   * Change payload object to encoded serial string
   * @param  obj payload object
   * @return string encoded serial
   * @memberOf API
   */
  toQueryString: function (obj) {
    var parts = [];

    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        parts.push(i + "=" + encodeURIComponent(obj[i]));
      }
    }
    return parts.join("&");

  },
  /**
   * redirect ti checkout page
   * @param  {string} url redirect URL
   * @param  {function} callback callback
   * @memberOf API
   */
  continueCheckoutWithURL: function (url, callback) {
    if (typeof window[API.decorateCallback] === "function") {
      debug(" <- Calling ", API.decorateCallback);
      var returnUrl = window[API.decorateCallback](url);

      try {
        if (returnUrl && returnUrl.length> 0 && returnUrl.indexOf(url) > -1) {
          url = returnUrl;
        }
        else {
          error("data-decorate-callback Must return correct url");
        }
      } catch(e) {
        error(e);
      }
    }

    if (API.checkoutMode === "popup" && ( (/\/popup-/).test(url) || (/\/embedded-/).test(url) ) )  {
      if (fscCleanCheckout === true) { API.continuousReset(); }
      Popup.drawFrame(url);
    } else {
      if (fscCleanCheckout === true) { API.continuousReset(); }
      window.location = url;
    }

    Helpers.runCallback(callback);
  }
};
;
/**
 * @name  Popup
 * @class Popup
 */
var Popup = {
  iframeId: 'fsc-popup-frame',
  inlineCheckoutContainerId: 'fsc-embedded-checkout-container',
  checkoutUpdatedByUser: false,

  // Checks the existence of session in url to open it in order
  // to get back after paypal payment  or any other actions
  checkURL: function () {
    var findings = /fsc:invoke:(session|complete)/g.exec(decodeURIComponent(document.location.search));
    var sessionPath;
    var lastSession;

    if (findings && findings.length > 0 && (findings[1] === 'session' || findings[1] === 'complete')) {
      lastSession = localStorage.getItem('fscLatestSession-' + API.storefront);

      if (lastSession) {
        if (findings[1] === 'complete') {
          sessionPath = lastSession + '/complete';
        } else {
          sessionPath = lastSession;
        }

        var interval = setInterval(function() {
          if (document.readyState === 'complete') {
            clearInterval(interval);
            window.addEventListener('message', Popup.listener, false);
            Popup.drawCanvas();
            Popup.drawFrame('https://' + API.storefront + '/session/' + sessionPath);
          }
        }, 100);
      }
    }
  },

  listener: function (event) {
    if (event.data.hasOwnProperty('fscPopupMessage') && event.data.fscPopupMessage.hasOwnProperty('action')) {
      var a = event.data.fscPopupMessage;
      if (a.action === 'close') {
        if (a.hasOwnProperty('orderReferences')) {
          //orderReferences are passed when order has completed
          Popup.popupClosedFunction(a.orderReferences);
          Popup.completed = true;
        } else {
          Popup.popupClosedFunction(null);
          Popup.completed = false;
        }
        // Popup.frame.close is true if it is an iFrame
        if (Popup.frame.close) {
          Popup.frame.close();
        }
      } else if (a.action === 'event' && a.hasOwnProperty('eventData')) { //event was designed for GA
        Popup.publishEvent(a.eventData);
      } else if (a.action === 'hook' && a.hasOwnProperty('hookData')) {
        Popup.hookEvent(a.hookData);
      } else if (a.action === 'scroll') {
        document.body.scrollTop = 0;
      } else if (a.action === 'resizeInlineContainer') {
        Popup.fsInlineCheckoutContainer = Popup.fsInlineCheckoutContainer || document.getElementById(Popup.inlineCheckoutContainerId);
        if (Popup.fsInlineCheckoutContainer && a.height) {
          Popup.fsInlineCheckoutContainer.style.height = a.height + 'px';
        }
      } else if (API.isInlineCheckout && a.action === 'updatesession') {
        Popup.checkoutUpdatedByUser = true;
        API.updateSession();
        API.loadProducts();
        API.flushChain();
      }
    }
  },

  popupClosedFunction: function (orderReferences) {
    if (typeof window[API.popupClosed] === 'function') {
      debug('Calling data-popup-closed callback');
      try {
        window[API.popupClosed](orderReferences);
      } catch(e) {
        error('Error in data-popup-closed callback', e);
      }
    }

    //this happens when session has been complete and we have purchased a product we remove local storage and also remove the sessionID stored within SBL.
    if (orderReferences) {
      localStorage.removeItem('fscLatestSession-' + API.storefront);
      localStorage.removeItem('fscSerial-' + API.storefront);
      API.sessionID = null;
    }

    debug('Popup Closed. Is there an order number?', orderReferences);
    Popup.destroy();
  },

  publishEvent: function (eventData) {
    debug('Event published', eventData);

    if (typeof window[API.popupEventReceived] === 'function') {
      debug(' <- Calling ', API.popupEventReceived);
      try {
        window[API.popupEventReceived](eventData);
      } catch(e) {
        debug(' -- Error in popup-event-received');
      }
    }
  },

  hookEvent: function (hookData) {
    debug('Hook published: ', hookData);

    if (typeof window[API.popupWebhookReceived] === 'function') {
      debug(' <- Calling ', API.popupWebhookReceived);
      try {
        window[API.popupWebhookReceived](hookData);
      } catch(e) {
        debug(' --Error in popup-webhook-received');
      }
    }
  },

  drawCanvas: function () {
    window.addEventListener('message', Popup.listener, false);

    // dont't add canvas, when inline
    if (!document.getElementById('fscCanvas') && !(API.isInlineCheckout)) {
      this.canvas = document.createElement('div');
      this.canvas.id = 'fscCanvas';
      this.canvas.className = "fs-popup-background";

      if (API.animateFader) { //TODO: get rid of these direct cross-module references
        this.canvas.style.transitionProperty = 'opacity';
        this.canvas.style.transitionDuration = '0.5s';
        this.canvas.style.opacity = '0';
      }

      document.body.appendChild(this.canvas);

      if (API.animateFader) { //TODO: get rid of these direct cross-module references
        setTimeout(function() {
          document.getElementById('fscCanvas').style.opacity = '1';
        }, 100);
      }
    }
    Spinner.attach();
    },

    drawFrame: function (url) {
      debug('Launching popup with URL', url);

      if (this.frame) {
        // revisit while working on inline checkout third party payment navigations
        Spinner.remove();
        if(!API.isInlineCheckout) {
          this.canvas.remove();
        }
        this.frame.location = url;
      } else if (!document.getElementById(Popup.iframeId)) {
        this.frame = document.createElement('iframe');
        this.frame.id = Popup.iframeId;
        this.frame.setAttribute('name', Popup.iframeId);
        this.frame.width = '100%';
        this.frame.height = '100%';
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          this.frame.style.position = 'absolute';
          document.body.scrollTop = 0;
      } else {
        this.frame.style.position = (API.isInlineCheckout) ? 'absolute' : 'fixed';
      }
      this.frame.style.top = '0';
      this.frame.style.left = '0 !important';
      this.frame.style.background = 'transparent';
      this.frame.style.zIndex = '1000000000000000';
      this.frame.frameBorder = 0;
      this.frame.setAttribute('background', 'transparent');
      if (url.length > 0) {
        this.frame.setAttribute('src', url);
      }
      if (document.getElementById('fscCanvas')) {
        document.getElementById('fscCanvas').appendChild(this.frame);
      } else if (API.isInlineCheckout) {
        var fsInlineCheckoutContainer = document.getElementById(Popup.inlineCheckoutContainerId);
        if (fsInlineCheckoutContainer) {
          window.requestAnimationFrame(function () {
            this.frame.scrolling = "no";
            // if we have skeleton, then skip this step
            if (!fsInlineCheckoutContainer.querySelector('#fsc-embedded-checkout-skeleton')) {
              fsInlineCheckoutContainer.innerHTML = '';
            }
            fsInlineCheckoutContainer.appendChild(this.frame);
          }.bind(this));
        } else {
          error('Make sure the inline checkout container is placed correctly');
        }
      } else {
        document.body.appendChild(this.frame);
      }

      if (!(API.isInlineCheckout)) {
        document.body.setAttribute('data-overflow', document.body.style.overflow);
        document.body.style.overflow = 'hidden';
      }
      this.frame.onload = function() {
        Spinner.remove();
        var skeletonIframe = document.querySelector('#fsc-embedded-checkout-skeleton');
        if (skeletonIframe) {
          requestAnimationFrame(function () {
            skeletonIframe.style.opacity = 0;
          });
        }
      };
    } else if (url.length > 0) {
      // this.frame is NOT defined here
      this.frame = document.getElementById(Popup.iframeId);
      if (this.frame) {
        this.frame.src = url;
      }
    }
  },

  destroy: function () {
    document.body.style.overflow = document.body.getAttribute('data-overflow');
    document.body.removeAttribute('data-overflow');
    Spinner.remove();
    window.removeEventListener('message', Popup.listener, false);

    if (this.blur) {
      this.blur.parentNode.removeChild(this.blur);
      this.blur = null;
    }

    if (Popup.canvas) {
      var timeout = 0;

      if (API.animateFader) { //TODO: get rid of these direct cross-module references
        Popup.canvas.style.opacity = '0';
        timeout = 500;
      }

      setTimeout(function() {
        if (Popup.frame && Popup.frame.parentNode) {
          Popup.frame.parentNode.removeChild(Popup.frame);
          Popup.frame = null;
        }

        if (Popup.canvas && Popup.canvas.parentNode) {
          Popup.canvas.parentNode.removeChild(Popup.canvas);
          Popup.canvas = null;
        }
      }, timeout);

      setTimeout(function() {
        if(API.continuous && !Popup.completed) {
          fastspring.builder.updateSession();
        } else {
          fastspring.builder.reset();
        }
      }, timeout);
    }
  }
};
;
/**
 * @name  F
 * @class F
 */
var F = {
  /**
   * Main function
   * @param input
   * @param callback
   * @memberOf F
   */
  push: function (input, callback) {
    if (!APIInitialized || fscMerging)  {
      fscSession = Helpers.merge(fscSession, input);
      if (callback) {
        debug('Unexpected callback sent to push');
      }
    } else {
      API.parseInput(input, callback);
    }
  },

  /**
   * Checkout function
   * @memberOf F
   *
   */
  checkout: function (session, callback) {
    if (session && session.length > 10) {
      F.push({'checkout': session}, callback);
    } else {
      F.push({'checkout': true}, callback);
    }
  },

  /**
   * Sets code value to 'coupon' property
   * @param {String} code
   * @param {function} callback callback
   * @memberOf F
   */
  promo: function (code, callback) {
    F.push({'coupon': code}, callback);
  },

  /**
   * Sets code value to 'postalcode' property
   * @param {String} code
   * @param {function} callback callback
   * @memberOf F
   */

  postalCode: function (code, callback) {
    F.push({'postalCode': code}, callback);
  },

  postalcode: function (code, callback) {
    F.push({'postalCode': code}, callback);
  },

  /**
   * Checks and applies tax exemption to the order
   * @param {String} taxId
   * @param {function} callback callback
   * @memberOf F
   */
  taxId: function (taxId, callback) {
      F.push({'taxId': taxId}, callback);
  },

  /**
   * Sets a flag, cartViewEnabled, to display cart view on popup.
   * @memberOf F
   */
  viewCart: function(callback) {
    F.push({'cartViewEnabled': true, 'checkout': true}, callback);
  },

  /**
   * Pre select a payment method
   * @param {string} paymentMethod
   * @param {function} callback callback
   * @memberOf F
   */
  payment: function (paymentMethod, callback) {
      F.push({'paymentMethod': paymentMethod, 'checkout': true}, callback);
  },

  /**
   * Updates product quantity
   * @param path
   * @param quantity
   * @param {function} callback callback
   * @memberOf F
   *
   */
  update: function (path, quantity, callback) {
    F.push({'products': [{'path': path,'quantity': parseInt(quantity, 10)}]}, callback);
  },

  /**
   * Removes product from cart
   * @param path
   * @param {function} callback callback
   * @memberOf F
   *
   */
  remove: function (path, callback) {
    F.push({'products': [{'path': path, 'quantity': 0}]}, callback);
  },

  /**
   * Updates with no quantity, default quantity is respected from Dashboard Product Page
   * @param path
   * @param {function} callback callback
   * @memberOf F
   *
   */
  add: function (path, callback) {
    F.update(path, null, callback);
  },

  /**
   * Sends payment contact data.
   * @param {object} recognize details
   * @param {function} callback callback
   * @memberOf F
   */
  recognize: function () {
    if (arguments.length > 0) {
      var callback = typeof arguments[arguments.length - 1] === 'function' && arguments[arguments.length].pop();
      var validKeys = ['firstName', 'lastName', 'email', 'company', 'addressLine1',
        'addressLine2', 'city', 'region', 'country', 'postalCode', 'phoneNumber'];
      var values = arguments[0];

      // backwards compatibility
      if (typeof values !== 'object') {
        values = {};
        values['email'] = arguments[0];
        values['firstName'] = arguments.length > 0 && arguments[1];
        values['lastName'] = arguments.length > 1 && arguments[2];
      }

      var payload = {'paymentContact': {}};
      for (var key in values) {
        if (values.hasOwnProperty(key) && ~validKeys.indexOf(key)) {
          payload.paymentContact[key] = values[key];
        }
      }

      F.push(payload, callback);
    }
  },

  recognizeRecipients: function() {
    if (arguments.length > 0) {
      var callback = typeof arguments[arguments.length - 1] === 'function' && arguments[arguments.length].pop();
      var validContactKeys = ['firstName', 'lastName', 'email', 'company', 'memo', 'phoneNumber'];
      var validAddressKeys = ['addressLine1', 'addressLine2', 'city', 'region', 'country', 'postalCode'];
      var validObj = ['address'];
      var values = arguments[0];

      var payload = {
        'recipient': {}
      };

      for (var key in values) {
        if (values.hasOwnProperty(key)) {
          if (~validContactKeys.indexOf(key)) {
            // Contact level
            payload.recipient[key] = values[key];
          } else if (~validObj.indexOf(key)) {
            // For now, address is only valid object field
            var objValues = values[key];
            payload.recipient[key] = {};
            for (var objKey in objValues) {
              if (objValues.hasOwnProperty(objKey) && ~validAddressKeys.indexOf(objKey)) {
                payload.recipient[key][objKey] = objValues[objKey];
              }
            }
          }
        }
      }

      F.push(payload, callback);
    }
  },

  /**
   * Sends reset: true
   * @memberOf F
   */
  reset: function (callback) {
    F.push({'reset': true}, callback);
  },

  /**
 * Sends updateSession: true
 * @memberOf F
 */
updateSession: function (callback) {
  F.push({'close': true}, callback);
},

  /**
   * Sends clean: true
   * @memberOf F
   */
  clean: function (callback) {
    F.push({'clean': true}, callback);
  },

  /**
   * Add payload to secure property and set secure key
   * @param {string} p payload
   * @param {string} k key
   * @param {function} callback callback
   * @memberOf F
   */
  secure: function (p, k, callback) {
    var s = {'secure': {'payload': p}};

    if (k) {
      s.secure.key = k;
    }

    F.push(s, callback);
  },

  /**
   * Authenticate with payload and key
   * @param {string} p payload
   * @param {string} k key
   * @param {function} callback callback
   * @memberOf F
   */
  authenticate: function (p, k, callback) {
    var s = {'authenticate': {'payload': p}};

    if (k) {
      s.authenticate.key = k;
    }

    F.push(s, callback);
  },

  /**
   * Set tags
   * @param {string} key
   * @param {string} value
   * @param {function} callback callback
   * @memberOf F
   */
  tag: function (key, value, callback) {
    var s = {'tags': {}};
    if (typeof key === 'object') {
      for (var k in key) {
          if (key.hasOwnProperty(k)) {
              s.tags[k] = key[k];
          }
      }
    } else {
      s.tags[key] = value;
    }
    F.push(s, callback);
  },

  /**
   * Set country
   * @param {string} country
   * @param {function} callback callback
   * @memberOf F
   */
  country: function (country, callback) {
    F.push({'country': country}, callback);
  },

  /**
   * Set language
   * @param {string} language
   * @param {function} callback callback
   * @memberOf F
   */
  language: function (language, callback) {
    F.push({'language': language}, callback);

  },

  _uninstall: function () {
    API.uninstall();
    Markup.uninstall();
    Popup.destroy();

    var existing = document.querySelector('script#fsc-api');
    existing.parentNode.removeChild(existing);
    delete window._f;
    delete window.fastspring;
  },

  // @deprecated
  Recompile: function (template, filter, callback) {
    Markup.compileHandlebarsTemplate(template, filter, callback);
  }
};

// backwards compatibility
['Add', 'Push', 'Authenticate', 'Checkout', 'Clean', 'Country', 'Language', 'Tag', 'Secure', 'Remove', 'Promo', 'Update', 'Recognize', 'Reset', 'PostalCode'].forEach(function(fn) {
  var fnl = fn.toLowerCase();
  Object.defineProperty(F, fn, { enumerable: false, get: function() {
    console.log("Warning: '" + fn + "' is deprecated, please use '" + fnl + "' instead");
    return F[fnl];
  }});
});
;
/**
 * @name  Markup
 * @class Markup
 */
var Markup = {

  init: function() {

    this.isDynaCart = false;
    this.ready = true;

    this.listDriver = fscContainer.getAttribute("data-storefront").split(".")[0];

    //are there any handlebars template on the page?
    this.$fscDynaContainers = document.querySelectorAll("[data-fsc-items-container]");
    this.dynaListObjs = [];
    if (typeof this.$fscDynaContainers[0] !== "undefined") {
      this.isDynaCart = true;

      var filterList = "";
      var containerName = "";
      var dynaLength = this.$fscDynaContainers.length;

      for (var i = 0; i < dynaLength; i++) {
        containerName = this.$fscDynaContainers[i].getAttribute("data-fsc-items-container");
        filterList = this.$fscDynaContainers[i].getAttribute("data-fsc-filter");
        this.dynaListObjs.push({'containerName': containerName, 'filterList': filterList});

      }
    }

  },


  /**
   * setData  function where the data enters Markup
   * @param data
   * @memberOf Markup
   */
  setData: function (data) {
    debug("Received data for Markup:",data);
    this.data = data;
  },

  /**
   * Loads library if needed in Markup.process
   * @param {String} sId - Script ID
   * @param {String} fileUrl - handlebars lib URL
   * @param {Function} callback - callback to execute when handlebars is loaded
   * @memberOf Markup
   */
  loadHandlebarsLib: function(sId, fileUrl, callback) {
      if (window.Handlebars) {
          callback();
          return;
      }
      var oHead = document.getElementsByTagName('head').item(0);
      var oScript = document.createElement('script');
      oScript.language = 'javascript';
      oScript.type = 'text/javascript';
      oScript.id = sId;
      oScript.defer = false;
      oScript.src = fileUrl;
      if (callback) {
        oScript.onload = callback;
      }
      oScript.onerror = function() {
          error( 'XML request error: ' + xhr.statusText + ' (' + xhr.status + ')');
          callback();
      };
      oHead.appendChild(oScript);
  },


  /**
   * This function helps to triger handlebars compilation.
   Should be used if filter value changes dynamically
   * @param  {string} templateId - id to be used in [data-fsc-template-for=''] attribute
   * @param  {string} filter     - filter to be applied during compilation. For ex. "path='productPath'";
   */
  compileHandlebarsTemplate: function(templateId, filter) {
    if (typeof filter === 'object') {
      var output = [];

      for (var parameter in filter) {
        if (filter.hasOwnProperty(parameter)) {
          output.push(parameter + "='" + filter[parameter] + "'");
        }
      }

      filter = output.join(';');
    }

    var source;
    for (var i = 0; i < this.dynaListObjs.length; i++) {
      if (this.dynaListObjs[i].containerName === templateId) {
        source = document.querySelector("[data-fsc-template-for='" + templateId + "']");
        if (source == null) { return; }

        this.dynaListObjs[i].filterList = filter;

        this.handlebarTemplates[i] = Handlebars.compile(source.innerHTML);
        this.parseAndPut(this.data);
        this.afterMarkup();
        break;
      }
    }
  },
  /**
   * process function where all data parsing, process, and markup is 'driven' from including both Static and Dynamic
   * @memberOf Markup
   */
  process: function () {
    if (this.ready !== true || !this.data) {
      return;
    }

    //Todo: remove this when fixed on backend
    this.data.groups.forEach(function(group) {
      group.items.forEach(function(item) {
        if (item.hasOwnProperty('description') && item.description.hasOwnProperty('action') && item.description.action) {
          item.description.action = item.description.action.replace('<p>', '').replace('</p>','');
        }
      });
    });
    //****************************************************************
    if (typeof window[API.beforeMarkup] === "function") {
      debug(" <- Calling ", API.beforeMarkup);
      try{
        window[API.beforeMarkup]();
      }
      catch(e) { error(" --Error in data-before-markup-callback"); }
    }

    debug("Doing markup with data:", this.data);

    if (this.isDynaCart) {
      this.loadHandlebarsLib("handlebarScriptElm", "https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/3.0.1/handlebars.min.js",  function handlebarsCallback() {

        if (typeof window[API.markupHelpers] === "function") {
          debug(" <- Calling ", API.markupHelpers);
          try {
            window[API.markupHelpers]();
          }
          catch(e) { error(" --Error in data-after-markup-callback", e); }
        }


        this.handlebarTemplates = [];
        for (var i = 0; i < this.dynaListObjs.length; i++) {
          var source = document.querySelector("[data-fsc-template-for='" + this.dynaListObjs[i].containerName + "']");
          if (source !== null) {
            this.handlebarTemplates[i] = Handlebars.compile(source.innerHTML);
          }
        }

        // parse the data and put values to places.
        this.parseAndPut(this.data);
        this.afterMarkup();

      }.bind(this));
    }
    else {
      // parse the data and put values to places.
      this.parseAndPut(this.data);
      this.afterMarkup();
    }
  },

  afterMarkup: function () {
    if (typeof window[API.afterMarkup] === "function") {
      debug(" <- Calling ", API.afterMarkup);
      try {
        window[API.afterMarkup]();
      }
      catch(e) { error(" --Error in data-after-markup-callback", e);}
    }
  },

  /**
   * Add event handlers for actions available on product
   * @memberOf Markup
   */
  addEventHandlers: function () {
    // handler functions
    // These functions are used in Markup.Multiple to call the
    // corresponding function of Markup in case if the name of a function and action differs or to map many functions into one
    this.functions = {};

    this.functions.preventDefault = function (e) {
      e.preventDefault();
    };

    this.functions.Add = function (e) {
      Markup.Add(e);
    };

    this.functions.Update = function (e) {
      Markup.Update(e);
    };

    this.functions.Remove = function (e) {
      Markup.Remove(e);
    };

    this.functions.Promocode = function (e) {
      Markup.Promo(e);
    };

    this.functions.TaxId = function (e) {
        Markup.TaxId(e);
    };

    this.functions.Recognize = function (e) {
      Markup.Recognize(e);
    };

    this.functions.Reset = function (e) {
      Markup.Reset(e);
    };

    this.functions.Clean = function (e) {
      Markup.Clean(e);
    };

    this.functions.Checkout =  function (e) {
      Markup.Checkout(e);
    };

    this.functions.PaypalCheckout =  function (e) {
        Markup.PaypalCheckout(e);
    };

    this.functions.autoUpdate = function () {
      setTimeout(function(){
        Markup.Update(this);
      }.bind(this), 1500);
    };

    this.functions.Replace = function (e) {
      Markup.Add(e);
    };

    this.functions.Multiple = function () {
      Markup.Multiple(this);
    };

    this.functions.PostalCode = function (e) {
      Markup.PostalCode(e);
    };

    this.functions.ViewCart = function (e) {
      Markup.ViewCart(e);
    };

    this.unbinders = [];
    var clickSelector = document.querySelectorAll(
      '[data-fsc-action=Add],' +
      '[data-fsc-action=Update],' +
      '[data-fsc-action=Remove], ' +
      '[data-fsc-action=Replace],' +
      '[data-fsc-action=Promocode],' +
      '[data-fsc-action=Reset],' +
      '[data-fsc-action=Recognize],' +
      '[data-fsc-action=PostalCode],' +
      "[data-fsc-action*=',']," +
      '[data-fsc-action=Checkout],'+
      '[data-fsc-action=PaypalCheckout],'+
      '[data-fsc-action=TaxId],' +
      '[data-fsc-action=ViewCart]');
    for(var i=0; i<clickSelector.length; i++) {
      var e = clickSelector[i].cloneNode(true);
      var tag = e.tagName.toLowerCase();
      var changeTypes = ['checkbox','radio', 'search', 'text'];

      if (tag === "a") {
        if (e.addEventListener) {
          e.addEventListener('click', this.functions.Multiple, false);
          e.addEventListener('click', this.functions.preventDefault, false);
          this.unbinders.push({element: e, action: 'click', fn: this.functions.Multiple});
          this.unbinders.push({element: e, action: 'click', fn: this.functions.preventDefault});
        } else {
          e.attachEvent('click', this.functions.Multiple);
          e.attachEvent('click', this.functions.preventDefault);
        }
      } else if (tag === "select" || tag === "textarea" || (tag === "input" && changeTypes.indexOf(e.type.toLowerCase()) > -1)) {
        if (e.addEventListener) {
          e.addEventListener('change', this.functions.Multiple, false);
          this.unbinders.push({element: e, action: 'change', fn: this.functions.Multiple});
        } else {
          e.attachEvent('change', this.functions.Multiple);
        }
      } else {
        if (e.addEventListener) {
          e.addEventListener('click', this.functions.Multiple, false);
          this.unbinders.push({element: e, action: 'click', fn: this.functions.Multiple});
        } else {
          e.attachEvent('click', this.functions.Multiple);
        }
      }

      clickSelector[i].parentNode.replaceChild(e, clickSelector[i]);
    }
  },

  uninstall: function _unbind() {
    this.unbinders.forEach(function (e) {
      e.element.removeEventListener(e.action, e.fn);
    });
  },

  /**
   * Checkout with session param or without
   * @memberOf Markup
   */
  Checkout: function () {
    var session = Markup.findValue('session');
    if (session.length < 10) { F.checkout(); }
    else { F.checkout(session); }
  },

  /**
   * Checkout current session with paypal as payment method
   * @memberOf Markup
   */
  PaypalCheckout: function () {
      F.payment("paypal");
  },

  /**
   * Apply promocode - Fist need to look for data-fsc-promocode-value else find promocode in markup
   * @memberOf Markup
   */
  Promo: function () {
    var code = Markup.findValue('promocode');
    F.promo(code);
  },

  /**
    *Apply Postal Code - Look for data-fsc-postalcode-value else find postalCode in markup
    *@memberOf Markup
    */
  PostalCode: function() {
    var postalCode = Markup.findValue('postalcode');
    F.postalCode(postalCode);
  },

  /**
   * Apply tax exemption ID - Looks up the data-fsc-taxid and passes the value set in it to verify exemption
   * @memberOf Markup
   */
  TaxId: function () {
      var taxId = Markup.findValue('taxid');
      F.taxId(taxId);
  },

  ViewCart: function() {
    F.viewCart();
  },

  /**
   * Update quantity
   * @param elem element which needs to be updated
   * @memberOf Markup
   */
  Update: function (elem) {
    var quantity;
    var product = elem.getAttribute("data-fsc-item-path-value");
    var quantityValue = elem.getAttribute("data-fsc-item-quantity-value");
    var quantitySrc = elem.getAttribute("data-fsc-quantity-src");
    var quantityElement;
    var quantitySrcValue;
    var tag;

    //quantity 0 if checkbox unchecked
    if (elem.tagName.toLowerCase() === 'input' && elem.type.toLowerCase() === 'checkbox' && !elem.checked) {
      quantity = 0;
    } else {
      //get from attribute if set
      if (quantityValue !== null && quantityValue > 0) {
        quantity = quantityValue;
      }
      // //get from source element quantity
      else if (quantitySrc !== null && quantitySrc.length > 0) {
        quantityElement = document.getElementById(quantitySrc);
        quantitySrcValue = quantityElement.getAttribute('data-fsc-item-quantity-value');
        if (quantityElement !== null) {
          tag = quantityElement.tagName.toLowerCase();
          switch(true) {
            case tag === 'input' && quantityElement.type.toLowerCase() !== 'checkbox' || tag === 'select':
              quantity = quantityElement.value;
              break;
            case tag === 'input' && quantityElement.type.toLowerCase() === 'checkbox' && !quantityElement.checked:
              quantity = 0;
              break;
            case tag === 'input' && quantityElement.type.toLowerCase() === 'checkbox' && quantityElement.checked:
              quantity = 1;
              break;
            case quantitySrcValue !== 'null' && quantitySrcValue > 0 :
              quantity = quantitySrcValue;
              break;
            default:
              quantity = Markup.findValue("item-quantity", product);
          }
        }
      } else {
        //No need to look for all item quantity values if select element value was changed
        if ( elem.hasOwnProperty('selectedIndex') && elem[elem.selectedIndex].value > -1  ) {
          quantity = elem[elem.selectedIndex].value;
        }
        else {
          quantity = Markup.findValue("item-quantity", product);
        }
      }

      quantity = quantity || 1;
    }

    /*
     var lineItemContainerSelected = "[data-fsc-cart-item-template-selected][data-fsc-item-path='" + product + "']";
     var lineItemContainer = "[data-fsc-cart-item-template][data-fsc-item-path='" + product + "']";


     if (document.querySelector(lineItemContainer) === null) {
     lineItemContainer = lineItemContainerSelected;
     }

     // If element clicked is within the dynamic cart line item,
     // then use that line item quantity for update
     if (document.querySelector(lineItemContainer) && document.querySelector(lineItemContainer).contains(elem)) {
     var selector = lineItemContainer + " [data-fsc-item-quantity-value]";
     if (document.querySelector(selector) !== null) {
     quantity = document.querySelector(selector).value;
     }
     }
     */

    F.update(product, quantity);
  },
  /**
   * Add product to cart
   * @param e element to add
   * @memberOf Markup
   */
  Add: function (e) {
    var product = e.getAttribute("data-fsc-item-path-value");
    F.add(product);
  },
  /**
   * Remove from cart
   * @param e element to remove
   * @memberOf Markup
   */
  Remove: function (e) {
    var product = e.getAttribute("data-fsc-item-path-value");
    F.update(product, 0);
  },
  /**
   * Update with driver product
   * @param e element to replace
   * @memberOf Markup
   */
  Replace: function (e) {
    var driverProduct =  e.getAttribute("data-fsc-driver-item-path-value");
    F.update(driverProduct, 0);
  },

  /**
   * @memberOf Markup
   */
  Recognize: function () {
    var firstname = Markup.findValue('firstname');
    var lastname = Markup.findValue('lastname');
    var email = Markup.findValue('email');

    F.recognize(email,firstname,lastname);
  },

  /**
   * @param e element to reset
   * @memberOf Markup
   */
  Reset: function (e) {
    F.reset();
  },

  /**
   * @param e element to updateSession
   * @memberOf Markup
   */
  UpdateSession: function (e) {
    F.updateSession();
  },

  /**
   * @memberOf Markup
   */
  Clean: function () {
    F.clean();
  },

  /**
   * This function will be called if any of event handlers are triggered.
   * It's purpose is to Multiply and call corresponding functions from data-fsc-action attributes
   * @param elem
   * @memberOf Markup
   */
  Multiple: function (elem) {

    var functions = this.functions;
    fscMerging = true;
    var elementActions = elem.getAttribute("data-fsc-action");
    if (elementActions.indexOf(',') > -1) {
      elementActions.split(",").forEach(function (a) {
        a = a.trim();
        if (functions.hasOwnProperty(a)) {
          functions[a](elem);
        }
      });

    } else {

      elementActions = elementActions.trim();
      if (functions.hasOwnProperty(elementActions)) {
        functions[elementActions](elem);
      }
    }

    fscMerging = false;
    API.parseInput(fscSession);
  },


  // Does values[0] always grab
  // the correct value in the case where
  // querySelectorAll() returns array of elements?
  /**
   * find if given tag exists on the page and return it's value
   * @memberOf Markup
   * @param  tag    [description]
   * @param   ofitem [description]
   */
  findValue: function (tag, ofitem) {
    var values;
    var tagValue;
    if (!ofitem) {
      values = document.querySelectorAll('[data-fsc-' + tag + '-value]');
    } else {
      values = document.querySelectorAll("[data-fsc-" + tag + "-value][data-fsc-item-path-value='" + ofitem + "']");
    }

    if (typeof values[0] !== "undefined") {
      tagValue = values[0];
      if (tagValue.value) {
        return tagValue.value;
      }

      if (tagValue.innerHTML) {
        return tagValue.innerHTML;
      }
    }

    return '';
  },
  /**
   * Parse and put data
   * @param   data
   * @memberOf Markup
   */
  parseAndPut: function (data) {
    // preserve this as obj in inner function
    var obj = this;

    // is order empty?
    if (data['selections'] === false) {
      fscEmptyOrder = true;
    } else {
      fscEmptyOrder = false;
    }

    //Products (Items)
    var retrievedItemsUnaltered = this.parseProducts(data);
    var retrievedItemsDyna = this.parseProductsDyna(data);

    var retrievedDynaOrderLevel = this.parseDynaOrderLevel(data);
    this.processDynaOrderLists(retrievedItemsDyna, retrievedItemsUnaltered, retrievedDynaOrderLevel);

    if (retrievedItemsUnaltered.length > 0) {
      debug("Products:", retrievedItemsUnaltered);
      this.processProducts(retrievedItemsUnaltered);

    } else {
      debug('No products found in response');
    }

    //Order Level Items

    var retrievedOrderLevel = this.parseOrderLevel(data);

    if (retrievedOrderLevel !== false) {
      debug("Top level items:", retrievedOrderLevel);
      this.processOrderLevelItems(retrievedOrderLevel);
    } else {
      debug('No top level items found in response');
    }

    this.addEventHandlers();
  },
  /**
   * Parse Products ]
   * @param  data [description]
   * @memberOf Markup
   */
  parseProducts: function (data) {
    var obj = this;
    var retrievedItems = [];

    // TODO make retrievedItems an array or groups bundles and products by removing ['items']
    for (var i = 0; i < data.groups.length; i++) {
      retrievedItems = retrievedItems.concat(data.groups[i]);
    }

    Markup.myArray = retrievedItems;

    if (retrievedItems.length > 0) {
      return retrievedItems;
    } else {
      return false;
    }
  },

  /**
   * parseProductsDyna Creates array of objects into storefront and offers list
   * @param  data response data from server
   * @return  storeFrontLists array of lists with api-lists and offer lists
   * @memberOf Markup
   */
  parseProductsDyna: function (data) {
    var PRODUCT_GROUP_TYPES = {
      storefront: 'storefront',
      offers: 'offers'
    };

    var ProductGroup = function (options) {
      this.raw = options.raw;
      this.setListType(this.raw.driver);
    };

    /**
     * ProductGroup.prototype.setListType - decides if List is api (driver is storefront),
     *  or offers which need to be weaved below parent product
     * @param  {string} driver - is it an product offer or storefront (api list)
     *
     */
    ProductGroup.prototype.setListType = function(driver) {
      if (driver === undefined){
        // handle default case
        this.listType = PRODUCT_GROUP_TYPES.storefront;
      } else {
        if (driver === Markup.listDriver || driver.indexOf(Markup.listDriver) > -1){
          this.listType = PRODUCT_GROUP_TYPES.storefront;
        } else if (driver !== Markup.listDriver){
          this.listType = PRODUCT_GROUP_TYPES.offers;
        }
      }
    };

    /**
     * ProductGroup.prototype.isStorefront - is it a storefront list?
     *
     * @return {boolean}  true or false
     */
    ProductGroup.prototype.isStorefront = function() {
      return (this.listType === PRODUCT_GROUP_TYPES.storefront);
    };

    /**
     * ProductGroup.prototype.isOffer - is it an offer list?
     *
     * @return {boolean}  true or false
     *
     */
    ProductGroup.prototype.isOffer = function() {
      return (this.listType === PRODUCT_GROUP_TYPES.offers);
    };

    var storeFrontLists = data.groups.filter(function(group) {
      var productGroup = new ProductGroup({ 'raw' : group });
      return productGroup.isStorefront();
    });

    var offersLists = data.groups.filter(function(group) {
      var productGroup = new ProductGroup({ 'raw' : group });
      return productGroup.isOffer();
    });

    // weave offer list below driver product if storeFrontLists are selections == true
    var offersStandAlone = true;
    // for (var i = 0; i < storeFrontLists.length; i++) {
    //     for (var j = 0; j < storeFrontLists[i].items.length; j++) {
    //         for (var k = 0; k < offersLists.length; k++) {
    //             if (offersLists[k].driver === storeFrontLists[i].items[j].path && storeFrontLists[i].items[j].selected === true) {
    //                 storeFrontLists[i].items[j].groups = storeFrontLists[i].items[j].groups.concat(offersLists[k]);
    //                 offersStandAlone = false;
    //             }
    //         }
    //     }
    // }

    if (offersStandAlone) {
      storeFrontLists = storeFrontLists.concat(offersLists);
    }

    if (storeFrontLists.length > 0) {
      return storeFrontLists;
    } else {
      return false;
    }
  },

  /**
   * applyDynaFilter - if data-fsc-filter="selected=true;etc;etc" this function will filter group
   *
   * @param  {array} group   each group listDriver
   * @param  {object} filter  contains  filter(s) and template container name
   * @return {array}  groupItems  returns filtered list of product objects
   * @memberOf Markup
   */
  applyDynaFilter: function(group, filter) {
    var filters = {};
    var groupItems = [];
    //var groupFilterCount = filter.filterList.split(";").length - 1;
    var retValue;
    var condition;
    var keyToCompare;

    if (filter.filterList !== null) {
      filter.filterList.split(";").forEach(function(eachFilter, j) {
        //filter condition - filter expression which to evaluate
        condition = eachFilter.split("=");
        filters[condition[0]] = condition[1];
      });
      // is there any part of this condition(s) === false?
      // if so return false
      groupItems = group.filter(function(product) {
        retValue = true;
        for (var key in filters) {
          if (filters.hasOwnProperty(key)) {
            if (typeof filters[key] === 'undefined' || filters[key] === null) {
              return true;
            }

            keyToCompare = filters[key];
            if (filters[key] === "true") {
              keyToCompare = true;
            }
            if (filters[key] === "false") {
              keyToCompare = false;
            }

            //for product.path = 'productName' -> check if that's string or value by starting symbol
            if (filters[key][0] === '\'') {
              var length = filters[key].length;
              keyToCompare = filters[key].substring(1, length - 1);
            }
            else if (typeof window[keyToCompare] !== 'undefined') {
              keyToCompare = window[keyToCompare];
            }

            if (product[key] !== keyToCompare) {
              retValue = false;
              break;
            }
          }
        }

        return retValue;
      });

    }
    return groupItems;
  },

  /**
   * Parse data for all Order level data and which ends up in processOrderLevelItems() for Static Markup
   * @param  data
   * @memberOf Markup
   */
  parseOrderLevel: function (data) {
    var retrievedOrderItems = [];
    for (var prop in data) {
      if (data.hasOwnProperty(prop) && prop !== 'groups') {
        retrievedOrderItems = retrievedOrderItems.concat({key: prop, value: data[prop]});
      }
    }

    if (retrievedOrderItems.length > 0) {
      return retrievedOrderItems;
    } else {
      return false;
    }
  },

  /**
   * Process data for all Order level items and send data to processOrderLevelItem() for Static Markup
   * @param  retrievedOrderLevel
   * @memberOf Markup
   */
  processOrderLevelItems: function (retrievedOrderLevel) {
    var obj = this;

    if (!Array.isArray(retrievedOrderLevel)) {
      debug('Unexpected format of data');
    } else {
      retrievedOrderLevel.forEach( function(orderLevelItem){
        obj.processOrderLevelItem(orderLevelItem['key'], orderLevelItem['value']);
      });
    }
  },

  /**
   * Process data for each each Order level item and send each element data to processPropToElem() for Static Markup
   * @memberOf Markup
   */
  processOrderLevelItem: function (property, propertyValue) {
    var obj = this;
    var hideSelector = "[data-fsc-checkout-hideempty]";
    var i;

    if (property === "taxExemptionAllowed") {
        var allTaxSmartDisplays = document.querySelectorAll('[data-fsc-smartdisplay][data-fsc-order-taxid]');

        Array.prototype.forEach.call(allTaxSmartDisplays, function (smartDisplayElement) {
            if (propertyValue){
                smartDisplayElement.style.display = 'block';
            } else {
                smartDisplayElement.style.display = 'none';
            }
        });
    }

    if (property === "availablePaymentMethods") {
        var allPaypalSmartDisplays = document.querySelectorAll('[data-fsc-smartdisplay][data-fsc-order-paypal-available]');

        Array.prototype.forEach.call(allPaypalSmartDisplays, function (smartDisplayElement) {
            if (propertyValue.indexOf('paypal') !== -1) {
                smartDisplayElement.style.display = 'block';
            } else {
                smartDisplayElement.style.display = 'none';
            }
        });
    }

    if (property === "selections") {
      var allControlableItems = document.querySelectorAll(
        '[data-fsc-selections-smartselect],' +
        '[data-fsc-selections-smartdisplay],' +
        '[data-fsc-selections-smartdisplay-inverse], ' +
        '[data-fsc-selections-hideifselections],' +
        '[data-fsc-selections-showifselections],' +
        '[data-fsc-selections-hideifnoselections],' +
        '[data-fsc-selections-showifnoselections],' +
        '[data-fsc-selections-smartdisable],' +
        '[data-fsc-selections-smartdisable-inverse],' +
        '[data-fsc-selections-disableifselections],' +
        '[data-fsc-selections-disableifnoselectios],' +
        '[data-fsc-selections-enableifselections],' +
        '[data-fsc-selections-enableifnoselections]');

      if (allControlableItems !== null) {

        for (i = 0; i < allControlableItems.length; i++) {
          var e = allControlableItems[i];

          if (e.hasAttribute('data-fsc-selections-smartselect') && (e.tagName === 'INPUT' && (e.type.toLowerCase() === 'checkbox' || e.type.toLowerCase() === 'radio'))) {
            if (propertyValue === true) { e.checked = true; }
            else { e.checked = false; }
          }

          if (e.hasAttribute('data-fsc-selections-smartdisplay')) {
            if (propertyValue === true) { e.style.display = 'block'; }
            else { e.style.display = 'none'; }
          }

          if (e.hasAttribute('data-fsc-selections-smartdisplay-inverse')) {
            if (propertyValue === true) { e.style.display = 'none';}
            else { e.style.display = 'block'; }
          }

          if (e.hasAttribute('data-fsc-selections-hideifselections')) {
            if (propertyValue === true) { e.style.display = 'none';}
          }

          if (e.hasAttribute('data-fsc-selections-showifselections')) {
            if (propertyValue === true) { e.style.display = 'block';}
          }

          if (e.hasAttribute('data-fsc-selections-hideifnoselections')) {
            if (propertyValue === false) { e.style.display = 'none'; }
          }

          if (e.hasAttribute('data-fsc-selections-showifnoselections')) {
            if (propertyValue === false) { e.style.display = 'block'; }
          }

          if (e.hasAttribute('data-fsc-selections-smartdisable')) {
            if (propertyValue === false) { e.setAttribute("disabled", "disabled"); }
            else { e.removeAttribute("disabled"); }
          }

          if (e.hasAttribute('data-fsc-selections-smartdisable-inverse')) {
            if (propertyValue === true) { e.setAttribute("disabled", "disabled"); }
            else { e.removeAttribute("disabled"); }
          }

          if (e.hasAttribute('data-fsc-selections-disableifselections')) {
            if (propertyValue === true) { e.setAttribute("disabled", "disabled"); }
          }

          if (e.hasAttribute('data-fsc-selections-disableifnoselectios')) {
            if (propertyValue === false) { e.setAttribute("disabled", "disabled"); }
          }

          if (e.hasAttribute('data-fsc-selections-enableifselections')) {
            if (propertyValue === true) { e.removeAttribute("disabled"); }
          }

          if (e.hasAttribute('data-fsc-selections-enableifnoselections')) {
            if (propertyValue === false) { e.removeAttribute("disabled"); }
          }
        }
      }
    }

    if (property === "selections" && propertyValue === false) {
      var hideElements = document.querySelectorAll(hideSelector);
      if (hideElements !== null) {
        for (i = 0; i < hideElements.length; i++) {
          if (hideElements[i].tagName.toLowerCase() === "a") {
            hideElements[i].style.display = "none";
          } else if (hideElements[i].tagName.toLowerCase() === "div"){
            hideElements[i].style.display = "none";
          } else {
            hideElements[i].setAttribute("disabled", "disabled");
          }
        }
      }
    }

    if (property === "selections" && propertyValue === true) {
      var showElements = document.querySelectorAll(hideSelector);
      if (showElements !== null) {
        for (i = 0; i < showElements.length; i++) {
          if (showElements[i].tagName.toLowerCase() === "a") {
            showElements[i].style.display = "inline";
          } else if (showElements[i].tagName.toLowerCase() === "div"){
            showElements[i].style.display = "block";
          } else {
            showElements[i].removeAttribute("disabled");
          }
        }
      }
    }

    property = this.mapProperty(property);
    propertyValue = this.mapValue(property, propertyValue);

    debug('Processing top order level item:', property, propertyValue);

    var selector = "[data-fsc-order-" + property + "]";
    var elements = document.querySelectorAll(selector);

    for (i = 0; i < elements.length; i++) {
      obj.processPropToElem(property, propertyValue, elements[i], 'data-fsc-order-' + property);
    }
  },
  /**
   * Needed because sometimes our internal property name differs from what arrives in JSON
   * @param  {string} property
   * @return {string} value
   * @memberOf Markup
   */
  mapProperty: function (property) {
    var propertiesMap = {};
    propertiesMap['coupons'] = 'promocode';
    propertiesMap['description-action'] = 'calltoaction';

    if (propertiesMap.hasOwnProperty(property)) {
      property = propertiesMap[property];
    }

    return property;
  },
  /**
   * map Value
   * @param   property [description]
   * @param   value    [description]
   * @memberOf Markup
   */
  mapValue: function (property,value) {
    if (property === 'promocode') {
      value = value[0] || '';
    }

    return value;
  },

  // Parse data for all Order level data and which ends up in processOrderLevelItems() for Static Markup


  /**
   * parseDynaOrderLevel - remove products groups and return Order level info only
   *
   * @param  {object} data   response data from server
   * @return {array} retrievedDynaOrderItems   array which holds object of order level fields
   * @memberOf Markup
   */
  parseDynaOrderLevel: function (data) {
    var retrievedDynaOrderItems = [];
    retrievedDynaOrderItems.push(data);

    if (retrievedDynaOrderItems.length > 0) {
      return retrievedDynaOrderItems;
    } else {
      return false;
    }
  },

  /**
   * processDynaOrderLists - Go thru all lists, adds future (subscription) dates via futureAddProps(),
   * and applyDynaFilter() if container has data-fsc-filter="...". Then loops thru all Dynamic list templates
   * sending each one to displayDynaOrderLists, along with orderlevel data
   *
   * @param  {array} retrievedItems           filtered and future props added lists
   * @param  {array} retrievedItemsUnaltered  unfiltered and no future props added lists
   * @param  {array} retrievedOrderLevel      array which holds object of order level fields
   * @memberOf Markup
   */
  processDynaOrderLists: function(retrievedItems, retrievedItemsUnaltered, retrievedOrderLevel) {
    // filter for dynamic markup api-lists and additional lists
    var thisObj = this;

    function addProps(productData) {
      if (productData.future !== undefined) {
        thisObj.futureAddProps(productData);
      }
    }

    if (!Array.isArray(retrievedItems)) {
      debug('not an array of products so cannot markup');
    } else {

      // roll thru all products in the array
      // weave in subscription info
      var retrievedLength = retrievedItems.length;
      for (var i = 0; i < retrievedLength;  i++) {
        retrievedItems[i].items.forEach(addProps); // forEach end
      }

      var dynaLength = this.dynaListObjs.length;
      var tempRetrievedItems = {};
      for ( i = 0; i < dynaLength; i++) {

        for (var j = 0; j < retrievedLength; j++) {
          if (this.dynaListObjs[i].filterList !== null) {
            //copy without modifying reference object
            tempRetrievedItems[j] = Object.create(retrievedItems[j]);
            tempRetrievedItems[j].items = this.applyDynaFilter(tempRetrievedItems[j].items, this.dynaListObjs[i]);
          }
        }

        this.displayDynaOrderLists({
          items: tempRetrievedItems,
          groups: retrievedItemsUnaltered,
          //allProductsGroups: retrievedItemsUnaltered,
          order: retrievedOrderLevel
        }, this.handlebarTemplates[i], this.dynaListObjs[i].containerName);
      }
    }
  },

  /**
   * Process data for all Products(Items) and send data to processProduct() for Static Markup and data to displayCartLineItems() for Dynamic Markup
   * @memberOf Markup
   */
  processProducts: function (retrievedItems) {
    var thisObj = this;
    function processProductFunction(productData) {
      var productPath = productData.path;
      if (productData.future !== undefined) {
        thisObj.futureAddProps(productData);
      }
      thisObj.processProduct(productData, productPath);
    }

    if (!Array.isArray(retrievedItems)) {
      debug('not an array of products so cannot markup');
    } else {

      // roll thru all products in the array
      var retrievedLength = retrievedItems.length;
      for (var i = 0; i < retrievedLength; i++) {
        retrievedItems[i].items.forEach(processProductFunction);
      }
    }
  },

  // future - this is a subscription product
  // logic to add extra properties to productData['future'] for markup
  /**
   * futureAddProps - if productData['future'] exists, then produce begin and end dates
   * and put in json for display purposes
   *
   * @param  {object} productData    each product in list
   * @memberOf Markup
   */
  futureAddProps: function (productData) {
    var beginsDate;
    var endsDate;
    var beginsDateLocale;
    var day;
    var month;
    var year;
    var monthName;

    if (productData.future.beginsValue !== undefined) {
      beginsDate = new Date(productData.future.beginsValue);
      endsDate = new Date(productData.future.beginsValue);
    } else {
      beginsDate = new Date();
      endsDate = new Date();
    }

    beginsDateLocale = beginsDate.toLocaleDateString();
    //set end date according to interval Values
    // productData['future']['intervalLength'] = 3 =>  If subscription renews every 3 months
    // productData['future']['discountDurationLength'] = 1 =>  1 period = 3 month
    if (productData.future.intervalUnit === 'week') {
      endsDate.setDate(endsDate.getDate() +  productData.future.discountDurationLength * productData.future.intervalLength * 7);
    }
    if (productData.future.intervalUnit === 'month') {
      endsDate.setMonth(endsDate.getMonth() +  productData.future.discountDurationLength * productData.future.intervalLength);
    }
    if (productData.future.intervalUnit === 'year') {
      endsDate.setFullYear(endsDate.getFullYear() +  productData.future.discountDurationLength * productData.future.intervalLength);
    }

    day = endsDate.getDate();
    month = endsDate.getMonth();
    year = endsDate.getFullYear();
    monthName = String(endsDate).split(' ')[1];

    productData.future.ends = endsDate.toLocaleDateString();
    productData.future.endsValue = endsDate;
    productData.future.beginsDate = beginsDateLocale;
  },

  /**
   * Process data for each Product(Item) and send each element data to processPropToElem() for Static Markup
   * @param   productData
   * @param   productPath
   * @memberOf Markup
   */
  processProduct: function(productData, productPath) {
    // preserve this as 'obj' in inner function
    var obj = this;
    var i;
    var elemList;

    var sDisplay = '';
    if (productData['priceTotalValue'] === productData['totalValue']) {
      sDisplay = 'hide';
    } else {
      sDisplay = 'show';
    }

    var allRecognizedProducts = document.querySelectorAll("[data-fsc-item-path='" + productPath + "']");

    // is there at least one element that needs data for this product-path
    if ( allRecognizedProducts !== null ) {

      for (i = 0; i < allRecognizedProducts.length; i++) {

        var e = allRecognizedProducts[i];

        if (e.hasAttribute('data-fsc-item-selection-smartselect') && (e.tagName === 'INPUT' && (e.type.toLowerCase() === 'checkbox' || e.type.toLowerCase() === 'radio'))) {
          if (productData['selected']) { e.checked = true; }
          else { e.checked = false; }
        }

        if (e.hasAttribute('data-fsc-item-selection-smartdisplay')) {
          if (productData['selected']) { e.style.display = 'block'; }
          else { e.style.display = 'none'; }
        }

        if (e.hasAttribute('data-fsc-item-selection-smartdisplay-inverse')) {
          if (productData['selected']) { e.style.display = 'none'; }
          else { e.style.display = 'block'; }
        }

        if (e.hasAttribute('data-fsc-item-hideifselected')) {
          if (productData['selected']) { e.style.display = 'none';}
        }

        if (e.hasAttribute('data-fsc-item-showifselected')) {
          if (productData['selected']) { e.style.display = 'block'; }
        }

        if (e.hasAttribute('data-fsc-item-hideifnotselected')) {
          if (!productData['selected']) { e.style.display = 'none';}
        }

        if (e.hasAttribute('data-fsc-item-showifnotselected')) {
          if (!productData['selected']) { e.style.display = 'block';}
        }

        if (e.hasAttribute('data-fsc-item-smartdisable')) {
          if (!productData['selected']) { e.setAttribute("disabled", "disabled"); }
          else { e.removeAttribute("disabled"); }
        }

        if (e.hasAttribute('data-fsc-item-smartdisable-inverse')) {
          if (productData['selected']) { e.setAttribute("disabled", "disabled"); }
          else { e.removeAttribute("disabled"); }
        }

        if (e.hasAttribute('data-fsc-item-disableifselected')) {
          if (productData['selected']) { e.setAttribute("disabled", "disabled"); }
        }

        if (e.hasAttribute('data-fsc-item-disableifnotselected')) {
          if (!productData['selected']) { e.setAttribute("disabled", "disabled"); }
        }

        if (e.hasAttribute('data-fsc-item-enableifselected')) {
          if (productData['selected']) { e.removeAttribute("disabled"); }
        }

        if (e.hasAttribute('data-fsc-item-enableifnotselected')) {
          if (!productData['selected']) { e.removeAttribute("disabled"); }
        }

      }

      productData['link'] = 'https://' + API.storefront + '/' + productPath;

      for (var prop in productData) {
        if (productData.hasOwnProperty(prop)) {
          var queryProp = prop;
          if (typeof prop === 'string') {
            queryProp = prop.replace(/\./g, '\\.');
          }
          if (typeof productData[prop] === 'object' && prop !== "path") {
            for (var innerprop in productData[prop]) {
              if (productData[prop].hasOwnProperty(innerprop)) {
                var queryInnerProp = innerprop;
                if (typeof innerprop === 'string') {
                  queryInnerProp = innerprop.replace(/\./g, '\\.');
                }

                elemList = document.querySelectorAll("[data-fsc-item-path='" + productPath + "'][data-fsc-item-" + queryProp + "-" + queryInnerProp + "]");
                for (i = 0; i < elemList.length; i++) {
                  Markup.processPropToElem(innerprop, productData[prop][innerprop], elemList[i], 'data-fsc-item-' + prop + '-' + innerprop, sDisplay);
                }
              }
            }
          } else if (prop !== "path") {
            elemList = document.querySelectorAll("[data-fsc-item-path='" + productPath + "'][data-fsc-item-" + queryProp + "]");
            for (i = 0; i < elemList.length; i++) {
              Markup.processPropToElem(prop, productData[prop], elemList[i], 'data-fsc-item-' + prop, sDisplay);
            }
          } else if (prop === "path") {
            elemList = document.querySelectorAll("[data-fsc-item-path='" + productPath + "'][data-fsc-item-" + queryProp + "-element]");
            for (i = 0; i < elemList.length; i++) {
              Markup.processPropToElem(prop, productData[prop], elemList[i], 'data-fsc-item-' + prop, sDisplay);
            }

          }
        }
      }
    } else {
      debug('no markup to markup for the product-path and/or no productData property exist');
    }
  },

  /**
   * Send data to each element for Static markup
   * @param  property
   * @param  propertyValue
   * @param  elem
   * @param  original
   * @param  smartDisplay
   * @memberOf Markup
   */
  processPropToElem: function (property, propertyValue, elem, original, smartDisplay) {

    debug('Processing values for a single element:', property, elem, smartDisplay);
    if (propertyValue !== null) {
      propertyValue = propertyValue.toString().replace("<p>", "");
      propertyValue = propertyValue.replace("</p>", "");
    }

    propertyValue = propertyValue.toString().replace("<p>", "");
    propertyValue = propertyValue.replace("</p>", "");
    original = original.toLowerCase();
    var tag = elem.tagName.toLowerCase();

    if (tag === "a") {
      if (original === 'data-fsc-item-link') {
        debug("Setting href to", propertyValue, elem);
        elem.setAttribute("href", propertyValue);
      } else {
        elem.innerHTML = propertyValue.toString();
      }
    } else if (tag === "input")  {
      debug("Setting value to", propertyValue, elem);
      elem.value = propertyValue;
    } else if (tag === "select") {
      if (elem[propertyValue-1]) { elem[propertyValue-1].setAttribute("selected", true); }
    } else if (tag === "button") {
      debug("Setting value to", propertyValue, elem);
      elem.value = propertyValue;
    } else if (tag === "img") {
      debug("Setting src to", propertyValue, elem);
      elem.setAttribute("src", propertyValue);
    } else if (tag === "div") {
    } else {
      if (property.indexOf("Value") > -1) {
        elem.value = "";
        elem.setAttribute("data-fsc-item-" + property, propertyValue);
        elem.innerHTML = propertyValue.toString();
      } else {
        elem.innerHTML = propertyValue.toString();
      }
    }

    var smartDisplayProperties = ['data-fsc-item-price','data-fsc-item-pricetotal'];
    var elemToApply;

    //var smartDisplayProperties = ['data-fsc-item-price'];&& smartDisplayProperties.indexOf(original) > -1
    debug('do I run SmartDisplay for', property, smartDisplay);

    if (typeof elem.getAttribute('data-fsc-smartdisplay') !== "undefined" && elem.getAttribute('data-fsc-smartdisplay') !==null && smartDisplayProperties.indexOf(original) > -1) {
      debug('Agreed to run SmartDisplay for', property, smartDisplay);

      if (elem.getAttribute('data-fsc-smartdisplay') === '')  {
        elemToApply = elem;
      }
      else  {
        elemToApply = document.querySelector("[" + elem.getAttribute('data-fsc-smartdisplay') + "]");
      }

      if (elemToApply !== null) {
        if (smartDisplay && smartDisplay === 'show') {
          elemToApply.style.display = "block";
        } else {
          elemToApply.style.display = "none";
        }
      }
    }

    if (elem.hasAttribute('data-fsc-callback') && typeof window[elem.getAttribute('data-fsc-callback')] === "function") {
      debug('Agreed to run CallBack function for', property, elem.getAttribute('data-fsc-callback'));
      window[elem.setAttribute('data-fsc-callback')](elem,property,propertyValue);
    }
  },

  /**
   * displayDynaOrderLists - this function displays orderItems in Handlebars template
   *
   * @param  {object} orderItems  contains all arrays needed to display templates correctly
   * @param  {function} template  handlebars template function
   * @param  {string} containerName  name of template container to markup with dyna data
   * @memberOf Markup
   */
  displayDynaOrderLists: function(orderItems, template, containerName) {
    // clear out first
    var itemCart = document.querySelector("[data-fsc-items-container='" + containerName + "']");
    // make sure handlebars template is present first to avoid undefined error

    if (template !== undefined) {
      // this uses handlebars template defined in process: function()
      var output = template(orderItems);
      itemCart.innerHTML = output;
    }
  }
};

Markup.ready = false;
Markup.data = null;
;
var Resource = {

  init: function() {
    try {
      // Include CSS on page
      this.loadFastSpringCSS();
    } catch(e){
      error("Failed to load css.", e);
    }
  },

  /**
   * Loads FastSpring CSS
   */
  loadFastSpringCSS: function(){
    var baseUrl = document.querySelector('script#fsc-api').src;
    if (baseUrl == null) {
      return;
    }
    var fastSpringCss = baseUrl.slice(0, baseUrl.lastIndexOf("/")) + "/fastspring.css";
    debug("Loading FastSpring CSS. Path=" + fastSpringCss);
    var oHead = document.getElementsByTagName('head').item(0);
    var oLink = document.createElement('link');
    oLink.href = fastSpringCss;
    oLink.rel="stylesheet";
    oLink.crossorigin="anonymous";
    oHead.appendChild(oLink);
  }
};;
var fscContainer = document.querySelector('script#fsc-api');
var fscSession = window.fscSession || {};
var APIInitialized = false;
var fscMerging = false;
var fscCleanCheckout = false;
var fscEmptyOrder = false;
document.addEventListener('DOMContentLoaded', function() {
  Markup.init();
  Markup.process();
}, false);


API.init();
// don't need the canvas CSS for embedded
if (!API.isInlineCheckout) {
  Resource.init();
}

var fastspring = {};

// SBL can be loaded as script in header (or) could be added dynamically using script. So can't rely on DOMContentLoaded alone.
(function () {
  var divLoaderInterval;
  try {
    if (API.isInlineCheckout) {
      var divLoaderIntervalCounter = 0;
      // could use mutation observer in future versions
      divLoaderInterval = setInterval(function () {
        // exit strategy (exit the interval if DOM is found (or) a max of 5 seconds)
        if (divLoaderIntervalCounter >= 100) {
          clearInterval(divLoaderInterval);
        }
        divLoaderIntervalCounter++;
        var inlineContainerDIV = document.getElementById(Popup.inlineCheckoutContainerId);
        if (inlineContainerDIV) {
          clearInterval(divLoaderInterval);
          if (inlineContainerDIV.innerHTML.trim() === '') { // no inital content
            var baseUrl = document.querySelector('script#fsc-api').src;
            if (baseUrl) {
              var src = baseUrl.slice(0, baseUrl.lastIndexOf("/")) + '/skeleton.html';
              requestAnimationFrame(function () {
                 inlineContainerDIV.insertAdjacentHTML('beforeend',
                '<iframe id="fsc-embedded-checkout-skeleton" name="fsc-embedded-checkout-skeleton" width="100%" height="100%" frameBorder="0" ' +
                'style="position:absolute; top:0" ' +
                'src=' + src + '></iframe>');
                Object.assign(inlineContainerDIV.style,{height:"660px",position:"relative"});
              });
            }
          }
        }
      }, 50);
    }
  } catch (e) {
    if (divLoaderInterval) {
      clearInterval(divLoaderInterval);
    }
  }
})();

Object.defineProperty(fastspring, 'builder', {
  enumerable: true,
  configurable: true,
  get: function() { return F; }
});
Object.defineProperty(window, 'fastspring', {
  enumerable: true,
  configurable: true,
  get: function() { return fastspring; }
});

// backward compatibility
Object.defineProperty(window, '_f', {
  configurable: true,
  get: function() {
    console.log("Warning: '_f' is deprecated, please use 'fastspring.builder' instead");
    return F;
  }
});
})();