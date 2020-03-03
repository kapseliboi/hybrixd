const net = require('net');

// “The Telnet protocol defines the sequence CR LF to mean "end-of-line".”
// See https://tools.ietf.org/html/rfc1123#page-21.
const TELNET_EOL = '\r\n';

function request (data, dataCallback, errorCallback) {
  const port = data.port || 23;
  // TODO  const timeout = data.timeout;
  const host = data.host;

  if (typeof host !== 'string') {
    return errorCallback('host must be a string.');
  }

  if (typeof port !== 'number') {
    return errorCallback('port must be a number.');
  }

  /* TODO perhaps implement a manual timeout
     if (typeof timeout !== 'number' && timeout !== false) {
    return errorCallback('options.timeout must be a number or false.');
    } */

  const client = net.connect({
    host,
    port
  });

  // “The TELNET protocol is based upon the notion of a virtual teletype,
  // employing a 7-bit ASCII character set.”
  // See https://tools.ietf.org/html/rfc206#page-2.
  client.setEncoding('ascii');

  client.setTimeout(3000);

  let connectHandler, closeHandler, errorHandler, timeoutHandler;

  const clearListners = () => {
    client.removeListener('error', errorHandler);
    client.removeListener('timeout', timeoutHandler);
    client.removeListener('close', closeHandler);
    client.removeListener('connect', connectHandler);
  };
  closeHandler = (err) => {
    global.hybrixd.logger(['info', 'apiQueue', 'tcp'], 'Closed for ' + host + ':', err);
    clearListners();
    errorCallback(err);
  };

  errorHandler = (err) => {
    global.hybrixd.logger(['error', 'apiQueue', 'tcp'], 'Error for ' + host + ':', err);
    clearListners();
    client.destroy();
    errorCallback(err);
  };

  timeoutHandler = (err) => {
    global.hybrixd.logger(['error', 'apiQueue', 'tcp'], 'Timeout for ' + host + ':', err);
    clearListners();
    client.destroy();
    errorCallback(err);
  };

  connectHandler = () => {
    clearListners();
    try {
      client.write(JSON.stringify(data.data) + TELNET_EOL, () => {
      });
    } catch (e) {
      errorCallback(e);
    }
  };

  client.once('error', errorHandler);
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
              clearListners();
              client.destroy();
              dataCallback(result);
            } else {
              clearListners();
              client.destroy();
              global.hybrixd.logger(['error', 'apiQueue', 'tcp'], `Response id ${result.id} doest not match request id ${data.data.id}`);
              errorCallback('Wrong result');
            }
          }
        } catch (e) {
          global.hybrixd.logger(['error', 'apiQueue', 'tcp'], 'JSON object parse error : ' + e + ' for ' + data);
          clearListners();
          client.destroy();
          errorCallback(e);
        }
      }
    }
  };

  client.on('data', dataHandler);

  return client;
}

function Link (host, port) {
  this.host = host;
  this.port = port;
  this.clients = {};

  this.request = (data, dataCallback, errorCallback) => {
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

    const client = request({data, host: this.host, port: this.port}, dataAndCloseCallback, errorAndCloseCallback);
    this.clients[id] = client;
  };

  this.close = () => {
    for (let id in this.clients) {
      this.clients[id].destroy();
    }
  };
}

exports.Link = Link;
