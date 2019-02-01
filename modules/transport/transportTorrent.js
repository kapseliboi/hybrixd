var scheduler = require('../../lib/scheduler');

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
      console.log(' [i] transport torrent: connected as peer ['+peerId+'] on port '+port);
      endpoint = 'torrent://'+channel+'/'+peerId;
      if(global.hybrixd.engine[engine].endpoints.indexOf(endpoint)===-1) {
        global.hybrixd.engine[engine].endpoints.push(endpoint);
        global.hybrixd.engine[engine].handles.push(handle);
        global.hybrixd.engine[engine][handle].peerId = peerId;
        global.hybrixd.engine[engine][handle].buffer = { id:[],time:[],data:[] };
        scheduler.stop(processID, 0, handle);
      }
    // event: incoming message on channel
    });
    global.hybrixd.engine[engine][handle].socket.on("message", (msg, fromPeerId) => {
        // ignore self
        if(fromPeerId !== global.hybrixd.engine[engine][handle].peerId) {
          var message = msg.toString();
          console.log(' [.] transport torrent: incoming message '+fromPeerId+' '+message);
          // peer announcements: register new users in peer list (and return announce)
          if(message.substr(0,2)==='@|') {
            // store information in peer table
            message = message.substr(2).split('|');
            var peer = { nodeId:'',peerId:'',data:'' };
            fromNodeId = message[0];
            if(!global.hybrixd.engine[engine][handle].peers.hasOwnProperty(fromNodeId)) {
              console.log(' [.] transport torrent: peer ['+fromPeerId+'] online');
              // announce self (return endpoint information)
              global.hybrixd.engine[engine][handle].socket.send(Buffer.from('@|'+nodeId+'|'+global.hybrixd.engine[engine].endpoints.join()), fromPeerId);
              console.log(' [.] transport torrent: returning endpoint information to peer ['+fromPeerId+']');
              // add peer URI to list
              var peers = message[1].split(',');
              for (var i=0;i<peers.length;i++) {
                if(!global.hybrixd.engine[engine].peersURIs.hasOwnProperty(fromNodeId)) {
                  global.hybrixd.engine[engine].peersURIs[fromNodeId] = [];
                }
                if(global.hybrixd.engine[engine].peersURIs[fromNodeId].indexOf(peers[i])===-1) {
                  global.hybrixd.engine[engine].peersURIs[fromNodeId].splice(0,0,peers[i]);
                  if(global.hybrixd.engine[engine].peersURIs[fromNodeId].length>24) {
                    global.hybrixd.engine[engine].peersURIs[fromNodeId].pop();
                  }
                }
              }
            }
            global.hybrixd.engine[engine][handle].peers[fromNodeId]={peerId:fromPeerId,time:(new Date).getTime()};
          } else {
            // split message into functional parts
            message = message.split('|');
            var nodeIdTarget = message.shift();                 // get nodeIdTarget
            if(nodeIdTarget==='*' || nodeIdTarget===nodeId) {   // message addressed to us?
              var messageId = message.shift();                  // get unique ID
              var messageContent = message.join('|');           // re-assemble/join rest of message
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
    global.hybrixd.engine[engine][handle].socket.on("peer", (peerId) => {
      // announce self (to new peer)
      if(global.hybrixd.engine[engine][handle].hasOwnProperty('peers')) {
        var peersArray = Object.keys(global.hybrixd.engine[engine][handle].peers);
        var newPeer = true;
        for (var i=0;i<peersArray.length;i++) {
          if(global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId===peerId) {
            newPeer = false;
          }
        }
        if(newPeer) {
          console.log(' [.] transport torrent: peer ['+peerId+'] online');
          global.hybrixd.engine[engine][handle].socket.send(Buffer.from('@|'+nodeId+'|'+global.hybrixd.engine[engine].endpoints.join()), peerId);
        }
      }
    });
    // event: going offline
    global.hybrixd.engine[engine][handle].socket.on("offline", (peerId) => {
      console.log(' [.] transport torrent: peer ['+peerId+'] offline');
      // perform housecleaning of peer list
      if(global.hybrixd.engine[engine][handle].hasOwnProperty('peers')) {
        var peersArray = Object.keys(global.hybrixd.engine[engine][handle].peers);
        for (var i=0;i<peersArray.length;i++) {
          if(global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId===peerId) {
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
    simpleProgress(processID,10);
  } else {
    // return handle when socket already open
    scheduler.stop(processID, 0, handle);
  }

}

function stop(processID,engine,handle,callback) {
    simpleProgress(processID,3);
    clearInterval(global.hybrixd.engine[engine][handle].announce);
    global.hybrixd.engine[engine][handle].socket.close(function() {
      setTimeout(function() {
        callback();
      },3000);
    });
}

function send(processID,engine,handle,nodeIdTarget,messageId,message,hashSalt) {
  var messageContent = nodeIdTarget+'|'+messageId+'|'+message;
  // send message to every peer, or specified peer
  if(global.hybrixd.engine[engine][handle].hasOwnProperty('peers')) {
    var peersArray = Object.keys(global.hybrixd.engine[engine][handle].peers);
    var peerId;
    for (var i=0;i<peersArray.length;i++) {
      if(nodeIdTarget==='*'||nodeIdTarget===peersArray[i]) {
        peerId = global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId;
        global.hybrixd.engine[engine][handle].socket.send(Buffer.from(messageContent), peerId);
        console.log(' [.] DEBUG torrent: message to peer ['+peerId+']');
      }
    }
  }
}

function simpleProgress(processID,count) {
  setTimeout( ()=>{
    if(global.hybrixd.proc[processID].progress<1) {
      global.hybrixd.proc[processID].progress=0.0825;
      setTimeout(()=>{
        if(global.hybrixd.proc[processID].progress<1) {
          global.hybrixd.proc[processID].progress=0.165;
          setTimeout(()=>{
            if(global.hybrixd.proc[processID].progress<1) {
              global.hybrixd.proc[processID].progress=0.33;
              setTimeout(()=>{ if(global.hybrixd.proc[processID].progress<1) { global.hybrixd.proc[processID].progress=0.66; } },(500*count),processID);
            }
          },(250*count),processID);
        }
      },(150*count),processID);
    }
  },(100*count),processID);
}

exports.open = open;
exports.stop = stop;
exports.send = send;
