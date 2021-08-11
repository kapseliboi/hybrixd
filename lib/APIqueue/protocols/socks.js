exports.createLink = createLink;
exports.call = call;
const HTTP_EOL = '\r\n';
const ports = {
  socks: 1080,
  tor: 9050,
  i2p: 4444
};

exports.ports = ports;

const {SocksClient} = require('socks');
const conf = require('../../conf/conf');

const DEFAULT_TIMEOUT = 60000;

function createLink (APIrequest, host, APIhosts, dataCallback, errorCallback) {
  dataCallback({ // dummy link, because new connection is created for each call
    close: () => {}
  });
}

// first part of a response , http header, possibly indicating more chunks
function parseHttpResponse (data) {
  let head, body;

  let done = true;
  if (data.startsWith('HTTP')) {
    const rnIndex = data.indexOf(HTTP_EOL + HTTP_EOL);
    if (rnIndex !== -1) {
      head = data.substr(0, rnIndex);
      body = data.substr(rnIndex + 4);
    } else {
      return {status: 500, body: 'Failed to parse http response.'};
    }
    const headers = head === ''
      ? {'transfer-encoding': 'chunked'}
      : Object.fromEntries(
        head.split(HTTP_EOL)
          .slice(1) // remove status/version line 'HTTP/1.1 301 ...'
          .filter(string => typeof string === 'string')
          .map(header => header.split(': ')) // 'key: value' => ['key','value']
          .filter(keyValue => keyValue.length === 2)
          .map(([key, value]) => [key.toLowerCase().trim(), value.trim()])
      );

    if (headers['transfer-encoding'] === 'chunked') { // alternating lines of chunksize and data, 0 for end chunk
      const lines = body.split(HTTP_EOL);
      if (lines.length === 1) {
        done = false;
        body = lines[0];
      } else {
        done = false;
        body = '';
        for (let i = 0; i < lines.length; i += 2) {
          const chunksize = parseInt(lines[i], 16); // hex
          if (chunksize > 0) body += lines[i + 1];
          else if (chunksize === 0) done = true;
        }
      }
    }
  } else return {status: 500, body: 'Failed to parse http response.'};

  const status = Number(head.split(' ')[1]); // 'HTTP/1.1 301 ...' -> 301
  return {status, body, done};
}

// follow up chunks, no header, last one appended by either '\r\n0\r\n' or '\r\n0\r\n\r\n'
function parseHttpChunkResponse (data, status) {
  let done, body;
  if (data.endsWith(HTTP_EOL + '0' + HTTP_EOL)) { // last chunk
    body = data.substr(0, data.length - (HTTP_EOL + '0' + HTTP_EOL).length);
    done = true;
  } else if (data.endsWith(HTTP_EOL + '0' + HTTP_EOL + HTTP_EOL)) { // last chunk
    body = data.substr(0, data.length - (HTTP_EOL + '0' + HTTP_EOL + HTTP_EOL).length);
    done = true;
  } else { // middle chunk
    done = false;
    body = data;
  }
  return {status, body, done};
}

function call (link, host, path, args, method, dataCallback, errorCallback) {
  const [prefix, hostNameAndPort] = host.split('://');
  const [destinationHostName, destinationPort] = hostNameAndPort.split(':');
  const proxyHostName = conf.get('socks.proxyhost');
  const proxyPort = conf.get('socks.proxyport', true) || ports[prefix]; // use silent for fallback
  const options = {
    proxy: {
      host: proxyHostName, // ipv4 or ipv6 or hostname
      port: proxyPort,
      type: 5 // Proxy version (4 or 5)

      /*

      // Optional fields
      userId: 'some username', // Used for SOCKS4 userId auth, and SOCKS5 user/pass auth in conjunction with password.
      password: 'some password', // Used in conjunction with userId for user/pass auth for SOCKS5 proxies.
      custom_auth_method: 0x80,  // If using a custom auth method, specify the type here. If this is set, ALL other custom_auth_*** options must be set as well.
      custom_auth_request_handler: async () =>. {
        // This will be called when it's time to send the custom auth handshake. You must return a Buffer containing the data to send as your authentication.
        return Buffer.from([0x01,0x02,0x03]);
      },
      // This is the expected size (bytes) of the custom auth response from the proxy server.
      custom_auth_response_size: 2,
      // This is called when the auth response is received. The received packet is passed in as a Buffer, and you must return a boolean indicating the response from the server said your custom auth was successful or failed.
      custom_auth_response_handler: async (data) => {
        return data[1] === 0x00;
}
       */
    },

    command: 'connect', // SOCKS command (createConnection factory function only supports the connect command)

    destination: {
      host: destinationHostName, // (hostname lookups are supported with SOCKS v4a and 5)
      port: destinationPort || 80
    },

    // Optional fields
    timeout: DEFAULT_TIMEOUT// APIrequest.timeout || DEFAULT_TIMEOUT
    // TODO set_tcp_nodelay: true // If true, will turn on the underlying sockets TCP_NODELAY option.
  };
  SocksClient.createConnection(options, (error, link) => {
    if (error) return errorCallback(error);
    return retrieveData(link, host, path, args, method, dataCallback, errorCallback);
  });
}

function retrieveData (link, host, path, args, method, dataCallback, errorCallback) {
  try {
    if (!path) path = '/';
    const body = ['POST', 'PUT', 'PATCH'].includes(method) ? args.data : '';
    const hostname = host.split('://')[1];
    const httpRequest = `${method} ${path} HTTP/1.1\nHost: ${hostname}\n\n${body}`;
    let errorHandler, dataHandler;
    errorHandler = error => {
      link.socket.removeListener('error', errorHandler);
      link.socket.removeListener('data', dataHandler);
      link.socket.destroy();
      errorCallback(error);
    };
    let cummalativeBody = ''; // all chunks combined
    let mainStatus; // first chunk sets the status
    dataHandler = data => {
      const first = typeof mainStatus === 'undefined';
      const {status, body, done} = first
        ? parseHttpResponse(data.toString())
        : parseHttpChunkResponse(data.toString(), mainStatus);
      mainStatus = status;
      cummalativeBody += body;
      if (done) {
        link.socket.removeListener('error', errorHandler);
        link.socket.removeListener('data', dataHandler);
        link.socket.destroy();
        if (
          (status >= 200 && status < 300) ||
        (args.ignore404 && status === 404) ||
        (args.ignoreError)
        ) {
          return dataCallback(cummalativeBody);
        } else return errorCallback(cummalativeBody);
      }
    };
    link.socket.on('error', errorHandler);
    link.socket.on('data', dataHandler);
    link.socket.write(httpRequest);
  } catch (error) {
    errorCallback(error);
  }
}
