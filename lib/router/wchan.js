// wchan.js -> implements sharding download /w
//
// (c)2018 Internet of Coins - Rouke Pouw
//
var route = require('../router');

// export every function
exports.process = process;

// /wchan/$PAGESIZE/$PAGE/[$PATH....]
function process (request, xpath) {
  var pageSize = Number(xpath[1]);
  var pageNumber = Number(xpath[2]);
  if (pageNumber === 0) {
    var byteSize;
    var pageCount;
    return JSON.stringify({byteSize, pageSize, pageCount});
  } else {

  }
}
