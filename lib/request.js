// (C) 2015 Internet of Coins / hybrix / Joachim de Koning / Rouke Pouw
// hcmd - simple command line interface for hybrixd

const INTERVAL = 100; // amount of time between each recheck of availibity of process result.
const DEFAULT_TIMEOUT = 30000; // defailt max miliseconds before

const clients = {
  http: require('http'),
  https: require('https')
};

function createClientOptions (options) {
  const prefix = options.pathPrefix || '';
  return {host: options.host, port: options.port, path: prefix + options.path, headers: options.headers};
}

function sendRequest (options, dataCallback, errorCallback, progressCallback) {
  const clientOptions = createClientOptions(options);
  options.client.get(clientOptions, function (response) { responder(dataCallback, errorCallback, progressCallback)(response, options); })
    .on('error', function (err) { errorCallback(`Request failed! ${err.message}`); });
}

const responder = (dataCallback, errorCallback, progressCallback) => function (response, options, waitCounter) {
  if (typeof waitCounter === 'undefined') waitCounter = 0;

  // handle the response
  let rawData = '';

  response.on('data', chunk => { rawData += chunk; });
  response.on('error', () => errorCallback('Connection dropped. Please check if hybrixd is still running.'));

  response.on('end', () => {
    if (response.headers.hasOwnProperty('set-cookie')) options.headers = {'Cookie': response.headers['set-cookie']};

    const isJson = true; // response.headers['content-type'] === 'application/json' || ;
    let P;
    if (isJson) {
      try {
        P = JSON.parse(rawData);
      } catch (e) {
        errorCallback('JSON Parse failed for \'' + rawData + '\'');
        return;
      }
    } else if (options.meta) P = {error: 0, data: rawData};
    else {
      const isHtml = response.headers['content-type'] === 'text/html';
      if (isHtml) errorCallback(`This is an html endpoint. Please use your browser to visit ${options.protocol}://${options.host}:${options.port}${options.path}`);
      else {
        errorCallback(`Cannot handle content-type '${response.headers['content-type']}' in cli.`);
      }
      return;
    }

    const id = P.id;
    const progress = P.progress;
    const stopped = typeof P.stopped !== 'undefined' ? P.stopped : null;
    const data = P.data;
    const timeout = options.timeout || P.timeout || DEFAULT_TIMEOUT;

    const getDataDirectly = options.first || options.debug;

    if (id === 'id' && !options.first) { // if we are returned a processID, we fetch that data...
      setTimeout(function () {
        if (options.debug) options.path = `/p/debug/${data}`;
        else if (options.path.split('/')[1].length === 1) options.path = `/p/${data}`;
        else options.path = `/proc/${data}`;
        sendRequest(options, dataCallback, errorCallback, progressCallback);
      }, INTERVAL);
    } else if ((progress <= 1 && waitCounter * INTERVAL < timeout && stopped === null) && !options.first) {
      waitCounter++;
      if (typeof progressCallback === 'function') progressCallback(progress, id);
      setTimeout(function () {
        sendRequest(options, dataCallback, errorCallback, progressCallback);
      }, INTERVAL, waitCounter);
    } else if (waitCounter * INTERVAL >= timeout && !getDataDirectly) errorCallback('Time out. Process is unfinished!');
    else {
      if (P.error !== 0) {
        if (options.meta) dataCallback(P);
        else {
          if (P.hasOwnProperty('help') && !options.meta) { // Error occured, non meta
            const helpMessage = P.help.split('<br/>').join('\n');
            errorCallback(helpMessage, P.error);
          } else errorCallback(P.data, P.error);
        }
      } else {
        if (typeof progressCallback === 'function') progressCallback(1, id);
        if (!options.meta) dataCallback(P.data);
        else dataCallback(P);
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
pathPrefix  (for example /api)
TODO verbose

   */
function request (options, dataCallback, errorCallback, progressCallback) {
  if (!options.host) return errorCallback('Missing hostname.');
  if (!options.hasOwnProperty('protocol') || typeof options.protocol === 'undefined') options.protocol = 'http';
  if (!clients.hasOwnProperty(options.protocol)) return errorCallback(`Unknown protocol : ${options.protocol}`);
  if (typeof progressCallback === 'function') progressCallback(0);
  options.client = clients[options.protocol];
  sendRequest(options, dataCallback, errorCallback, progressCallback);
}

exports.request = request;
