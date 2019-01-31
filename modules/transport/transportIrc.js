var scheduler = require('../../lib/scheduler');

function open(processID,engine,host,chan,hashSalt) {
  var shaHash = require('js-sha256').sha224
  var openTime = (new Date).getTime();
  var nodeId = global.hybrixd.nodeId;
    // TODO: when wrong host or channel input, warn user and quit!!
  var handle = shaHash(nodeId+host+chan+hashSalt).substr(16,24);;

  if(typeof global.hybrixd.engine[engine][handle]==='undefined') {
    var irc = require('irc');
    // setup the irc socket
    var peerId = 'H'+shaHash(nodeId+openTime+hashSalt).substr(0,15);
    global.hybrixd.engine[engine][handle] = { opened:openTime,protocol:'irc',channel:chan,host:host,peerId:peerId,peers:{} };
    // start the irc socket
    global.hybrixd.engine[engine][handle].socket = new irc.Client(host, peerId, {
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
      console.log(' [i] transport irc: connected as peer ['+global.hybrixd.engine[engine][handle].peerId+']');
      var endpoint = 'irc://'+host+'/'+chan+'/'+global.hybrixd.engine[engine][handle].peerId;
      if(global.hybrixd.engine[engine].endpoints.indexOf(endpoint)===-1) {
        global.hybrixd.engine[engine].endpoints.push(endpoint);
        global.hybrixd.engine[engine].handles.push(handle);
        global.hybrixd.engine[engine][handle].buffer = [];
        scheduler.stop(processID, 0, handle);   
      }
      // peer maintenance interval
      clearInterval(global.hybrixd.engine[engine][handle].announce);
      global.hybrixd.engine[engine][handle].announce = setInterval(function() {
        // announce self
        global.hybrixd.engine[engine][handle].socket.say('#'+chan,'@|'+nodeId+'|'+global.hybrixd.engine[engine].endpoints.join());
        // perform housecleaning of peer list
        var peersArray = Object.keys(global.hybrixd.engine[engine][handle].peers);
        var timenow = (new Date).getTime();
        for (var i=0;i<peersArray.length;i++) {
          if(global.hybrixd.engine[engine][handle].peers[peersArray[i]].time+120<timenow) {
            console.log(' [.] transport irc: peer ['+global.hybrixd.engine[engine][handle].peers[peersArray[i]].peerId+'] offline');
            delete global.hybrixd.engine[engine][handle].peers[peersArray[i]];
          }
        }
      },60000,engine,handle,chan,nodeId);
    });
    // event: incoming message on channel
    global.hybrixd.engine[engine][handle].socket.addListener('message#'+chan, function(from,message) {
      console.log(' [.] transport irc: message '+from+' | '+message);
      // register new users in peer list
      if(message.substr(0,2)==='@|') {
        // store information in peer table
        message = message.substr(2).split('|');
        var peer = { nodeId:'',peerId:'',data:'' };
        peer.nodeId = message[0];
        peer.peerId = from;
        global.hybrixd.engine[engine][handle].peers[peer.nodeId]={peerId:from,time:(new Date).getTime()};
        console.log(' [.] transport irc: peer ['+peer.peerId+'] online');
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
      } else {
        // skip messages if buffer becomes too large!
        if(global.hybrixd.engine[engine][handle].buffer.length<global.hybrixd.engine[engine].announceMaxBufferSize) {
          global.hybrixd.engine[engine][handle].buffer.push(message);
        } else {
          console.log(' [!] transport irc: buffer overflow, discarding messages!');
        }
      }
    });
    /* DEPRECATED IN FAVOUR OF ANNOUNCED PEERING
    global.hybrixd.engine[engine][handle].socket.addListener('names#'+chan, function(peersObj) {
      var peersArray = Object.keys(peersObj);
      // ignore self
      var i = peersArray.indexOf(global.hybrixd.engine[engine][handle].peerId);
      if (i > -1) {
        peersArray.splice(i, 1);
      }
      // insert into peers table, and filter admin + moderator flags
      for (var i=0;i++;i<peersArray.length) {
        peersArray[i].replace(new RegExp('^[\+\@]+'),'');
        global.hybrixd.engine[engine][handle].peers[peer.nodeId]={peerId:from,time:(new Date).getTime()};        
      }
      
      console.log(' [.] transport irc: peer list updated';
    });
    */
    // event: warnings and errors
    global.hybrixd.engine[engine][handle].socket.addListener('error', function(message) {
      console.log(' [!] transport irc: Error! '+JSON.stringify(message));
    });
    // some simplistic progress reporting - TODO: make better than guesstimate
    simpleProgress(processID,10);                     
  } else {
    // return handle when socket already open
    scheduler.stop(processID, 0, handle);
  }
}

function stop(processID,engine,handle,callback) {
  simpleProgress(processID,8);
  clearInterval(global.hybrixd.engine[engine][handle].announce);
  global.hybrixd.engine[engine][handle].socket.part('#'+global.hybrixd.engine[engine][handle].channel);
  setTimeout(function() {
    callback();
  },8000);
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
