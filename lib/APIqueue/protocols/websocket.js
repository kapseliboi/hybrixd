exports.createLink = createLink;
exports.call = call;

const ports = {
  ws: 80,
  wss: 443
};
exports.ports = ports;

const WebSocket = require('ws');

function call (link, host, qpath, args, method, dataCallback, errorCallback, count) {
  if (link.readyState) {
    if (typeof args.data !== 'object' || args.data === null) errorCallback('Expected an object.');
    else {
      const id = args.data.hasOwnProperty('id') ? args.data.id : Math.floor(Math.random() * 10000);
      link.stack[id] = dataCallback;
    }
    try {
      link.send(JSON.stringify(args.data));
    } catch (e) {
      errorCallback('link not ready');
    }
  } else if ((count || 0) < 3) { // retry if link not yet ready
    setTimeout(() => {
      call(link, host, qpath, args, method, dataCallback, errorCallback, (count || 0) + 1);
    }, 300);
  } else errorCallback('link not ready');
}
function createLink (APIrequest, host, APIhosts, dataCallback, errorCallback) {
  const link = new WebSocket(host, {});
  link.stack = {};
  link
    .on('open', () => {
      global.hybrixd.logger(['info', 'apiQueue'], 'Websocket ' + host + ' opened');
      dataCallback(link);
    })
    .on('close', () => {
      global.hybrixd.logger(['info', 'apiQueue'], 'Websocket ' + host + ' closed');
      delete (APIhosts[host]);
    })
    .on('error', (error) => {
      global.hybrixd.logger(['info', 'apiQueue'], 'Websocket ' + host + ' : Error ' + error);
    })
    .on('message', message => {
      try {
        const data = JSON.parse(message);
        if (data.hasOwnProperty('id')) {
          if (link.stack.hasOwnProperty(data.id)) {
            link.stack[data.id](data);
            delete link.stack[data.id];
          }
        }
      } catch (e) {
        global.hybrixd.logger(['info', 'apiQueue'], 'Websocket ' + host + ' : Parsing Error ' + e);
      }
    });
}
