var scheduler = require('../../lib/scheduler');
var functions = require('./functions.js');

function open(processID,engine,host,chan,hashSalt) {
  var shaHash = require('js-sha256').sha224
  var openTime = (new Date).getTime();
  var nodeId = global.hybrixd.nodeId;
    // TODO: when wrong host or channel input, warn user and quit!!
  var handle = shaHash(nodeId+host+chan+hashSalt).substr(16,24);;

  if(typeof global.hybrixd.engine[engine][handle]==='undefined') {
    var irc = require('irc');
    var port = 6667;
    // setup the irc socket
    var peerId = 'h'+shaHash(nodeId+openTime+hashSalt).substr(0,15);
    global.hybrixd.engine[engine][handle] = { opened:openTime,protocol:'irc',host:host,channel:chan,peerId:peerId,peers:{} };
    // start the irc socket
    global.hybrixd.engine[engine][handle].socket = new irc.Client(host, peerId, {
      port: port,
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
         global.hybrixd.engine[engine][handle].peerId = shaHash(nodeId+(new Date).getTime()+hashSalt).substr(0,16);
         return global.hybrixd.engine[engine][handle].peerId;
      }
    });
    // event: event fires when online
    global.hybrixd.engine[engine][handle].socket.addListener('registered', function(message) {
      console.log(' [i] transport irc: connected as peer ['+global.hybrixd.engine[engine][handle].peerId+'] on port '+port);
      var endpoint = 'irc://'+host+'/'+chan+'/'+global.hybrixd.engine[engine][handle].peerId;
      if(global.hybrixd.engine[engine].endpoints.indexOf(endpoint)===-1) {
        global.hybrixd.engine[engine].endpoints.push(endpoint);
        global.hybrixd.engine[engine].handles.push(handle);
        global.hybrixd.engine[engine][handle].buffer = { id:[],time:[],data:[] };
        scheduler.stop(processID, 0, handle);   
      }
      // send message function
      global.hybrixd.engine[engine][handle].send = function (engine,handle,message) {
        global.hybrixd.engine[engine][handle].socket.say('#'+global.hybrixd.engine[engine][handle].channel,message);
      }
      // peer maintenance interval
      clearInterval(global.hybrixd.engine[engine][handle].announce);
      global.hybrixd.engine[engine][handle].announce = setInterval(function() {
        // announce self
        global.hybrixd.engine[engine][handle].send(engine,handle,'@|'+nodeId+'|'+global.hybrixd.engine[engine].endpoints.join());
        // perform housecleaning of peer list
        var peersArray = Object.keys(global.hybrixd.engine[engine][handle].peers);
        var timenow = (new Date).getTime();
        var relayPeers, relayHandles;
        for (var i=0;i<peersArray.length;i++) {
          // delete idle peers
          if((Number(global.hybrixd.engine[engine][handle].peers[peersArray[i]].time)+90000)<timenow) {
            if(global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId) {
              // only mention non-relayed peers going offline
              console.log(' [.] transport irc: peer ['+global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId+'] offline');
            }
            delete global.hybrixd.engine[engine][handle].peers[peersArray[i]];
          }
          // deduplicate peer announce if not found on other channels
          relayPeers = functions.relayPeers(engine,handle,peersArray[i]);
        }
        // TODO: deduplicate messages not found on other channels
      },30000,engine,handle,chan,nodeId);
    });
    // event: incoming message on channel
    global.hybrixd.engine[engine][handle].socket.addListener('message#'+chan, function(from,message) {
      // peer announcements: register new users in peer list
      if(message.substr(0,2)==='@|'||message.substr(0,2)==='~|') {
        // determine if peer relay message
        var relay = message.substr(0,1)==='~'||false;
        // store information in peer table
        message = message.substr(2).split('|');
        var fromNodeId = message[0];
        if(fromNodeId !== nodeId) {
          if(!relay) {
            var fromPeerId = from;
            if(!global.hybrixd.engine[engine][handle].peers.hasOwnProperty(fromNodeId)) {
              console.log(' [.] transport irc: peer ['+fromPeerId+'] online');
              global.hybrixd.engine[engine][handle].peers[fromNodeId]={peerId:fromPeerId,time:(new Date).getTime()};
            } else {
              global.hybrixd.engine[engine][handle].peers[fromNodeId].time=(new Date).getTime();
            }
          } else {
            if(!global.hybrixd.engine[engine][handle].peers.hasOwnProperty(fromNodeId)) {
              global.hybrixd.engine[engine][handle].peers[fromNodeId] = { peerId:null };
            }
            global.hybrixd.engine[engine][handle].peers[fromNodeId].time=(new Date).getTime();
            console.log(' [.] transport irc: relay peer information from node '+fromNodeId);
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
            console.log(' [.] transport irc: message arrived for ['+nodeIdTarget+'] | '+messageId+' | '+messageContent); 
          } else {
            console.log(' [!] transport irc: buffer overflow, discarding messages!');
          }
        } // TODO: deduplication - if message to another peer cannot be found in other handles after 30 seconds, insert into other handles
      }
    });
    // event: warnings and errors
    global.hybrixd.engine[engine][handle].socket.addListener('error', function(message) {
      console.log(' [!] transport irc: Error! '+JSON.stringify(message));
    });
    // some simplistic progress reporting - TODO: make better than guesstimate
    functions.progress(processID,10);                     
  } else {
    // return handle when socket already open
    scheduler.stop(processID, 0, handle);
  }
}

function stop(processID,engine,handle,callback) {
  functions.progress(processID,8);
  clearInterval(global.hybrixd.engine[engine][handle].announce);
  global.hybrixd.engine[engine][handle].socket.part('#'+global.hybrixd.engine[engine][handle].channel);
  setTimeout(function() {
    functions.removeEndpoint(engine,'irc://'+global.hybrixd.engine[engine][handle].host+'/'+global.hybrixd.engine[engine][handle].channel+'/'+global.hybrixd.engine[engine][handle].peerId);
    functions.removeHandle(engine,handle);
    scheduler.stop(processID, 0, 'irc socket closed');
    console.log(' [i] transport irc: stopped and closed socket '+handle);
  },8000);
}

exports.open = open;
exports.stop = stop;
