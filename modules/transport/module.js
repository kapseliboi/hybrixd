// (C) 2015 Internet of Coins / Joachim de Koning
// hybrixd module - transport-irc/module.js
// Module to enable announcements

// required libraries in this context
// var execSync = require('child_process').execSync;
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
function exec (properties) {
  // decode our serialized properties
  var processID = properties.processID;
  var target = properties.target;
  var command = properties.command;
  var result = null;
  // set request to what command we are performing
  global.hybrixd.proc[processID].request = properties.command;
  // handle standard cases here, and construct the sequential process list
  switch (command[0]) {
    case 'init' :
      console.log(' [.] transport module initialization ');
      global.hybrixd.engine[target.id].handles = [];
      global.hybrixd.engine[target.id].announceMaxBufferSize = 10000;
      scheduler.stop(processID, 0, null);
      break;
    //  /engine/transport/open/irc/$HOST_OR_IP/$CHANNEL  ->  connect to host/channel
    case 'open' :
      if (typeof command[1] === 'undefined') {
        result = ['irc', 'torrent'];
        scheduler.stop(processID, 0, result);
      } else {
        var nodeId = target.nodeId;
        var openTime = (new Date()).getTime();
        var protocol = command[1];
        var hashSalt = 'Th1s1sS0m3S4lty3ntr0pyf0rTh0s3H4sh1ngFunct10ns!';
        switch (protocol) {
          case 'irc':
            var host = typeof command[2] === 'undefined' ? 'irc.freenode.net' : command[2]; // irc.freenode.net
            var chan = (typeof command[3] === 'undefined' ? target.defaultChannel : command[3]); // #hybrixAnnouncements
            var handle = nacl.to_hex(nacl.crypto_hash_sha256(nodeId + host + chan + hashSalt));

            if (typeof global.hybrixd.engine[target.id][handle] === 'undefined') {
              var irc = require('irc');
              // setup the irc socket
              global.hybrixd.engine[target.id][handle] = { opened: openTime, protocol: 'irc', channel: chan };
              global.hybrixd.engine[target.id][handle].peerId = nodeId;
              // start the irc socket
              global.hybrixd.engine[target.id][handle].socket = new irc.Client(host, nodeId, {
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
                  global.hybrixd.engine[target.id][handle].peerId = nodeId + '_';
                  return nodeId + '_';
                }
              });
              // event: event fires when online
              global.hybrixd.engine[target.id][handle].socket.addListener('registered', function (message) {
                console.log(' [i] transport irc: ready as peer [' + global.hybrixd.engine[target.id][handle].peerId + ']');
                global.hybrixd.engine[target.id].handles.push(handle);
                global.hybrixd.engine[target.id][handle].buffer = [];
                scheduler.stop(processID, 0, handle);
              });
              // event: incoming message on channel
              global.hybrixd.engine[target.id][handle].socket.addListener('message#' + chan, function (message) {
                console.log(' [.] transport irc: message ' + JSON.stringify(message));
                // skip messages if buffer becomes too large!
                if (global.hybrixd.engine[target.id][handle].buffer.length < global.hybrixd.engine[target.id].announceMaxBufferSize) {
                  global.hybrixd.engine[target.id][handle].buffer.push(message);
                } else {
                  console.log(' [!] transport irc: buffer overflow, discarding messages!');
                }
              });
              global.hybrixd.engine[target.id][handle].socket.addListener('names#' + chan, function (peerArray) {
                global.hybrixd.engine[target.id][handle].peers = Object.keys(peerArray);
                // filter admin, moderator flags
                for (var i = 0; i++; i < global.hybrixd.engine[target.id][handle].peers.length) {
                  global.hybrixd.engine[target.id][handle].peers[i].replace(new RegExp('^[\+\@]+'), '');
                }
                // ignore self
                var i = global.hybrixd.engine[target.id][handle].peers.indexOf(nodeId);
                if (i > -1) {
                  global.hybrixd.engine[target.id][handle].peers.splice(i, 1);
                }
                console.log(' [.] transport irc: peer list updated ' + JSON.stringify(global.hybrixd.engine[target.id][handle].peers));
              });
              // event: warnings and errors
              global.hybrixd.engine[target.id][handle].socket.addListener('error', function (message) {
                console.log(' [!] transport irc: Error! ' + JSON.stringify(message));
              });
              // some simplistic progress reporting - TODO: make better than guesstimate
              simpleProgress(processID, 10);
            } else {
              // return handle when socket already open
              scheduler.stop(processID, 0, handle);
            }
            break;
          case 'torrent':
            var group = typeof command[2] === 'undefined' ? target.defaultChannel : command[2];
            var passwd = typeof command[3] === 'undefined' ? 'l3ts_b34t_th3_b4nks!' : command[3];
            var handle = nacl.to_hex(nacl.crypto_hash_sha256(nodeId + group + passwd + hashSalt));
            if (typeof global.hybrixd.engine[target.id][handle] === 'undefined') {
              var peerNetwork = require('./torrent/peer-network-fork');
              // setup the torrent socket
              global.hybrixd.engine[target.id][handle] = { opened: openTime, protocol: 'torrent', channel: target.defaultChannel };
              global.hybrixd.engine[target.id][handle].socket = new peerNetwork({ group: group, password: passwd });
              // start the torrent socket
              global.hybrixd.engine[target.id][handle].socket.start();
              // event: event fires when online
              global.hybrixd.engine[target.id][handle].socket.on('ready', (peerId) => {
                console.log(' [i] transport torrent: ready as peer [' + peerId + ']');
                global.hybrixd.engine[target.id].handles.push(handle);
                global.hybrixd.engine[target.id][handle].peerId = peerId;
                scheduler.stop(processID, 0, handle);
                // event: incoming message on channel
              }).on('message', (msg, fromPeerId) => {
                // ignore self
                if (fromPeerId !== global.hybrixd.engine[target.id][handle].peerId) {
                  console.log(' [.] transport torrent: incoming message ' + from + ':' + msg.toString());
                  // skip messages if buffer becomes too large!
                  if (global.hybrixd.engine[target.id][handle].buffer.length < global.hybrixd.engine[target.id].announceMaxBufferSize) {
                    global.hybrixd.engine[target.id][handle].buffer.push(msg.toString());
                  } else {
                    console.log(' [!] transport torrent: buffer overflow, discarding messages!');
                  }
                }
              }).on('peer', (peerId) => {
                console.log(' [.] transport torrent: peer [' + peerId + '] online');
                // TODO: announce yourself to new peer
                // global.hybrixd.engine[target.id][handle].socket.send(Buffer.from("Hello!"), peerId);
                global.hybrixd.engine[target.id][handle].peers.push(peerId);
                // event: going offline
              }).on('offline', (peerId) => {
                console.log(' [.] transport torrent: peer [' + peerId + '] offline');
                // remove peer from peer list
                global.hybrixd.engine[target.id][handle].peers = global.hybrixd.engine[target.id][handle].peers.filter(function (e) { return e !== peerId; });
                // event: warnings and errors
              }).on('warning', (err) => {
                console.log(' [!] transport torrent: Error! ' + err.message);
              });
              // some simplistic progress reporting - TODO: make better than guesstimate
              simpleProgress(processID, 10);
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
      if (global.hybrixd.engine[target.id].handles.indexOf(handle) > -1) {
        if (global.hybrixd.engine[target.id].hasOwnProperty(handle) && global.hybrixd.engine[target.id][handle].hasOwnProperty('protocol')) {
          var information = {
            handle: handle,
            opened: global.hybrixd.engine[target.id][handle].opened,
            protocol: global.hybrixd.engine[target.id][handle].protocol,
            channel: global.hybrixd.engine[target.id][handle].channel,
            peerId: global.hybrixd.engine[target.id][handle].peerId,
            peers: global.hybrixd.engine[target.id][handle].peers
          };
          scheduler.stop(processID, 0, information);
        } else {
          scheduler.stop(processID, 500, 'Transport not yet fully initialized. Please try again later!');
        }
      } else {
        scheduler.stop(processID, 404, 'Transport handle does not exist!');
      }
      break;
    case 'cron' :
    // send heartbeat ?
    //  \_ announcement message to chan specifying user is online
    // subprocesses.push('done("Heartbeat sent!")');
      break;
    case 'send':
    //  -- check if already connected?
    //  /engine/transport-irc/send/$HANDLE/$VALUE  ->  announce message to host/channel
      switch (protocol) {
        case 'irc':
          break;
        case 'torrent':
          break;
      }
      break;
    case 'list':
      scheduler.stop(processID, 0, JSON.stringify(global.hybrixd.engine[target.id].handles));
      break;
    case 'seek':
    //  /engine/transport-irc/seek/$HANDLE/[$OFFSET]  ->  seek specific announces on host/channel, returns array
      break;
    case 'stop':
      var handle = command[1];
      if (global.hybrixd.engine[target.id].handles.indexOf(handle) > -1) {
        if (global.hybrixd.engine[target.id].hasOwnProperty(handle) && global.hybrixd.engine[target.id][handle].hasOwnProperty('protocol')) {
          switch (global.hybrixd.engine[target.id][handle].protocol) {
            case 'irc':
              global.hybrixd.engine[target.id][handle].socket.part('#' + global.hybrixd.engine[target.id][handle].channel);
              simpleProgress(processID, 3);
              setTimeout(function () {
                removeHandle(target.id, handle);
                scheduler.stop(processID, 0, 'irc socket closed');
                console.log(' [i] transport irc: stopped and closed socket ' + handle);
              }, 8000, target, handle, processID);
              break;
            case 'torrent':
              global.hybrixd.engine[target.id][handle].socket.close(function () {
                removeHandle(target.id, handle);
                scheduler.stop(processID, 0, 'torrent socket closed');
                console.log(' [i] transport torrent: stopped and closed socket ' + handle);
              });
              simpleProgress(processID, 3);
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

function removeHandle (targetId, handle) {
  var index = global.hybrixd.engine[targetId].handles.indexOf(handle);
  if (index > -1) {
    global.hybrixd.engine[targetId].handles.splice(index, 1);
  }
  delete global.hybrixd.engine[targetId][handle];
}

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

var meta = function (properties) {
  var processID = properties.processID;
  storage.getMeta(properties.key,
    meta => { scheduler.stop(processID, 0, meta); },
    error => { scheduler.stop(processID, 1, error); }
  );
};
