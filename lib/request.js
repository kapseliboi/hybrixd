// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hcmd - simple command line interface for hybrixd

const INTERVAL = 100; // amount of time between each recheck of availibity of process result.
const DEFAULT_TIMEOUT = 30000; // defailt max miliseconds before

const http = require('http');

const responder = (dataCallback, errorCallback, progressCallback) => function (response, options, waitCounter) {
  if (!options.host) { errorCallback('Missing hostname.'); return; }
  if (!options.port) { errorCallback('Missing port.'); return; }

  if (typeof waitCounter === 'undefined') {
    waitCounter = 0;
  }

  // handle the response
  let rawData = '';

  response.on('data', chunk => { rawData += chunk; });

  response.on('error', () => {
    errorCallback('Connection dropped. Please check if hybrixd is still running.');
  });

  response.on('end', () => {
    let P;
    try {
      P = JSON.parse(rawData);
    } catch (e) {
      // DEPRECATED: console.log(`Error: JSON Parse failed : ${e}`);
      // return other file types
      errorCallback('JSON Parse failed for' + rawData);
      return;
    }

    const id = P.id;
    const progress = P.progress;
    const stopped = typeof P.stopped !== 'undefined' ? P.stopped : null;
    const data = P.data;
    const timeout = options.timeout || P.timeout || DEFAULT_TIMEOUT;
    if (id === 'id' && !options.first) { // if we are returned a processID, we fetch that data...
      setTimeout(function () {
        if (options.debug) {
          options.path = `/p/debug/${data}`;
        } else if (options.path.split('/')[1].length === 1) {
          options.path = `/p/${data}`;
        } else {
          options.path = `/proc/${data}`;
        }
        const req = http.get(options, function (response) {
          responder(dataCallback, errorCallback, progressCallback)(response, options);
        });
        req.on('error', function (err) {
          errorCallback(`Request failed! ${err.message}`);
        });
      }, INTERVAL);
    } else if (progress < 1 && waitCounter * INTERVAL < timeout && stopped === null) {
      waitCounter++;
      if (typeof progressCallback === 'function') {
        progressCallback(progress, id);
      }

      setTimeout(function () {
        http.get(options, function (response) {
          responder(dataCallback, errorCallback, progressCallback)(response, options, waitCounter);
        });
      }, INTERVAL, waitCounter);
    } else if (waitCounter * INTERVAL >= timeout) {
      errorCallback('Time out. Process is unfinished!');
    } else {
      if (P.error !== 0) {
        if (options.meta) {
          dataCallback(P);
        } else {
          if (P.hasOwnProperty('help') && !options.meta) { // Error occured, non meta
            const helpMessage = P.help.split('<br/>').join('\n');
            errorCallback(helpMessage, P.error);
          } else {
            errorCallback(P.data, P.error);
          }
        }
      } else {
        if (typeof progressCallback === 'function') {
          progressCallback(1, id);
        }
        if (!options.meta) {
          dataCallback(P.data);
        } else {
          dataCallback(P);
        }
      }
    }
  });
};

/* options
host
port
path
TODO data
interval
timeout
meta
debug

   */
function request (options, dataCallback, errorCallback, progressCallback) {
  if (typeof progressCallback === 'function') {
    progressCallback(0);
  }

  const req = http.get(options, response => {
    responder(dataCallback, errorCallback, progressCallback)(response, options);
  });
  req.on('error', function (err) {
    errorCallback(`Request failed : ${err.message}`);
  });
}

exports.request = request;
