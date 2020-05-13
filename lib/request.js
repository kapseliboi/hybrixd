// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hcmd - simple command line interface for hybrixd

const INTERVAL = 100; // amount of time between each recheck of availibity of process result.
const DEFAULT_TIMEOUT = 30000; // defailt max miliseconds before

const clients = {
  http: require('http'),
  https: require('https')
};

function createClientOptions (options) {
  return {host: options.host, port: options.port, path: options.path, headers: options.headers};
}

const responder = (dataCallback, errorCallback, progressCallback) => function (response, options, waitCounter) {
  const client = options.client;

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
    if (response.headers.hasOwnProperty('set-cookie')) options.headers = {'Cookie': response.headers['set-cookie']};

    const isJson = response.headers['content-type'] === 'application/json';
    let P;
    if (isJson) {
      try {
        P = JSON.parse(rawData);
      } catch (e) {
        errorCallback('JSON Parse failed for' + rawData);
        return;
      }
    } else if (options.meta) {
      P = {error: 0, data: rawData};
    } else {
      const isHtml = response.headers['content-type'] === 'text/html';
      if (isHtml) {
        P = {error: 0, data: `This is an html endpoint. Please use your browser to visit ${options.protocol}://${options.host}:${options.port}${options.path}`};
      } else {
        P = {error: 1, data: `Cannot handle content-type '${response.headers['content-type']}' in cli.`};
      }
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
        const clientOptions = createClientOptions(options);
        const req = client.get(clientOptions, function (response) {
          responder(dataCallback, errorCallback, progressCallback)(response, options);
        });
        req.on('error', function (err) {
          errorCallback(`Request failed 1! ${err.message}`);
        });
      }, INTERVAL);
    } else if (progress <= 1 && waitCounter * INTERVAL < timeout && stopped === null) {
      waitCounter++;
      if (typeof progressCallback === 'function') {
        progressCallback(progress, id);
      }

      setTimeout(function () {
        const clientOptions = createClientOptions(options);
        client.get(clientOptions, function (response) {
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
  if (!options.host) { errorCallback('Missing hostname.'); return; }

  if (!options.hasOwnProperty('protocol') || typeof options.protocol === 'undefined') options.protocol = 'http';
  if (!clients.hasOwnProperty(options.protocol)) {
    errorCallback(`Unknown protocol : ${options.protocol}`);
    return;
  }

  options.client = clients[options.protocol];
  const clientOptions = createClientOptions(options);
  if (typeof progressCallback === 'function') progressCallback(0);

  const req = options.client.get(clientOptions, response => {
    responder(dataCallback, errorCallback, progressCallback)(response, options);
  });
  req.on('error', function (err) {
    errorCallback(`Request failed : ${err.message}`);
  });
}

exports.request = request;
