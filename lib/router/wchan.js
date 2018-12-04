// wchan.js -> implements sharding download /w
//
// (c)2018 Internet of Coins - Rouke Pouw
//
var router = require('../router');

// export every function
exports.process = process;

// /wchan/$OFFSET/$LENGT/[$PATH....] ->  get substring of file data
// /wchan/hash/[$PATH....] -> get hash of file data
function process (request, xpath) {
  var offset, length, wRequest, hash;

  if (xpath[1] === 'hash') {
    wRequest = {url: xpath.slice(2).join('/'), sessionID: request.sessionID, hash: true};
  } else {
    offset = Number(xpath[1]);
    length = Number(xpath[2]);
    wRequest = {url: xpath.slice(3).join('/'), sessionID: request.sessionID, offset, length};
  }
  var result = router.route(wRequest);
  if (typeof result === 'object' && result.id === 'id') { // if this is a process to be returned then that needs to get the pagination attached to it.
    var processID = result.data;
    if (global.hybrixd.proc.hasOwnProperty(processID)) {
      var process = global.hybrixd.proc[processID];
      process.offset = wRequest.offset;
      process.length = wRequest.length;
      process.hash = wRequest.hash;
    }
  }
  return result;
}
