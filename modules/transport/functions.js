let router = require('../../lib/router/router');
let shaHash = require('js-sha256').sha224;
let UrlBase64 = require('../../common/crypto/urlbase64');
let data = require('./data');

function stringChunks (str, divisor) {
  // split message into equal parts
  let messageChunks = [];
  let nextChunk;
  if (typeof str === 'string') {
    while (str.length > 0) {
      nextChunk = str.substring(0, divisor);
      str = str.substring(divisor, str.length);
      messageChunks.push(nextChunk);
    }
  }
  return messageChunks;
}

function addHandleAndEndpoint (handleId, peerId, endpoint) {
  if (data.endpoints.indexOf(endpoint) === -1) { // TODO
    data.endpoints.push(endpoint);
    data.handleIds.push(handleId);
    if (!data.handles.hasOwnProperty(handleId)) {
      data.handles[handleId] = {};
    }

    data.handles[handleId].id = handleId;
    data.handles[handleId].peerId = peerId;
    data.handles[handleId].idStack = [];
    data.handles[handleId].buffer = [];
  }
}

function removeHandle (handleId) {
  const index = data.handleIds.indexOf(handleId);
  if (index > -1) {
    data.handleIds.splice(index, 1);
  }
  delete data.handles[handleId];
}

function removeEndpoint (endpoint) {
  const index = data.endpoints.indexOf(endpoint);
  if (index > -1) {
    data.endpoints.splice(index, 1);
  }
}

function managePeerURIs (handle, fromPeerId, fromNodeId, peerlist) {
  if (peerlist && peerlist.length > 0 && peerlist.indexOf('://') > -1) { // filter out erronous UDP signalling from DHT
    if (handle.peers[fromNodeId] &&
       (fromPeerId === handle.peers[fromNodeId].peerId ||
       fromPeerId === true)) {
      let peers = peerlist.split(',');
      for (let i = 0; i < peers.length; i++) {
        if (peers[i] && peers[i].indexOf('://') > -1) { // filter out anything that isn't a URI
          if (!data.peersURIs.hasOwnProperty(fromNodeId)) {
            data.peersURIs[fromNodeId] = [];
          }
          if (data.peersURIs[fromNodeId].indexOf(peers[i]) > -1) {
            // raise priority of URI information
            let idx = data.peersURIs[fromNodeId].indexOf(peers[i]);
            data.peersURIs[fromNodeId].splice(idx, 1);
          }
          // insert new peer URI information
          data.peersURIs[fromNodeId].unshift(peers[i]);
          // trim maximum peers length to 12
          if (data.peersURIs[fromNodeId].length > 12) {
            data.peersURIs[fromNodeId].pop();
          }
        }
      }
    }
  }
}

function relayPeers (handle, peer) {
  let peerFound; let peersArray;
  for (let h = 0; h < data.handleIds.length; h++) {
    const loopHandleId = data.handles[h];
    if (loopHandleId !== handle.id && typeof data.handles[loopHandleId] !== 'undefined' && data.handles[loopHandleId].hasOwnProperty('peers')) {
      const loopHandle = data.handles[loopHandleId];
      peersArray = Object.keys(loopHandle.peers);
      peerFound = false;
      for (let i = 0; i < peersArray.length; i++) {
        if (loopHandle.peers.hasOwnProperty(peersArray[i]) &&
          loopHandle.peers[ peersArray[i] ].hasOwnProperty('peerId') &&
          loopHandle.peers[ peersArray[i] ].peerId === peer) {
          peerFound = true;
        }
      }
      // if peer is new, or last (relay) announcement was more than 60 seconds ago
      if (!peerFound || (Number(loopHandle.peers[ peersArray[h] ].time) + 60000) < (new Date()).getTime()) {
        // duplicate announce latest 8 peers of remote nodes that cannot connect to specific channels
        if (data.peersURIs[ peer ]) {
          loopHandle.send(loopHandle, '~', '~|' + peer + '|' + data.peersURIs[ peer ].slice(0, 8).join());
        }
      }
    }
  }
}

function relayMessage (handle, nodeIdTarget, messageId, messageContent) {
  // is target node everyone or not in the channel?
  if (nodeIdTarget === '*' || !handle.peers.hasOwnProperty(nodeIdTarget)) {
    setTimeout(() => { // randomize moment of relay to avoid duplicate relays among channel peers
      for (let h = 0; h < data.handleIds.length; h++) {
        const loopHandleId = data.handleIds[h];
        const loopHandle = data.handles[loopHandleId];
        // ignore self handle, and already relayed messages
        if (loopHandleId !== handle.id &&
          loopHandle.idStack.indexOf(messageId) === -1) {
          loopHandle.send(loopHandle, '*', '+|' + nodeIdTarget + '|' + messageId + '|' + messageContent);
          loopHandle.idStack.push(messageId);
          if (loopHandle.idStack.length > 1000) {
            loopHandle.idStack.shift();
          }
        }
      }
    }, 500 + (2500 * Math.random()), handle, nodeIdTarget, messageId, messageContent);
  }
}

function routeMessage (handle, nodeIdTarget, messageId, messageContent) {
  if (typeof messageContent === 'string') {
    let sessionID = 0; // do we want to give special session ID? At the moment this doesn't work: nodeIdTarget;
    let nodeIdSource = messageContent.split('/')[0];
    let messageResponseId = shaHash(nodeIdSource + messageId).substr(16, 8); // response messageId
    let xpath = '/' + messageContent.substr(messageContent.indexOf('/') + 1, messageContent.length);
    if (xpath && xpath !== '/') {
      let routeResult = router.route({url: xpath, sessionID: sessionID});
      let response = '#|' + JSON.stringify(routeResult);
      sendMessage(
        handle,
        nodeIdSource,
        messageResponseId,
        response);
    }
  }
}

