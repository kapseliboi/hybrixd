let scheduler = require('../../lib/scheduler');
let functions = require('./functions.js');

function open (processID, engine, host, chan, hashSalt) {
  let shaHash = require('js-sha256').sha224;
  let openTime = (new Date()).getTime();
  let nodeId = global.hybrixd.node.publicKey;
  // TODO: when wrong host or channel input, warn user and quit!!
  let handle = shaHash(nodeId + host + chan + hashSalt).substr(16, 24);
  if (typeof global.hybrixd.engine[engine][handle] === 'undefined') {
    let irc = require('irc');
    let port = 6667; // default IRC port
    // setup the irc socket
    let peerId = 'h' + shaHash(nodeId + openTime + hashSalt).substr(0, 15);
    global.hybrixd.engine[engine][handle] = { opened: openTime, protocol: 'irc', host: host, channel: chan, peerId: peerId, peers: {} };
    // start the irc socket
    global.hybrixd.engine[engine][handle].socket = new irc.Client(host, peerId, {
      port: port,
      showErrors: false,
      autoRejoin: true,
      autoConnect: true,
      secure: false, // TODO: SSL?
      selfSigned: false,
      certExpired: false,
      floodProtection: true,
      floodProtectionDelay: 1000,
      channels: ['#' + chan],
      sasl: false,
      retryCount: 9999,
      retryDelay: 2000,
      stripColors: false,
      channelPrefixes: '&#',
      messageSplit: 512,
      encoding: '',
      onNickConflict: function () {
        global.hybrixd.engine[engine][handle].peerId = shaHash(nodeId + (new Date()).getTime() + hashSalt).substr(0, 16);
        return global.hybrixd.engine[engine][handle].peerId;
      }
    });
    // event: event fires when online
    global.hybrixd.engine[engine][handle].socket.addListener('registered', function (message) {
      console.log(' [i] transport irc: connected as peer [' + global.hybrixd.engine[engine][handle].peerId + '] on port ' + port);
      // add handle and endpoint
      functions.addHandleAndEndpoint(engine, handle, global.hybrixd.engine[engine][handle].peerId, 'irc://' + host + '/' + chan + '/' + global.hybrixd.engine[engine][handle].peerId);
      // send message function
      global.hybrixd.engine[engine][handle].send = function (engine, handle, nodeIdTarget, message) {
        global.hybrixd.engine[engine][handle].socket.say('#' + global.hybrixd.engine[engine][handle].channel, message);
      };
      // peer maintenance interval
      clearInterval(global.hybrixd.engine[engine][handle].announce);
      global.hybrixd.engine[engine][handle].announce = setInterval(function () {
        // announce self
        global.hybrixd.engine[this.engine][this.handle].send(this.engine, this.handle, '@|' + this.nodeId + '|' + global.hybrixd.engine[this.engine].endpoints.join());
        // perform housecleaning of peer list
        let peersArray = Object.keys(global.hybrixd.engine[this.engine][this.handle].peers);
        let timenow = (new Date()).getTime();
        for (let i = 0; i < peersArray.length; i++) {
          // delete idle peers
          if ((Number(global.hybrixd.engine[this.engine][this.handle].peers[peersArray[i]].time) + 240000) < timenow) {
            if (global.hybrixd.engine[this.engine][this.handle].peers[peersArray[i]].peerId) {
              // only mention non-relayed peers going offline
              console.log(' [.] transport irc: peer [' + global.hybrixd.engine[this.engine][this.handle].peers[peersArray[i]].peerId + '] offline');
            }
            delete global.hybrixd.engine[this.engine][this.handle].peers[peersArray[i]];
          }
          // deduplicate peer announce if not found on other channels
          functions.relayPeers(this.engine, this.handle, peersArray[i]);
        }
      }.bind({engine: engine, handle: handle, chan: chan, nodeId: nodeId}), 30000); //, engine,handle,chan,nodeId);
      scheduler.stop(processID, 0, handle);
    });
    // event: incoming message on channel
    global.hybrixd.engine[engine][handle].socket.addListener('message#' + chan, function (from, message) {
      // peer announcements: register new users in peer list
      if (message.substr(0, 2) === '@|' || message.substr(0, 2) === '~|') {
        // determine if peer relay message
        let relay = message.substr(0, 1) === '~' || false;
        // store information in peer table
        message = message.substr(2).split('|');
        let fromNodeId = message[0];
        let fromPeerId = from;
        if (fromNodeId !== nodeId) {
          if (global.hybrixd.engine[engine][handle] && global.hybrixd.engine[engine][handle].peers) {
            if (!relay) {
              let fromPeerId = from;
              if (!global.hybrixd.engine[engine][handle].peers.hasOwnProperty(fromNodeId)) {
                console.log(' [.] transport irc: peer [' + fromPeerId + '] online');
                global.hybrixd.engine[engine][handle].peers[fromNodeId] = {peerId: fromPeerId, time: (new Date()).getTime()};
              } else {
                global.hybrixd.engine[engine][handle].peers[fromNodeId].time = (new Date()).getTime();
              }
            } else {
              if (!global.hybrixd.engine[engine][handle].peers.hasOwnProperty(fromNodeId)) {
                global.hybrixd.engine[engine][handle].peers[fromNodeId] = { peerId: null };
              }
              global.hybrixd.engine[engine][handle].peers[fromNodeId].time = (new Date()).getTime();
              console.log(' [.] transport irc: relay peer information from node ' + fromNodeId);
            }
          }
          functions.managePeerURIs(engine, handle, relay || fromPeerId, fromNodeId, message[1]);
        }
      } else {
        let messageData = functions.readMessage(engine, handle, message);
        // if target is us, route (and respond) to message
        if (messageData) {
          if (messageData.nodeIdTarget === nodeId) {
            if (messageData.complete && !messageData.response) {
              functions.routeMessage(engine, handle, messageData.nodeIdTarget, messageData.messageId, messageData.messageContent);
            }
          } else { // else relay the message to other channels
            functions.relayMessage(engine, handle, messageData.nodeIdTarget, messageData.messageId, messageData.messageContent);
          }
        }
      }
    });
    // event: warnings and errors
    global.hybrixd.engine[engine][handle].socket.addListener('error', function (message) {
      console.log(' [!] transport irc: Error! ' + JSON.stringify(message));
    });
    // some simplistic progress reporting - TODO: make better than guesstimate
    functions.progress(processID, 10);
  } else {
    // return handle when socket already open
    scheduler.stop(processID, 0, handle);
  }
}

function stop (processID, engine, handle, callback) {
  functions.progress(processID, 8);
  clearInterval(global.hybrixd.engine[engine][handle].announce);
  global.hybrixd.engine[engine][handle].socket.part('#' + global.hybrixd.engine[engine][handle].channel);
  setTimeout(function () {
    functions.removeEndpoint(engine, 'irc://' + global.hybrixd.engine[engine][handle].host + '/' + global.hybrixd.engine[engine][handle].channel + '/' + global.hybrixd.engine[engine][handle].peerId);
    functions.removeHandle(engine, handle);
    scheduler.stop(processID, 0, 'irc socket closed');
    console.log(' [i] transport irc: stopped and closed socket ' + handle);
  }, 8000);
}

exports.open = open;
exports.stop = stop;
