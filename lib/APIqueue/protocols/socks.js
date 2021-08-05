exports.createLink = createLink;
exports.call = call;

const ports = {
  socks: 1080,
  tor: 9050,
  i2p: 4444
};

exports.ports = ports;

const {SocksClient} = require('socks');
const conf = require('../../conf/conf');

const DEFAULT_TIMEOUT = 30000;

function createLink (APIrequest, host, APIhosts, dataCallback, errorCallback) {
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
    timeout: APIrequest.timeout || DEFAULT_TIMEOUT
    // TODO set_tcp_nodelay: true // If true, will turn on the underlying sockets TCP_NODELAY option.
  };
  SocksClient.createConnection(options, (error, link) => {
    if (error) return errorCallback(error);
    link.close = () => link.socket.destroy();
    return dataCallback(link);
  });
}

function parseHttpResponse (data) {
  let head, body;
  const nIndex = data.indexOf('\n\n');
  const lineEnding = data.indexOf('\r\n') ? '\r\n' : '\n';
  if (nIndex !== -1) {
    head = data.substr(0, nIndex);
    body = data.substr(nIndex + 2);
  } else {
    const rnIndex = data.indexOf('\r\n\r\n');
    if (rnIndex !== -1) {
      head = data.substr(0, rnIndex);
      body = data.substr(rnIndex + 4);
    } else {
      return {status: 500, body: 'Failed to parse http response.'};
    }
  }

  const headers = Object.fromEntries(
    head.split(lineEnding)
      .slice(1) // remove status/version line 'HTTP/1.1 301 ...'
      .map(header => header.split(': ')) // 'key: value' => ['key','value']
      .map(([key, value]) => [key.toLowerCase().trim(), value.trim()])
  );

  if (headers['transfer-encoding'] === 'chunked') { // alternating lines of chunksize and data, 0 for end chunk
    const lines = body.split(lineEnding);
    body = '';
    for (let i = 0; i < lines.length; i += 2) {
      const chunksize = parseInt(lines[i], 16); // hex
      if (chunksize > 0) body += lines[i + 1];
    }
  }

  const status = Number(head.split(' ')[1]); // 'HTTP/1.1 301 ...' -> 301
  return {status, body};
}

function call (link, host, path, args, method, dataCallback, errorCallback) {
  try {
    if (!path) path = '/';
    const body = ['POST', 'PUT', 'PATCH'].includes(method) ? args.data : '';
    const hostname = host.split('://')[1];
    const httpRequest = `${method} ${path} HTTP/1.1\nHost: ${hostname}\n\n${body}`;
    link.socket.write(httpRequest);
    let errorHandler, dataHandler;
    errorHandler = error => {
      link.socket.removeListener('error', errorHandler);
      link.socket.removeListener('data', dataHandler);
      errorCallback(error);
    };
    dataHandler = data => {
      link.socket.removeListener('error', errorHandler);
      link.socket.removeListener('data', dataHandler);
      const {status, body} = parseHttpResponse(data.toString());
      if (
        (status >= 200 && status < 300) ||
        (args.ignore404 && status === 404) ||
        (args.ignoreError)
      ) return dataCallback(body);
      else return errorCallback(body);
    };
    link.socket.on('error', errorHandler);
    link.socket.on('data', dataHandler);
  } catch (error) {
    errorCallback(error);
  }
}
