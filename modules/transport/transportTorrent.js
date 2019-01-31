var scheduler = require('../../lib/scheduler');

function open(processID,engine,channel,passwd,hashSalt) {
  var shaHash = require('js-sha256').sha224
  var openTime = (new Date).getTime();
  var nodeId = global.hybrixd.nodeId;
    // TODO: when wrong host or channel input, warn user and quit!!
  var handle = shaHash(nodeId+channel+passwd+hashSalt).substr(16,24);;

  if(typeof global.hybrixd.engine[engine][handle]==='undefined') {
    var peerNetwork = require('./torrent/peer-network-fork');          
    // setup the torrent socket
    global.hybrixd.engine[engine][handle] = { opened:openTime,protocol:'torrent',channel:channel,peerId:null,peers:[] };
    // start the torrent socket
    global.hybrixd.engine[engine][handle].socket = new peerNetwork({ group:channel, password:passwd });               
    global.hybrixd.engine[engine][handle].socket.start();
    // event: event fires when online
    global.hybrixd.engine[engine][handle].socket.on("ready", (peerId) => {
      console.log(' [i] transport torrent: connected as peer ['+peerId+']');
      endpoint = 'torrent://'+channel+'/'+peerId;
      if(global.hybrixd.engine[engine].endpoints.indexOf(endpoint)===-1) {
        global.hybrixd.engine[engine].endpoints.push(endpoint);
        global.hybrixd.engine[engine].handles.push(handle);
        global.hybrixd.engine[engine][handle].peerId = peerId;
        // announce self -> MAY NOT BE NECESSARY, SINCE PEERING TAKES CARE OF ANNOUNCES?
        /*
        global.hybrixd.engine[engine][handle].announce = setInterval(function() {
          torrentBroadcast(target,handle,message);
          //global.hybrixd.engine[engine][handle].socket.send(Buffer.from('@|'+nodeId+'|'+global.hybrixd.engine[engine].endpoints.join()), peerId);
        },60000,target,handle,chan,nodeId);
        */
        scheduler.stop(processID, 0, handle);
      }
    // event: incoming message on channel
    }).on("message", (msg, fromPeerId) => {
        // ignore self
        if(fromPeerId !== global.hybrixd.engine[engine][handle].peerId) {
          var message = msg.toString();
          console.log(' [.] transport torrent: incoming message '+from+':'+msg.toString());
          // if it is a peer announcement, return the favour
          if(message.substr(0,2)='@|') {
            // store information in peer table
            message = message.substr(2).split('|');
            var peer = { nodeId:'',peerId:'',data:'' };
            peer.nodeId = message[0];
            peer.peerId = from;
            global.hybrixd.engine[engine][handle].peers[peer.nodeId]={peerId:from,time:(new Date).getTime()};
            console.log(' [.] transport torrent: peer ['+peer.peerId+'] online');
            var peers = message[1].split(',');
            for (var i=0;i<peers.length;i++) {
              if(!global.hybrixd.engine[engine].peersURIs.hasOwnProperty(peer.nodeId)) {
                global.hybrixd.engine[engine].peersURIs[peer.nodeId] = [];
              }
              if(global.hybrixd.engine[engine].peersURIs[peer.nodeId].indexOf(peers[i])===-1) {
                global.hybrixd.engine[engine].peersURIs[peer.nodeId].push(peers[i]);
                if(global.hybrixd.engine[engine].peersURIs[peer.nodeId].length>24) {
                  global.hybrixd.engine[engine].peersURIs[peer.nodeId].shift();
                }
              }
            }
            // announce self
            global.hybrixd.engine[engine][handle].socket.send(Buffer.from('@|'+nodeId+'|'+global.hybrixd.engine[engine].endpoints.join()), fromPeerId);
            console.log(' [.] transport torrent: giving endpoint information to peer ['+peerId+']');
          } else {
            // skip messages if buffer becomes too large!
            if(global.hybrixd.engine[engine][handle].buffer.length<global.hybrixd.engine[engine].announceMaxBufferSize) {
              global.hybrixd.engine[engine][handle].buffer.push(msg.toString());
            } else {
              console.log(' [!] transport torrent: buffer overflow, discarding messages!');
            }
          }
        }
    }).on("peer", (peerId) => {
        console.log(' [.] transport torrent: peer ['+peerId+'] online');
        // announce self
        global.hybrixd.engine[engine][handle].socket.send(Buffer.from('@|'+nodeId+'|'+global.hybrixd.engine[engine].endpoints.join()), peerId);
    // event: going offline
    }).on("offline", (peerId) => {
        console.log(' [.] transport torrent: peer ['+peerId+'] offline');
        // remove peer from peer list
        global.hybrixd.engine[engine][handle].peers = global.hybrixd.engine[engine][handle].peers.filter(function(e) { return e !== peerId });
        // perform housecleaning of peer list
        var peersArray = Object.keys(global.hybrixd.engine[engine][handle].peers);
        //var timenow = (new Date).getTime();
        for (var i=0;i<peersArray.length;i++) {
          if(global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId===peerId) {
            console.log(' [.] transport torrent: peer ['+global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId+'] offline');
            delete global.hybrixd.engine[engine][handle].peers[peersArray[i]];
          }
        }
        
    // event: warnings and errors
    }).on("warning", (err) => {
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
