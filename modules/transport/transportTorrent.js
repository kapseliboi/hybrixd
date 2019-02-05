var scheduler = require('../../lib/scheduler');
var functions = require('./functions.js');

function open(processID,engine,channel,passwd,hashSalt) {
  var shaHash = require('js-sha256').sha224
  var openTime = (new Date).getTime();
  var nodeId = global.hybrixd.nodeId;
    // TODO: when wrong host or channel input, warn user and quit!!
  var handle = shaHash(nodeId+channel+passwd+hashSalt).substr(16,24);;

  if(typeof global.hybrixd.engine[engine][handle]==='undefined') {
    var peerNetwork = require('./torrent/peer-network-fork');
    var port = Math.floor(Math.random() * 10000) + 21201;  // default: var port = 21201;
    // setup the torrent socket
    global.hybrixd.engine[engine][handle] = { opened:openTime,protocol:'torrent',host:'DHT',channel:channel,peerId:null,peers:{} };
    // start the torrent socket
    var bootstrapping = ['dht.transmissionbt.com:6881','router.bitcomet.com:6881','dht.aelitis.com:6881','router.bittorrent.com:6881','router.utorrent.com:6881'];
    global.hybrixd.engine[engine][handle].socket = new peerNetwork({ group:channel, password:passwd, bootstrap: bootstrapping});
    global.hybrixd.engine[engine][handle].socket.start(port);   // default torrent port is 21201
    // event: event fires when online
    global.hybrixd.engine[engine][handle].socket.on("ready", (peerId) => {
      if(peerId) {
        console.log(' [i] transport torrent: connected as peer ['+peerId+'] on port '+port);
        endpoint = 'torrent://'+channel+'/'+peerId;
        if(global.hybrixd.engine[engine].endpoints.indexOf(endpoint)===-1) {
          global.hybrixd.engine[engine].endpoints.push(endpoint);
          global.hybrixd.engine[engine].handles.push(handle);
          global.hybrixd.engine[engine][handle].peerId = peerId;
          global.hybrixd.engine[engine][handle].buffer = { id:[],time:[],data:[] };
          scheduler.stop(processID, 0, handle);
        }
        // send message function
        global.hybrixd.engine[engine][handle].send = function (engine,handle,message) {
          // send message to every peer, or specified peer
          if(global.hybrixd.engine[engine][handle].hasOwnProperty('peers')) {
            var nodeIdTarget = message.split('|')[0];
            var peersArray = Object.keys(global.hybrixd.engine[engine][handle].peers);
            var peerId;
            for (var i=0;i<peersArray.length;i++) {
              if(nodeIdTarget==='*'||nodeIdTarget==='@'||nodeIdTarget==='~'||nodeIdTarget===peersArray[i]) {
                peerId = global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId;
                global.hybrixd.engine[engine][handle].socket.send(Buffer.from(message), peerId);
              }
            }
          }
        }
        // peer maintenance interval
        clearInterval(global.hybrixd.engine[engine][handle].announce);
        global.hybrixd.engine[engine][handle].announce = setInterval(function() {
          // perform housecleaning of peer list
          var peersArray = Object.keys(global.hybrixd.engine[engine][handle].peers);
          var timenow = (new Date).getTime();
          var relayPeers, relayHandles;
          for (var i=0;i<peersArray.length;i++) {
            // delete idle peers
            if((Number(global.hybrixd.engine[engine][handle].peers[peersArray[i]].time)+300000)<timenow) {
              if(global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId) {
                // only mention non-relayed peers going offline
                console.log(' [.] transport torrent: peer ['+global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId+'] offline');
              }
              delete global.hybrixd.engine[engine][handle].peers[peersArray[i]];
            }
            // deduplicate peer announce if not found on other channels
            relayPeers = functions.relayPeers(engine,handle,peersArray[i]);
          }
          // TODO: deduplicate messages not found on other channels
        },30000,engine,handle);
      } else {
        console.log(' [!] transport torrent: failed to connect on port '+port);
        scheduler.stop(processID, 1, 'failed to connect to torrent!');
      }
    // event: incoming message on channel
    });
    global.hybrixd.engine[engine][handle].socket.on("message", (msg, fromPeerId) => {
        // ignore self
        if(fromPeerId !== global.hybrixd.engine[engine][handle].peerId) {
          var message = msg.toString();  // DEBUG: console.log(' [.] transport torrent: incoming message '+fromPeerId+' '+message);
          // peer announcements: register new users in peer list (and return announce)
          if(message.substr(0,2)==='@|'||message.substr(0,2)==='~|') {
            // determine if peer relay message
            var relay = message.substr(0,1)==='~'||false;
            // store information in peer table
            message = message.substr(2).split('|');
            var fromNodeId = message[0];
            if(fromNodeId !== nodeId) {
              if(!relay) {
                if(!global.hybrixd.engine[engine][handle].peers.hasOwnProperty(fromNodeId)) {
                  console.log(' [.] transport torrent: peer ['+fromPeerId+'] online');
                  // announce self (return endpoint information)
                  var message = '@|'+nodeId+'|'+global.hybrixd.engine[engine].endpoints.join();
                  // init announce message must be directly through the socket to start filling remote empty peer list
                  global.hybrixd.engine[engine][handle].socket.send(Buffer.from(message), fromPeerId);
                  console.log(' [.] transport torrent: returning endpoint information to peer ['+fromPeerId+']');
                  global.hybrixd.engine[engine][handle].peers[fromNodeId]={peerId:fromPeerId,time:(new Date).getTime()};
                } else {
                  global.hybrixd.engine[engine][handle].peers[fromNodeId].time=(new Date).getTime();
                }
              } else {
                if(!global.hybrixd.engine[engine][handle].peers.hasOwnProperty(fromNodeId)) {
                  global.hybrixd.engine[engine][handle].peers[fromNodeId] = { peerId:null };
                }                
                global.hybrixd.engine[engine][handle].peers[fromNodeId].time=(new Date).getTime();
                console.log(' [.] transport torrent: relay peer information from node '+fromNodeId);
              }
              functions.managePeerURIs(engine,handle,relay||fromPeerId,fromNodeId,message[1]);
            }
          } else {
            // split message into functional parts
            var messageContent = message.substr(message.indexOf('|',1)+1,message.length);  // assemble content of message
            message = message.split('|');
            var nodeIdTarget = message.shift();                 // get nodeIdTarget
            if(nodeIdTarget==='*' || nodeIdTarget===nodeId) {   // message addressed to us?
              var messageId = message.shift();                  // get unique ID
              var timenow = (new Date).getTime();               // add internal timestamp
              // skip messages if buffer becomes too large!
              if(global.hybrixd.engine[engine][handle].buffer.id.length<global.hybrixd.engine[engine].announceMaxBufferSize) {
                global.hybrixd.engine[engine][handle].buffer.id.push(messageId);
                global.hybrixd.engine[engine][handle].buffer.time.push(timenow);
                global.hybrixd.engine[engine][handle].buffer.data.push(messageContent);
                console.log(' [.] transport torrent: message arrived for ['+nodeIdTarget+'] | '+messageId+' | '+messageContent); 
              } else {
                console.log(' [!] transport torrent: buffer overflow, discarding messages!');
              }
            } // TODO: deduplication - if message to another peer cannot be found in other handles after 30 seconds, insert into other handles
          }
        }
    });
    global.hybrixd.engine[engine][handle].socket.on("peer", (fromPeerId) => {
      // announce self (to new peer)
      if(global.hybrixd.engine[engine][handle].hasOwnProperty('peers')) {
        var peersArray = Object.keys(global.hybrixd.engine[engine][handle].peers);
        var newPeer = true;
        for (var i=0;i<peersArray.length;i++) {
          if(global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId===fromPeerId) {
            newPeer = false;
          }
        }
        if(newPeer) {
          // init announce message must be directly through the socket to start filling remote empty peer list
          var message = '@|'+nodeId+'|'+global.hybrixd.engine[engine].endpoints.join();
          global.hybrixd.engine[engine][handle].socket.send(Buffer.from(message), fromPeerId);
        }
      }
    });
    // event: going offline
    global.hybrixd.engine[engine][handle].socket.on("offline", (fromPeerId) => {
      console.log(' [.] transport torrent: peer ['+fromPeerId+'] offline');
      // perform housecleaning of peer list
      if(global.hybrixd.engine[engine][handle].hasOwnProperty('peers')) {
        var peersArray = Object.keys(global.hybrixd.engine[engine][handle].peers);
        for (var i=0;i<peersArray.length;i++) {
          if(global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId===fromPeerId) {
            console.log(' [.] transport torrent: peer ['+global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId+'] offline');
            delete global.hybrixd.engine[engine][handle].peers[peersArray[i]];
          }
        }
      }
    });
    // event: warnings and errors
    global.hybrixd.engine[engine][handle].socket.on("warning", (err) => {
        console.log(' [!] transport torrent: Error! '+err.message);
    });              
    // some simplistic progress reporting - TODO: make better than guesstimate
    functions.progress(processID,10);
  } else {
    // return handle when socket already open
    scheduler.stop(processID, 0, handle);
  }

}

function stop(processID,engine,handle) {
    functions.progress(processID,3);
    clearInterval(global.hybrixd.engine[engine][handle].announce);
    global.hybrixd.engine[engine][handle].socket.close(function() {
      setTimeout(function() {
        functions.removeEndpoint(engine,'torrent://'+global.hybrixd.engine[engine][handle].channel+'/'+global.hybrixd.engine[engine][handle].peerId);
        functions.removeHandle(engine,handle);
        scheduler.stop(processID, 0, 'torrent socket closed');
        console.log(' [i] transport torrent: stopped and closed socket '+handle);        
      },3000);
    });
}

exports.open = open;
exports.stop = stop;
