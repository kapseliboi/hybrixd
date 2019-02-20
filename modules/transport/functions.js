let router = require('../../lib/router');
let shaHash = require('js-sha256').sha224;
// let baseCode = require('../../common/basecode');
let UrlBase64 = require('../../common/crypto/urlbase64');

function simpleProgress (processID, count) {
  setTimeout(() => {
    if (global.hybrixd.proc[processID].progress < 1) {
      global.hybrixd.proc[processID].progress = 0.0825;
      setTimeout(() => {
        if (global.hybrixd.proc[processID].progress < 1) {
          global.hybrixd.proc[processID].progress = 0.165;
          setTimeout(() => {
            if (global.hybrixd.proc[processID].progress < 1) {
              global.hybrixd.proc[processID].progress = 0.33;
              setTimeout(() => { if (global.hybrixd.proc[processID].progress < 1) { global.hybrixd.proc[processID].progress = 0.66; } }, (500 * count), processID);
            }
          }, (250 * count), processID);
        }
      }, (150 * count), processID);
    }
  }, (100 * count), processID);
}

function addHandleAndEndpoint (engine, handle, peerId, endpoint) {
  if (global.hybrixd.engine[engine].endpoints.indexOf(endpoint) === -1) {
    global.hybrixd.engine[engine].endpoints.push(endpoint);
    global.hybrixd.engine[engine].handles.push(handle);
    global.hybrixd.engine[engine][handle].peerId = peerId;
    global.hybrixd.engine[engine][handle].idStack = [];
    global.hybrixd.engine[engine][handle].buffer = { id: [], time: [], data: [] };
  }
}

function removeHandle (engine, handle) {
  let index = global.hybrixd.engine[engine].handles.indexOf(handle);
  if (index > -1) {
    global.hybrixd.engine[engine].handles.splice(index, 1);
  }
  delete global.hybrixd.engine[engine][handle];
}

function removeEndpoint (engine, endpoint) {
  let index = global.hybrixd.engine[engine].endpoints.indexOf(endpoint);
  if (index > -1) {
    global.hybrixd.engine[engine].endpoints.splice(index, 1);
  }
}

function managePeerURIs (engine, handle, fromPeerId, fromNodeId, peerlist) {
  if (peerlist.length > 5 && peerlist.indexOf('://') > -1) { // filter out erronous UDP signalling from DHT
    if (global.hybrixd.engine[engine][handle].peers[fromNodeId] &&
       (fromPeerId === global.hybrixd.engine[engine][handle].peers[fromNodeId].peerId ||
       fromPeerId === true)) {
      if (peerlist) {
        let peers = peerlist.split(',');
        for (let i = 0; i < peers.length; i++) {
          if (peers[i] && peers.indexOf('://') > -1) { // filter out anything that isn't a URI
            if (!global.hybrixd.engine[engine].peersURIs.hasOwnProperty(fromNodeId)) {
              global.hybrixd.engine[engine].peersURIs[fromNodeId] = [];
            }
            if (global.hybrixd.engine[engine].peersURIs[fromNodeId].indexOf(peers[i]) === -1) {
              // insert new peer URI information
              global.hybrixd.engine[engine].peersURIs[fromNodeId].unshift(peers[i]);
            } else {
              // raise priority of URI information
              let idx = global.hybrixd.engine[engine].peersURIs[fromNodeId].indexOf(peers[i]);
              global.hybrixd.engine[engine].peersURIs[fromNodeId].splice(idx, 1);
              global.hybrixd.engine[engine].peersURIs[fromNodeId].unshift(peers[i]);
            }
            if (global.hybrixd.engine[engine].peersURIs[fromNodeId].length > 24) {
              global.hybrixd.engine[engine].peersURIs[fromNodeId].pop();
            }
          }
        }
      }
    }
  }
}

function relayPeers (engine, handle, peer) {
  let loophandle; let peerFound; let peersArray;
  for (let h = 0; h < global.hybrixd.engine[engine].handles.length; h++) {
    loophandle = global.hybrixd.engine[engine].handles[h];
    if (loophandle !== handle && global.hybrixd.engine[engine][loophandle].hasOwnProperty('peers')) {
      peersArray = Object.keys(global.hybrixd.engine[engine][handle].peers);
      peerFound = false;
      for (let i = 0; i < peersArray.length; i++) {
        if (global.hybrixd.engine[engine][loophandle].peers.hasOwnProperty(peersArray[i]) &&
           global.hybrixd.engine[engine][loophandle].peers[ peersArray[i] ].hasOwnProperty('peerId') &&
           global.hybrixd.engine[engine][loophandle].peers[ peersArray[i] ].peerId === peer) {
          peerFound = true;
        }
      }
      // if peer is new, or last (relay) announcement was more than 60 seconds ago
      if (!peerFound || (Number(global.hybrixd.engine[engine][loophandle].peers[ peersArray[h] ].time) + 60000) < (new Date()).getTime()) {
        // duplicate announce latest 8 peers of remote nodes that cannot connect to specific channels
        if (global.hybrixd.engine[engine].peersURIs[ peer ]) {
          global.hybrixd.engine[engine][loophandle].send(engine, loophandle, '~|' + peer + '|' + global.hybrixd.engine[engine].peersURIs[ peer ].slice(0, 8).join());
        }
      }
    }
  }
}

