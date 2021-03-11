const net = require('net');
const tls = require('tls');

// “The Telnet protocol defines the sequence CR LF to mean "end-of-line".”
// See https://tools.ietf.org/html/rfc1123#page-21.
const TELNET_EOL = '\r\n';

function request (data, dataCallback, errorCallback) {
  let propagateError = true;
  const errorCallbackOnlyOnce = error => {
    if (propagateError) {
      global.hybrixd.logger(['error', 'apiQueue', 'tcp'], error);
      propagateError = false;
      errorCallback(error);
    }
  };

  let client;

  try {
    const port = data.port || 23;

    const timeout = typeof data.timeout === 'number'
      ? data.timeout
      : 3000;
    const host = data.host;

    if (typeof host !== 'string') return errorCallback('host must be a string.');
    if (typeof port !== 'number') return errorCallback('port must be a number.');

    /* TODO perhaps implement a manual timeout
     if (typeof timeout !== 'number' && timeout !== false) {
    return errorCallback('options.timeout must be a number or false.');
    } */

    client = data.protocol === 'tcps'
      ? tls.connect({host, port})
      : net.connect({host, port});

    // “The TELNET protocol is based upon the notion of a virtual teletype,
    // employing a 7-bit ASCII character set.”
    // See https://tools.ietf.org/html/rfc206#page-2.
    client.setEncoding('ascii');

    client.setTimeout(timeout);

    let connectHandler, closeHandler, errorHandler, timeoutHandler;

    const clearListeners = () => {
      // client.removeListener('error', errorHandler); Do not remove error handling as error can occur during close
      client.removeListener('timeout', timeoutHandler);
      client.removeListener('close', closeHandler);
      client.removeListener('connect', connectHandler);
    };

    const generalErrorHandler = (loggerArray, errorString, clientFunction) => {
      return error => {
        global.hybrixd.logger(loggerArray, errorString, error);
        clearListeners();
        clientFunction();
        errorCallbackOnlyOnce(error);
      };
    };

    timeoutHandler = generalErrorHandler(['error', 'apiQueue', 'tcp'], 'Time out for ' + host + ':', () => client.destroy());
    errorHandler = generalErrorHandler(['error', 'apiQueue', 'tcp'], 'Error for ' + host + ':', () => client.destroy());
    closeHandler = generalErrorHandler(['info', 'apiQueue', 'tcp'], 'Closed for ' + host + ':', () => {});

    connectHandler = () => {
      clearListeners();
      try {
        client.write(JSON.stringify(data.data) + TELNET_EOL, () => {
        });
      } catch (err) {
        global.hybrixd.logger(['error', 'apiQueue', 'tcp'], 'Write failed for ' + host + ':', err);
        errorCallbackOnlyOnce(err);
      }
    };

    client.on('error', errorHandler);
    client.once('timeout', timeoutHandler);
    client.once('close', closeHandler);
    client.once('connect', connectHandler);

    const backlog = [];

    const dataHandler = response => {
      const lines = response.replace('/\r/g', '').split('\n');
      for (const line of lines) {
        if (line.length > 0) {
          backlog.push(line);
        }
      }

      if (backlog.length > 0) {
        const firstLine = backlog[0];
        const lastLine = backlog[backlog.length - 1];
        if (firstLine.startsWith('{"jsonrpc": "2.0"') && /"id": \d+}\n*$/.test(lastLine)) {
          try { // try to parse the data
            const result = JSON.parse(backlog.join(''));
            if (result.hasOwnProperty('id')) {
              if (result.id === data.data.id) {
                clearListeners();
                client.destroy();
                if (propagateError) {
                  propagateError = false;
                  dataCallback(result);
                }
              } else {
                generalErrorHandler(['error', 'apiQueue', 'tcp'], `Response id ${result.id} doest not match request id ${data.data.id}`, () => client.destroy())('Wrong result');
              }
            }
          } catch (err) {
            generalErrorHandler(['error', 'apiQueue', 'tcp'], 'JSON object parse error : ' + err + ' for ' + data, () => client.destroy())(err);
          }
        }
      }
    };
    client.on('data', dataHandler);
  } catch (error) {
    global.hybrixd.logger(['error', 'apiQueue', 'tcp'], error);
    errorCallbackOnlyOnce(error);
  }
  return client;
}

function Link (protocol, host, port) {
  this.protocol = protocol;
  this.host = host;
  this.port = port;
  this.clients = {};

  this.request = (data, options, dataCallback, errorCallback) => {
    const id = data.id;
    const closeCallback = () => {
      if (this.clients.hasOwnProperty(id)) {
        this.clients[id].destroy();
        delete this.clients[id];
      }
    };
    const dataAndCloseCallback = data => {
      closeCallback();
      dataCallback(data);
    };
    const errorAndCloseCallback = error => {
      closeCallback();
      errorCallback(error);
    };

    const client = request({data, protocol: this.protocol, host: this.host, port: this.port, timeout: options.timeout}, dataAndCloseCallback, errorAndCloseCallback);
    this.clients[id] = client;
  };

  this.close = () => {
    for (const id in this.clients) this.clients[id].destroy();
  };
}

exports.Link = Link;
