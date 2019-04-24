let functions = require('./functions.js');
let irc = require('irc');
let data = require('./data');

function open (proc, host, chan, hashSalt) {
  let shaHash = require('js-sha256').sha224;
  let openTime = (new Date()).getTime();
  let nodeId = global.hybrixd.node.publicKey;
  // TODO: when wrong host or channel input, warn user and quit!!
  let handleId = shaHash(nodeId + host + chan + hashSalt).substr(16, 24);

  if (!data.handles.hasOwnProperty(handleId)) {
    let port = 6667; // default IRC port
    // setup the irc socket
    let peerId = 'h' + shaHash(nodeId + openTime + hashSalt).substr(0, 15);
    let handle = {q: 1, id: handleId, opened: openTime, protocol: 'irc', host: host, channel: chan, peerId: peerId, peers: {}, buffer: [] };
    data.handles[handleId] = handle;
    // start the irc socket
    handle.socket = new irc.Client(host, peerId, {
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
        handle.peerId = shaHash(nodeId + (new Date()).getTime() + hashSalt).substr(0, 16);
        return handle.peerId;
      }
    });
    // event: event fires when online
    handle.socket.addListener('registered', function (message) {
      console.log(' [i] transport irc: connected as peer [' + this.handle.peerId + '] on port ' + port);
      // add handle and endpoint
      functions.addHandleAndEndpoint(this.handle.id, this.handle.peerId, 'irc://' + host + '/' + chan + '/' + this.handle.peerId);
      // send message function
      this.handle.send = function (handle, nodeIdTarget, message) {
        handle.socket.say('#' + handle.channel, message);
      };
      // peer maintenance interval
      clearInterval(this.handle.announce);
      this.handle.announce = setInterval(function () {
        // announce self
        this.handle.send(this.handle, '*', '@|' + this.nodeId + '|' + data.endpoints.join());
        // perform housecleaning of peer list
        let peersArray = Object.keys(this.handle.peers);
        let timenow = (new Date()).getTime();
        for (let i = 0; i < peersArray.length; i++) {
          // delete idle peers
          if ((Number(this.handle.peers[peersArray[i]].time) + 240000) < timenow) {
            if (this.handle.peers[peersArray[i]].peerId) {
              // only mention non-relayed peers going offline
              console.log(' [.] transport irc: peer [' + this.handle.peers[peersArray[i]].peerId + '] offline');
            }
            delete this.handle.peers[peersArray[i]];
          }
          // deduplicate peer announce if not found on other channels
          functions.relayPeers(this.handle, peersArray[i]);
        }
      }.bind({handle: this.handle, chan: this.chan, nodeId: this.nodeId}), 30000); //, engine,handle,chan,nodeId);
    }.bind({handle: handle, chan: chan, nodeId: nodeId}));

    // event: incoming message on channel
    handle.socket.addListener('message#' + chan, function (from, message) {
      // peer announcements: register new users in peer list
      if (message.substr(0, 2) === '@|' || message.substr(0, 2) === '~|') {
        // determine if peer relay message
        let relay = message.substr(0, 1) === '~' || false;
        // store information in peer table
        message = message.substr(2).split('|');
        let fromNodeId = message[0];
        let fromPeerId = from;
        if (fromNodeId !== nodeId) {
          if (this.handle && this.handle.peers) {
            if (!relay) {
              let fromPeerId = from;
              if (!this.handle.peers.hasOwnProperty(fromNodeId)) {
                console.log(' [.] transport irc: peer [' + fromPeerId + '] online');
                this.handle.peers[fromNodeId] = {peerId: fromPeerId, time: (new Date()).getTime()};
              } else {
                this.handle.peers[fromNodeId].time = (new Date()).getTime();
              }
            } else {
              if (!this.handle.peers.hasOwnProperty(fromNodeId)) {
                this.handle.peers[fromNodeId] = { peerId: null };
              }
              this.handle.peers[fromNodeId].time = (new Date()).getTime();
              console.log(' [.] transport irc: relay peer information from node ' + fromNodeId);
            }
          }
          functions.managePeerURIs(this.handle, relay || fromPeerId, fromNodeId, message[1]);
        }
      } else {
        let messageData = functions.readMessage(this.handle, message);
        // if target is us, route (and respond) to message
        if (messageData) {
          if (messageData.nodeIdTarget === nodeId) {
            if (messageData.complete && !messageData.response) {
              functions.routeMessage(this.handle, messageData.nodeIdTarget, messageData.messageId, messageData.messageContent);
            }
          } else { // else relay the message to other channels
            functions.relayMessage(this.handle, messageData.nodeIdTarget, messageData.messageId, messageData.messageContent);
          }
        }
      }
    }.bind({proc: proc, handle: handle}));

    // event: warnings and errors
    handle.socket.addListener('error', function (message) {
      console.log(' [!] transport irc: Error! ' + JSON.stringify(message));
    });
    proc.done(handle.id);
  } else {
    // return handle when socket already open
    proc.done(handleId);
  }
}

function stop (proc, handle, callback) {
  clearInterval(handle.announce);
  handle.socket.part('#' + handle.channel);
  setTimeout(function () {
    functions.removeEndpoint('irc://' + handle.host + '/' + handle.channel + '/' + handle.peerId);
    functions.removeHandle(handle.id);
    proc.done('irc socket closed');
    console.log(' [i] transport irc: stopped and closed socket ' + handle.id);
  }, 8000);
}

exports.open = open;
exports.stop = stop;
