const functions = require('./functions.js');
const data = require('./data');

function open (proc, channel, passwd, hashSalt) {
  let shaHash = require('js-sha256').sha224;
  let openTime = (new Date()).getTime();
  let nodeId = global.hybrixd.node.publicKey;
  // TODO: when wrong host or channel input, warn user and quit!!
  let handleId = shaHash(nodeId + channel + passwd + hashSalt).substr(16, 24);

  if (!data.handleIds.hasOwnProperty(handleId)) {
    let PeerNetwork = require('./torrent/peer-network-fork');
    let port = Math.floor(Math.random() * 10000) + 21201; // choose random port
    // setup the torrent socket
    data.handles[handleId] = { id: handleId, opened: openTime, protocol: 'torrent', host: 'DHT', channel: channel, peerId: null, peers: {}, buffer: [] };
    const handle = data.handles[handleId];
    // start the torrent socket
    let bootstrapping = ['dht.transmissionbt.com:6881', 'router.bitcomet.com:6881', 'dht.aelitis.com:6881', 'router.bittorrent.com:6881', 'router.utorrent.com:6881'];
    handle.socket = new PeerNetwork({ group: channel, password: passwd, bootstrap: bootstrapping });
    handle.socket.start(port); // default torrent port is 21201
    // event: event fires when online
    handle.socket.on('ready', (peerId) => {
      if (peerId) {
        console.log(' [i] transport torrent: connected as peer [' + peerId + '] on port ' + port);
        // add handle and endpoint
        functions.addHandleAndEndpoint(handle.id, peerId, 'torrent://' + channel + '/' + peerId);
        // send message function
        handle.send = function (handle, nodeIdTarget, message) {
          // send message to every peer, or specified peer
          if (handle.hasOwnProperty('peers')) {
            let peerId; let broadcast = false;
            if (nodeIdTarget === '*' || nodeIdTarget === '@' || nodeIdTarget === '~' ||
               !handle.peers.hasOwnProperty(nodeIdTarget)) {
              broadcast = true;
            }
            let peersArray = Object.keys(handle.peers);
            for (let i = 0; i < peersArray.length; i++) {
              if (broadcast || nodeIdTarget === peersArray[i]) {
                peerId = handle.peers[peersArray[i]].peerId;
                handle.socket.send(Buffer.from(message), peerId);
              }
            }
          }
        };
        // peer maintenance interval
        clearInterval(handle.announce);
        handle.announce = setInterval(function (handle) {
          // perform housecleaning of peer list
          let peersArray = Object.keys(handle.peers);
          let timenow = (new Date()).getTime();
          for (let i = 0; i < peersArray.length; i++) {
            // delete idle peers
            if ((Number(handle.peers[peersArray[i]].time) + 240000) < timenow) {
              if (handle.peers[peersArray[i]].peerId) {
                // only mention non-relayed peers going offline
                console.log(' [.] transport torrent: peer [' + handle.peers[peersArray[i]].peerId + '] offline');
              }
              delete handle.peers[peersArray[i]];
            }
            // deduplicate peer announce if not found on other channels
            functions.relayPeers(handle, peersArray[i]);
          }
        }, 30000, handle);
        proc.done(handle.id);
      } else {
        console.log(' [!] transport torrent: failed to connect on port ' + port);
        proc.fail('failed to connect to torrent!');
      }
    });
    // event: incoming message on channel
    handle.socket.on('message', function (msg, fromPeerId) {
      // ignore self
      if (fromPeerId !== this.handle.peerId) {
        let message = msg.toString(); // DEBUG:
        console.log(' [.] transport torrent: incoming message ' + fromPeerId + ' ' + message);
        // peer announcements: register new users in peer list (and return announce)
        if (message.substr(0, 2) === '@|' || message.substr(0, 2) === '~|') {
          // determine if peer relay message
          let relay = message.substr(0, 1) === '~' || false;
          // store information in peer table
          message = message.substr(2).split('|');
          let fromNodeId = message[0];
          if (fromNodeId !== nodeId) {
            if (!relay) {
              if (!this.handle.peers.hasOwnProperty(fromNodeId)) {
                console.log(' [.] transport torrent: peer [' + fromPeerId + '] online');
                // announce self (return endpoint information)
                let message = '@|' + nodeId + '|' + data.endpoints.join();
                // init announce message must be directly through the socket to start filling remote empty peer list
                this.handle.socket.send(Buffer.from(message), fromPeerId);
                console.log(' [.] transport torrent: returning endpoint information to peer [' + fromPeerId + ']');
                this.handle.peers[fromNodeId] = {peerId: fromPeerId, time: (new Date()).getTime()};
              } else {
                this.handle.peers[fromNodeId].time = (new Date()).getTime();
              }
            } else {
              if (!handle.peers.hasOwnProperty(fromNodeId)) {
                this.handle.peers[fromNodeId] = { peerId: null };
              }
              this.handle.peers[fromNodeId].time = (new Date()).getTime();
              console.log(' [.] transport torrent: relay peer information from node ' + fromNodeId);
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
      }
    }.bind({proc: proc, handle: handle}));

    handle.socket.on('peer', (fromPeerId) => {
      // announce self (to new peer)
      if (handle.hasOwnProperty('peers')) {
        let peersArray = Object.keys(handle.peers);
        let newPeer = true;
        for (let i = 0; i < peersArray.length; i++) {
          if (handle.peers[peersArray[i]].peerId === fromPeerId) {
            newPeer = false;
          }
        }
        if (newPeer) {
          // init announce message must be directly through the socket to start filling remote empty peer list
          let message = '@|' + nodeId + '|' + data.endpoints.join();
          handle.socket.send(Buffer.from(message), fromPeerId);
        }
      }
    });
    // event: going offline
    handle.socket.on('offline', (fromPeerId) => {
      console.log(' [.] transport torrent: peer [' + fromPeerId + '] offline');
      // perform housecleaning of peer list
      if (handle.hasOwnProperty('peers')) {
        let peersArray = Object.keys(handle.peers);
        for (let i = 0; i < peersArray.length; i++) {
          if (handle.peers[peersArray[i]].peerId === fromPeerId) {
            console.log(' [.] transport torrent: peer [' + handle.peers[peersArray[i]].peerId + '] offline');
            delete handle.peers[peersArray[i]];
          }
        }
      }
    });
    // event: warnings and errors
    handle.socket.on('warning', (err) => {
      console.log(' [!] transport torrent: Error! ' + err.message);
    });
  } else {
    // return handle when socket already open
    proc.done(handleId);
  }
}

function stop (proc, handle) {
  clearInterval(handle.announce);
  handle.socket.close(function () {
    setTimeout(function () {
      functions.removeEndpoint('torrent://' + handle.channel + '/' + handle.peerId);
      functions.removeHandle(handle);
      proc.done('torrent socket closed');
      console.log(' [i] transport torrent: stopped and closed socket ' + handle.id);
    }, 3000);
  });
}

exports.open = open;
exports.stop = stop;
