exports.createLink = createLink;
exports.call = call;

const ports = {
  http: 80,
  https: 443
};

exports.ports = ports;

const {Client} = require('../rest');

function call (link, host, qpath, args, method, dataCallback, errorCallback) {
  const methodLowerCase = (typeof method === 'string') ? method.toLowerCase() : 'get';
  link[methodLowerCase](host + qpath, args || {}, dataCallback, errorCallback);
}

function createLink (APIrequest, host, APIhosts, dataCallback, errorCallback) {
  const options = {};
  if (APIrequest.user) options.user = APIrequest.user;
  if (APIrequest.pass) options.password = APIrequest.pass;

  /*
    TODO possibly to extend options:
    proxy
    connection
    mimetypes
    requestConfig
    rejectUnauthorized
  */

  const link = new Client(options);
  dataCallback(link);
}
