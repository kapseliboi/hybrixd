/*

 Rouke / Hybrix : added cummulative data retrieval

 Joachim notes:
 Currently this parses strictly JSON data over TCP/telnet connections.
 Valid JSON should be formatted as:
  {"jsonrpc": "2.0", {"other":"data"}, "id": 1234}
 This is the only way we can reliably separate different JSON objects
 from the incoming data stream.
 A more universal method would be preferred, but currently we only
 use TCP connections for ElectrumX instances.
 As soon as we start using TCP connections for something else, we will
 need to rewrite a part of this library.

*/

'use strict';

const net = require('net');

// “The Telnet protocol defines the sequence CR LF to mean "end-of-line".”
// See https://tools.ietf.org/html/rfc1123#page-21.
const TELNET_EOL = '\r\n';

class Teletype {

  constructor (host, port, options) {
    if (!port) port = 23;
    options = Object.assign({}, { timeout: false }, options);

    if (typeof host !== 'string') {
      throw new TypeError('host must be a string.');
    }

    if (typeof port !== 'number') {
      throw new TypeError('port must be a number.');
    }

    if (typeof options.timeout !== 'number' && options.timeout !== false) {
      throw new TypeError('options.timeout must be a number or false.');
    }

    this.host = host;
    this.port = port;
    this.timeout = options.timeout;
    this.buffer = {}; // used to store callbacks for request ids
    this.backlog = []; // used to store back log of lines
  }

  _lazyConnect () {
    return new Promise((resolve, reject) => {
      let timeout;

      if (this._client && !this._client.connecting) {
        return resolve(this._client);
      }

      if (!this._client) {
        this._client = net.connect({
          host: this.host,
          port: this.port
        });

        if (this.timeout) {
          timeout = setTimeout(() => {
            this._client.destroy();
            reject(errorTimedOut('Could not connect in time.'));
          }, this.timeout);
        }

        // “The TELNET protocol is based upon the notion of a virtual teletype,
        // employing a 7-bit ASCII character set.”
        // See https://tools.ietf.org/html/rfc206#page-2.
        this._client.setEncoding('ascii');
      }

      this._client.once('error', (err) => {
        if (timeout) clearTimeout(timeout);
        reject(err);
      });

      this._client.once('connect', () => {
        this._client.removeListener('error', reject);
        if (timeout) clearTimeout(timeout);
        resolve(this._client);
      });
    });
  }


  send (request, dataCallback, errorCallback){
    if (typeof request !== 'object' || request == null || !request.hasOwnProperty('id')) {
      errorCallback('request must be an object containing an id property. '+JSON.stringify(request));
    }
    this.buffer[request.id]=dataCallback;
    this._client.write(JSON.stringify(request) + TELNET_EOL);
  }

  parse(data){
    try{    // try to parse the data
      const result = JSON.parse(data);
      if(result.hasOwnProperty('id') && this.buffer.hasOwnProperty(result.id)){
        this.buffer[result.id](result); // callback the buffered callback
        delete this.buffer[result.id]; // remove from buffer
      }
    }catch(e){
      console.log(' [!] tcp parse error : '+e +' for '+data )
    }
  }

  read (errorCallback) {
    this._lazyConnect().then(client => {
      const onData = data => {

        const lines = data.replace('/\r/g','').split('\n');
        //console.log(' ###### '+JSON.stringify(lines)+' ###### ');

        for (const line of lines) {

          const startOfResult = line.startsWith('{"jsonrpc": "2.0"');
          const endOfResult = /"id": \d+}\n*$/.test(line);   // "id": 1234}
        console.log(' ###### '+line+' # '+startOfResult+' # '+endOfResult);
          if(startOfResult && this.backlog.length>0){ // retry to parse backlog in case we missed something
            this.parse(this.backlog.join('')); // parse the backlog + this line
            this.backlog.length=0; // clear the backlog
          }
          if(startOfResult && endOfResult){
            this.parse(line);
          }else if(endOfResult){
            this.backlog.push(line);
            this.parse(this.backlog.join('')); // parse the backlog + this line
            this.backlog.length=0; // clear the backlog
          }else if(line.length>0){
            this.backlog.push(line);
          }
        }
      };

      client.on('data', onData);
    }).catch(errorCallback);
  }

 /* exec (command, match) {
    if (typeof command !== 'string') {
      return Promise.reject(new TypeError('command must be a string.'));
    }

    return this._lazyConnect().then(client => {
      let promise;

      if (match) {
        promise = this.readUntil(match);
      }

      client.write(command + TELNET_EOL);

      if (match) return promise;
    });
  }*/


  /*
  readUntil (match) {
    if (!(match instanceof RegExp)) {
      return Promise.reject(new TypeError('match must be a RegExp.'));
    }

    let cummulativeData = ''; // Rouke / Hybrix : added this to retrieve cummulative data

    return this._lazyConnect().then(client => {
      return new Promise((resolve, reject) => {
        let timeout;

        const onData = data => {
          cummulativeData += data; // Rouke / Hybrix : added this to retrieve cummulative data
          const lines = data.split(TELNET_EOL);

          for (const line of lines) {
            if (match.test(line)) {
              resolve(cummulativeData); // Rouke / Hybrix : added this to retrieve cummulative data
              client.removeListener('data', onData);
              if (timeout) clearTimeout(timeout);
              break;
            }
          }
        };

        client.on('data', onData);

        if (this.timeout) {
          timeout = setTimeout(() => {
            reject(errorTimedOut('Did not receive matching data in time.'));
          }, this.timeout);
        }
      });
    });
  }*/

  close () {
    return this._lazyConnect().then(client => {
      client.end();
      client.destroy();
    });
  }
}

function errorTimedOut (message) {
  const err = new Error(message);
  err.code = 'ETIMEDOUT';
  return err;
}

module.exports = (host, port, options) => {
  return new Teletype(host, port, options);
};
