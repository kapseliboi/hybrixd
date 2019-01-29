// (C) 2015 Internet of Coins / Joachim de Koning
// hybrixd module - transport-irc/module.js
// Module to enable announcements

// required libraries in this context
//var execSync = require('child_process').execSync;
var scheduler = require('../../lib/scheduler');
var modules = require('../../lib/modules');

// exports
exports.init = init;
exports.exec = exec;
exports.meta = meta;

// initialization function
function init () {
  modules.initexec('transport', ['init']);
}

// exec
function exec(properties) {
  // decode our serialized properties
  var processID = properties.processID;
  var target = properties.target;
  var command = properties.command;
  var result = null;
  // set request to what command we are performing
  global.hybrixd.proc[processID].request = properties.command;
  global.hybrixd.proc[processID].timeout = 30000;
  // handle standard cases here, and construct the sequential process list
  switch (command[0]) {
    case 'init' :
      console.log(" [.] transport module initialization ");
      global.hybrixd.engine[target.id].handles = [];
      global.hybrixd.engine[target.id].announceMaxBufferSize = 10000;
      scheduler.stop(processID, 0, null);
      break;
    //  /engine/transport/open/irc/$HOST_OR_IP/$CHANNEL  ->  connect to host/channel
    case 'open' :
      if(typeof command[1]==='undefined') {
        result = ['irc','torrent'];
        scheduler.stop(processID, 0, result);
      } else {
        var nodeId = target.nodeId;
        var openTime = (new Date).getTime();
        var protocol = command[1];
        var shaHash = require('js-sha256').sha224
        var hashSalt = 'Th1s1sS0m3S4lty3ntr0pyf0rTh0s3H4sh1ngFunct10ns!';
        switch (protocol) {
          case 'irc':
            // TODO: when wrong host or channel input, warn user and quit!!
            var host = typeof command[2]==='undefined'?'irc.freenode.net':command[2];           // irc.freenode.net
            var chan = (typeof command[3]==='undefined'?target.defaultChannel:command[3]).toLowerCase();      // #hybrixAnnouncements
            var handle = shaHash(nodeId+host+chan+hashSalt).substr(16,24);;

            if(typeof global.hybrixd.engine[target.id][handle]==='undefined') {
              var irc = require('irc');
              // setup the irc socket
              var peerId = 'H'+shaHash(nodeId+openTime+hashSalt).substr(0,15);
              global.hybrixd.engine[target.id][handle] = { opened:openTime,protocol:'irc',channel:chan,host:host,peerId:peerId };
              // start the irc socket
              global.hybrixd.engine[target.id][handle].socket = new irc.Client(host, peerId, {
                showErrors: false,
                autoRejoin: true,
                autoConnect: true,
                secure: false,        // TODO: SSL?
                selfSigned: false,
                certExpired: false,
                floodProtection: true,
                floodProtectionDelay: 1000,
                channels: ['#'+chan],
                sasl: false,
                retryCount: 9999,
                retryDelay: 2000,
                stripColors: false,
                channelPrefixes: "&#",
                messageSplit: 512,
                encoding: '',
                onNickConflict: function() {
                   global.hybrixd.engine[target.id][handle].peerId = shaHash(nodeId+(new Date).getTime()+hashSalt).substr(0,16);
                   return global.hybrixd.engine[target.id][handle].peerId;
                }
              });
              // event: event fires when online
              global.hybrixd.engine[target.id][handle].socket.addListener('registered', function(message) {
                console.log(' [i] transport irc: ready as peer ['+global.hybrixd.engine[target.id][handle].peerId+']');
                global.hybrixd.endpoints.push('irc://'+host+'/'+chan+'/'+global.hybrixd.engine[target.id][handle].peerId);
                global.hybrixd.engine[target.id].handles.push(handle);
                global.hybrixd.engine[target.id][handle].buffer = [];
                // announce self
                global.hybrixd.engine[target.id][handle].announce = setInterval(function() {
                  global.hybrixd.engine[target.id][handle].socket.say('#'+chan,'@|'+nodeId+'|'+global.hybrixd.endpoints.join());
                },60000,target,handle,chan,nodeId);
                scheduler.stop(processID, 0, handle);   
              });
              // event: incoming message on channel
              global.hybrixd.engine[target.id][handle].socket.addListener('message#'+chan, function(from,message) {
                console.log(' [.] transport irc: message '+from+' | '+message);
                // register new users in peer list
                if(message.substr(0,2)==='@|') {
                  var peerdata = message.substr(2).split('|');
                  console.log(' [.] transport torrent: node information added to peerlist - '+peerdata[0]+' '+peerdata[1]);
                } else {
                  // skip messages if buffer becomes too large!
                  if(global.hybrixd.engine[target.id][handle].buffer.length<global.hybrixd.engine[target.id].announceMaxBufferSize) {
                    global.hybrixd.engine[target.id][handle].buffer.push(message);
                  } else {
                    console.log(' [!] transport irc: buffer overflow, discarding messages!');
                  }
                }
              });
              global.hybrixd.engine[target.id][handle].socket.addListener('names#'+chan, function(peerArray) {
                global.hybrixd.engine[target.id][handle].peers = Object.keys(peerArray);
                // filter admin, moderator flags
                for (var i=0;i++;i<global.hybrixd.engine[target.id][handle].peers.length) {
                  global.hybrixd.engine[target.id][handle].peers[i].replace(new RegExp('^[\+\@]+'),'');
                }
                // ignore self
                var i = global.hybrixd.engine[target.id][handle].peers.indexOf(global.hybrixd.engine[target.id][handle].peerId);
                if (i > -1) {
                  global.hybrixd.engine[target.id][handle].peers.splice(i, 1);
                }
                console.log(' [.] transport irc: peer list updated '+JSON.stringify(global.hybrixd.engine[target.id][handle].peers));
              });
              // event: warnings and errors
              global.hybrixd.engine[target.id][handle].socket.addListener('error', function(message) {
                console.log(' [!] transport irc: Error! '+JSON.stringify(message));
              });
              // some simplistic progress reporting - TODO: make better than guesstimate
              simpleProgress(processID,10);                     
            } else {
              // return handle when socket already open
              scheduler.stop(processID, 0, handle);
            }
          break;
          case 'torrent':
            var channel  = typeof command[2]==='undefined'?target.defaultChannel:command[2];
            var passwd = typeof command[3]==='undefined'?'l3ts_b34t_th3_b4nks!':command[3];
            var handle = shaHash(nodeId+channel+passwd+hashSalt).substr(16,24);;
            if(typeof global.hybrixd.engine[target.id][handle]==='undefined') {
              var peerNetwork = require('./torrent/peer-network-fork');          
              // setup the torrent socket
              global.hybrixd.engine[target.id][handle] = { opened:openTime,protocol:'torrent',channel:target.defaultChannel };
              global.hybrixd.engine[target.id][handle].host = host;
              global.hybrixd.engine[target.id][handle].socket = new peerNetwork({ group: channel, password: passwd });               
              // start the torrent socket
              global.hybrixd.engine[target.id][handle].socket.start();
              // event: event fires when online
              global.hybrixd.engine[target.id][handle].socket.on("ready", (peerId) => {
                  console.log(' [i] transport torrent: ready as peer ['+peerId+']');
                  global.hybrixd.endpoints.push('torrent://'+channel+'/'+peerId);
                  global.hybrixd.engine[target.id].handles.push(handle);
                  global.hybrixd.engine[target.id][handle].peerId = peerId;
                  // announce self -> MAY NOT BE NECESSARY, SINCE PEERING TAKES CARE OF ANNOUNCE
                  /*
                  global.hybrixd.engine[target.id][handle].announce = setInterval(function() {
                    torrentBroadcast(target,handle,message);
                    //global.hybrixd.engine[target.id][handle].socket.send(Buffer.from('@|'+nodeId+'|'+global.hybrixd.endpoints.join()), peerId);
                  },60000,target,handle,chan,nodeId);
                  */
                  scheduler.stop(processID, 0, handle);
              // event: incoming message on channel
              }).on("message", (msg, fromPeerId) => {
                  // ignore self
                  if(fromPeerId !== global.hybrixd.engine[target.id][handle].peerId) {
                    var message = msg.toString();
                    console.log(' [.] transport torrent: incoming message '+from+':'+msg.toString());
                    // if it is a peer announcement, return the favour
                    if(message.substr(0,2)='@|') {
                      global.hybrixd.engine[target.id][handle].socket.send(Buffer.from('@|'+nodeId+'|'+global.hybrixd.endpoints.join()), fromPeerId);
                      console.log(' [.] transport torrent: giving endpoint information to peer ['+peerId+']');
                    } else {
                      // skip messages if buffer becomes too large!
                      if(global.hybrixd.engine[target.id][handle].buffer.length<global.hybrixd.engine[target.id].announceMaxBufferSize) {
                        global.hybrixd.engine[target.id][handle].buffer.push(msg.toString());
                      } else {
                        console.log(' [!] transport torrent: buffer overflow, discarding messages!');
                      }
                    }
                  }
              }).on("peer", (peerId) => {
                  console.log(' [.] transport torrent: peer ['+peerId+'] online');
                  // announce self
                  global.hybrixd.engine[target.id][handle].socket.send(Buffer.from('@|'+nodeId+'|'+global.hybrixd.endpoints.join()), peerId);
                  global.hybrixd.engine[target.id][handle].peers.push(peerId);
              // event: going offline
              }).on("offline", (peerId) => {
                  console.log(' [.] transport torrent: peer ['+peerId+'] offline');
                  // remove peer from peer list
                  global.hybrixd.engine[target.id][handle].peers = global.hybrixd.engine[target.id][handle].peers.filter(function(e) { return e !== peerId });
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
          break;
        }
      }
      break;
    case 'info' :
      var handle = command[1];
      if(global.hybrixd.engine[target.id].handles.indexOf(handle)>-1) {        
        if(global.hybrixd.engine[target.id].hasOwnProperty(handle) && global.hybrixd.engine[target.id][handle].hasOwnProperty('protocol')) {
          var information = {
            handle : handle,
            opened : global.hybrixd.engine[target.id][handle].opened,
            protocol : global.hybrixd.engine[target.id][handle].protocol,
            channel : global.hybrixd.engine[target.id][handle].channel,
            peerId : global.hybrixd.engine[target.id][handle].peerId,
            peers : global.hybrixd.engine[target.id][handle].peers            
          }
          scheduler.stop(processID, 0, information);
        } else {
          scheduler.stop(processID, 500, 'Transport not yet fully initialized. Please try again later!');
        }
      } else {
        scheduler.stop(processID, 404, 'Transport handle does not exist!');
      }
      break;
    case 'cron' :
      break;
    case 'send':
      var handle = command[1];
      var target = command[2];
      if(global.hybrixd.engine[target.id].handles.indexOf(handle)>-1) {        
        if(global.hybrixd.engine[target.id].hasOwnProperty(handle) && global.hybrixd.engine[target.id][handle].hasOwnProperty('protocol')) {
          switch (global.hybrixd.engine[target.id][handle].protocol) {
            case 'irc':
                /* message composition:
                *  example API calls:
                *                      send/$HANDLE/$NodeIdTarget/$ENCRYPTED_MESSAGE
                *                      send/ * /S/tor:
                * 
                *  example messages:   @|$NODEID|tor://3e35r53e23e4,irc://myNode,http://133.212.20.11/api   --   announce nodeId/key, endpoints
                *                      $PEERID|$ENCRYPTED_MESSAGE  --  a message contains its own unique ID to make sure there are no doubles
                */
              // user $target to encrypt message
              
            break;
            case 'torrent':
            break;
          }
        }
      }
      break;    
    case 'list':
      var err = 0;
      var result;
      switch (command[1]) {
        case 'endpoints':
          result = global.hybrixd.endpoints;
        break;
        case 'handles':
          result = global.hybrixd.engine[target.id].handles;
        break;
        case 'peers':
          err = 1;
          result = 'Not yet implemented';
        break;
        default:
          result = ['endpoints','handles','peers'];
        break;
      }
      scheduler.stop(processID, err, result);
      break;
    case 'seek':
    //  /engine/transport-irc/seek/$HANDLE/[$OFFSET]  ->  seek specific announces on host/channel, returns array
      break;          
    case 'stop':
      var handle = command[1];
      if(global.hybrixd.engine[target.id].handles.indexOf(handle)>-1) {        
        if(global.hybrixd.engine[target.id].hasOwnProperty(handle) && global.hybrixd.engine[target.id][handle].hasOwnProperty('protocol')) {
          switch (global.hybrixd.engine[target.id][handle].protocol) {
            case 'irc':
              simpleProgress(processID,8);
              clearInterval(global.hybrixd.engine[target.id][handle].announce);
              global.hybrixd.engine[target.id][handle].socket.part('#'+global.hybrixd.engine[target.id][handle].channel);
              setTimeout(function() {
                removeEndpoint('irc://'+global.hybrixd.engine[target.id][handle].host+'/'+global.hybrixd.engine[target.id][handle].channel+'/'+global.hybrixd.engine[target.id][handle].peerId);
                removeHandle(target.id,handle);
                scheduler.stop(processID, 0, 'irc socket closed');
                console.log(' [i] transport irc: stopped and closed socket '+handle);
              },8000,target,handle,processID);
            break;
            case 'torrent':
              simpleProgress(processID,3);
              clearInterval(global.hybrixd.engine[target.id][handle].announce);
              global.hybrixd.engine[target.id][handle].socket.close(function() {
                removeEndpoint('torrent://'+global.hybrixd.engine[target.id][handle].channel+'/'+global.hybrixd.engine[target.id][handle].peerId);
                removeHandle(target.id,handle);
                setTimeout(function() {
                  scheduler.stop(processID, 0, 'torrent socket closed');
                  console.log(' [i] transport torrent: stopped and closed socket '+handle);
                },3000,target,handle,processID);
              });
              simpleProgress(processID,3);
            break;
            default:
              scheduler.stop(processID, 1, 'Cannot close socket! Protocol not recognized!');
            break;
          }
        } else {
          scheduler.stop(processID, 500, 'Transport not yet fully bootstrapped. Please try again later!');
        }
      } else {
        scheduler.stop(processID, 404, 'Transport handle does not exist!');
      }
      break;
  }
}

function removeEndpoint(endpoint) {
  var index = global.hybrixd.endpoints.indexOf(endpoint);
  if (index > -1) {
    global.hybrixd.endpoints.splice(index, 1);
  }
}

function removeHandle(targetId,handle) {
  var index = global.hybrixd.engine[targetId].handles.indexOf(handle);
  if (index > -1) {
    global.hybrixd.engine[targetId].handles.splice(index, 1);
  }
  delete global.hybrixd.engine[targetId][handle];
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

var meta = function (properties) {
  var processID = properties.processID;
  storage.getMeta(properties.key,
    meta => { scheduler.stop(processID, 0, meta); },
    error => { scheduler.stop(processID, 1, error); }
  );
};