function sendMessage (handle, nodeIdTarget, messageId, message) {
  let messageChunks = stringChunks(message, 256);
  let messageContent;
  let chunkNr;
  let chunk;
  for (let i = messageChunks.length - 1; i > -1; i--) {
    chunkNr = i || '^' + messageChunks.length;
    chunk = chunkNr + '|' + messageChunks[i];
    // console.log(' ORIGINL ' + i + ' : ' + chunk );
    messageContent = (i === messageChunks.length - 1 ? nodeIdTarget : '') + '|' + messageId + '|' + UrlBase64.safeCompress(chunk);
    // console.log(' CRYPTED ' + i + ' : ' + messageContent);
    handle.send(handle, nodeIdTarget, messageContent);
  }
  return messageId;
}

function nthIndex (str, pat, n) {
  let L = str.length; let i = -1;
  while (n-- && i++ < L) {
    i = str.indexOf(pat, i);
    if (i < 0) break;
  }
  return i;
}

function messageIndex (handle, messageId, nodeIdTarget) {
  let idx = -1;
  if (handle) {
    for (let i = 0; i < handle.buffer.length; i++) {
      if (handle.buffer[i] && handle.buffer[i].id === messageId) {
        idx = i;
      }
    }
    if (idx === -1) {
      // register new message on stack
      idx = handle.buffer.push({
        id: messageId,
        from: nodeIdTarget,
        time: new Date().getTime(),
        data: null,
        part: {'N': 0}
      }) - 1;
    }
  }
  return idx;
}

function readMessage (handle, message) {
  // skip messages if buffer becomes too large!
  let transport = handle.protocol;
  if (handle.buffer.length < 10000) { // TODO
    let relay = message.substr(0, 1) === '+';
    if (relay) { message = message.substr(2); }
    let messageBase = message.substr(nthIndex(message, '|', 2) + 1);
    message = message.split('|');
    let nodeIdTarget = message.shift(); // get nodeIdTarget
    let messageId = message.shift(); // get unique ID
    // in case of multipart message, recover nodeIdTarget, from message buffer
    if (nodeIdTarget === '') {
      let idx = messageIndex(handle, messageId);
      nodeIdTarget = handle.buffer[idx].from;
    }
    // store id on stack
    handle.idStack.push(messageId);
    if (handle.idStack.length > 1000) {
      handle.idStack.shift();
    }
    if (nodeIdTarget === '*' || nodeIdTarget === global.hybrixd.node.publicKey) { // message addressed to us?
      let messageContent = UrlBase64.safeDecompress(messageBase);
      let partsComplete = false;
      let response = false;
      if (messageContent) {
        let chunks = 0;
        let chunkNr = messageContent.substr(0, messageContent.indexOf('|'));
        if (chunkNr.substr(0, 1) === '^') { chunks = chunkNr.substr(1); chunkNr = '0'; } // cut off length definition
        messageContent = messageContent.substr(messageContent.indexOf('|') + 1);
        let idx = messageIndex(handle, messageId, nodeIdTarget);
        // if id already on stack, piece together message chunks
        if (idx > -1) {
          handle.buffer[idx].part[chunkNr] = messageContent;
          // make sure total count of chunks is available
          if (chunkNr === '0') {
            handle.buffer[idx].part['N'] = Number(chunks);
          }
          // check if message is complete
          if (handle.buffer[idx].part['N'] > 0) {
            partsComplete = true;
            for (let i = 0; i < handle.buffer[idx].part['N']; i++) {
              if (!handle.buffer[idx].part[i]) {
                partsComplete = false;
              }
            }
          }
          if (partsComplete) {
            // reconstruct entire message
            let dataArray = [];
            for (let i = 0; i < handle.buffer[idx].part['N']; i++) {
              dataArray.push(handle.buffer[idx].part[i]);
              delete handle.buffer[idx].part[i];
            }
            handle.buffer[idx].data = dataArray.join('');
            delete handle.buffer[idx].part;
            if (handle.buffer[idx].data.substr(0, 2) === '#|') {
              handle.buffer[idx].data = handle.buffer[idx].data.substr(2);
              response = true;
            }
          }
          return {
            relay: relay,
            response: response,
            complete: partsComplete,
            nodeIdTarget: nodeIdTarget,
            messageId: messageId,
            messageContent: partsComplete ? handle.buffer[idx].data : null
          };
        } else {
          return null;
        }
      } else {
        console.log(' [!] transport ' + transport + ': mangled message [' + messageId + ']!');
        return null;
      }
    }
  } else {
    console.log(' [!] transport ' + transport + ': buffer overflow, discarding messages!');
    return null;
  }
}

exports.removeHandle = removeHandle;
exports.removeEndpoint = removeEndpoint;
exports.managePeerURIs = managePeerURIs;
exports.relayPeers = relayPeers;
exports.relayMessage = relayMessage;
exports.addHandleAndEndpoint = addHandleAndEndpoint;
exports.readMessage = readMessage;
exports.routeMessage = routeMessage;
exports.sendMessage = sendMessage;
exports.stringChunks = stringChunks;
exports.messageIndex = messageIndex;
