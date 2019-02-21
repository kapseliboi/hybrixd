// wchan.js -> implements sharding download /w
//
// (c)2018 Internet of Coins - Rouke Pouw
//
const router = require('../router');

// /wchan/$OFFSET/$LENGT/[$PATH....] ->  get substring of file data
// /wchan/hash/[$PATH....] -> get hash of file data
function process (request, xpath) {
  const wRequest = getWchanData(request.sessionID, xpath);
  const routingData = router.route(wRequest);
  const routingDataIsValid = typeof routingData === 'object' && routingData.id === 'id'; // if this is a process to be returned then that needs to get the pagination attached to it.

  if (routingDataIsValid) setProcessData(routingData, wRequest);

  return routingData;
}

function setProcessData (routingData, wRequest) {
  const processID = routingData.data;
  if (global.hybrixd.proc.hasOwnProperty(processID)) {
    let process = global.hybrixd.proc[processID];
    process = Object.assign(process, wRequest);
  }
}

function getWchanData (sessionID, xpath) {
  return xpath[1] === 'hash'
    ? {
      url: xpath.slice(2).join('/'),
      sessionID,
      hash: true
    }
    : {
      url: xpath.slice(3).join('/'),
      sessionID,
      offset: Number(xpath[1]),
      length: Number(xpath[2])
    };
}

exports.process = process;
