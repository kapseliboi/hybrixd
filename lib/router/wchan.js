// wchan.js -> implements sharding download /w
//
// (c)2018 Internet of Coins - Rouke Pouw
//
var router = require('../router');

// export every function
exports.process = process;

// /wchan/$PAGESIZE/$PAGE/[$PATH....]
function process (request, xpath) {
  var offset = Number(xpath[1]);
  var length = Number(xpath[2]);
  var result = router.route({url: xpath.slice(3).join('/'), sessionID: request.sessionID, offset, length});

  if (typeof result === 'object' && result.id === 'id') { // if this is a process to be returned then that needs to get the pagination attached to it.
    var processID = result.data;
    if (global.hybridd.proc.hasOwnProperty(processID)) {
      var process = global.hybridd.proc[processID];
      process.offset = offset;
      process.length = length;
    }
  }

  return result;
}