function relayMessage (engine, handle, nodeIdTarget, messageId, messageContent) {
  // is target node everyone or not in the channel?
  if (nodeIdTarget === '*' || !global.hybrixd.engine[engine][handle].peers.hasOwnProperty(nodeIdTarget)) {
    setTimeout(() => { // randomize moment of relay to avoid duplicate relays among channel peers
      let loophandle;
      for (let h = 0; h < global.hybrixd.engine[engine].handles.length; h++) {
        loophandle = global.hybrixd.engine[engine].handles[h];
        // ignore self handle, and already relayed messages
        if (loophandle !== handle &&
           global.hybrixd.engine[engine][loophandle].idStack.indexOf(messageId) === -1) {
          global.hybrixd.engine[engine][loophandle].send(engine, loophandle, '+|' + nodeIdTarget + '|' + messageId + '|' + messageContent);
          global.hybrixd.engine[engine][loophandle].idStack.push(messageId);
          if (global.hybrixd.engine[engine][loophandle].idStack.length > 1000) {
            global.hybrixd.engine[engine][loophandle].idStack.shift();
          }
        }
      }
    }, 500 + (2500 * Math.random()), engine, handle, nodeIdTarget, messageId, messageContent);
  }
}

function routeMessage (engine, handle, nodeIdTarget, messageId, messageContent) {
  if (typeof messageContent === 'string' && messageContent.substr(0, 1) !== '#') {
    let sessionID = nodeIdTarget;
    let nodeIdSource = messageContent.split('/')[0];
    let messageResponseId = shaHash(nodeIdSource + messageId).substr(16, 24); // response messageId
    let xpath = '/' + messageContent.substr(messageContent.indexOf('/') + 1, messageContent.length);
    if (xpath) {
      // var response = baseCode.recode('utf-8','base58', '#'+JSON.stringify( router.route({url: xpath, sessionID: sessionID}) ) );
      let routeResult = router.route({url: xpath, sessionID: sessionID});
      console.log(' RESPONSE: ' + JSON.stringify(routeResult));
      let response = UrlBase64.safeCompress('#' + JSON.stringify(routeResult));
      console.log(' RESPONSECRYPTED: ' + response);
      global.hybrixd.engine[engine][handle].send(engine, handle, nodeIdSource + '|' + messageResponseId + '|' + response);
    }
  }
}

function nthIndex (str, pat, n) {
  let L = str.length; let i = -1;
  while (n-- && i++ < L) {
    i = str.indexOf(pat, i);
    if (i < 0) break;
  }
  return i;
}

function readMessage (engine, handle, message) {
  let relay = message.substr(0, 1) === '+';
  if (relay) { message = message.substr(2); }
  let messageBase = message.substr(nthIndex(message, '|', 2) + 1, message.length);
  console.log(' INCOMING: ' + messageBase);
  // var messageContent = baseCode.recode('base58','utf-8', messageBase);
  let messageContent = UrlBase64.safeDecompress(messageBase);
  console.log(' DECODED: ' + messageContent);
  message = message.split('|');
  let nodeIdTarget = message.shift(); // get nodeIdTarget
  let messageId = message.shift(); // get unique ID
  global.hybrixd.engine[engine][handle].idStack.push(messageId); // make sure to register the message ID on stack
  // determine if peer relay message
  if (nodeIdTarget === '*' || nodeIdTarget === global.hybrixd.node.publicKey) { // message addressed to us?
    let timenow = (new Date()).getTime(); // add internal timestamp
    let transport = global.hybrixd.engine[engine][handle].protocol;
    // skip messages if buffer becomes too large!
    if (global.hybrixd.engine[engine][handle].buffer.id.length < global.hybrixd.engine[engine].announceMaxBufferSize) {
      global.hybrixd.engine[engine][handle].buffer.id.push(messageId);
      global.hybrixd.engine[engine][handle].buffer.time.push(timenow);
      global.hybrixd.engine[engine][handle].buffer.data.push(messageContent);
      // DEBUG: console.log(' [.] transport '+transport+': message arrived for ['+nodeIdTarget+'] | '+messageId+' | '+messageContent);
    } else {
      console.log(' [!] transport ' + transport + ': buffer overflow, discarding messages!');
    }
  }
  return {
    relay: relay,
    nodeIdTarget: nodeIdTarget,
    messageId: messageId,
    messageContent: messageContent
  };
}

exports.progress = simpleProgress;
exports.removeHandle = removeHandle;
exports.removeEndpoint = removeEndpoint;
exports.managePeerURIs = managePeerURIs;
exports.relayPeers = relayPeers;
exports.relayMessage = relayMessage;
exports.addHandleAndEndpoint = addHandleAndEndpoint;
exports.readMessage = readMessage;
exports.routeMessage = routeMessage;
