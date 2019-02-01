// (C) 2015 Internet of Coins / Joachim de Koning
// hybrixd module - transport-irc/module.js
// Module to transport data over federated or decentralized networks

// required libraries in this context
//var execSync = require('child_process').execSync;
var scheduler = require('../../lib/scheduler');
var modules = require('../../lib/modules');
var transportIrc = require('./transportIrc.js');
var transportTorrent = require('./transportTorrent.js');

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
      global.hybrixd.engine[target.id].handles = [];      // transport handles
      global.hybrixd.engine[target.id].endpoints = [];    // own endpoints
      global.hybrixd.engine[target.id].peersURIs = {};    // other peers URI endpoints
      //global.hybrixd.engine[target.id].peers = { irc:[], torrent:[] };
      global.hybrixd.engine[target.id].announceMaxBufferSize = 10000;
      scheduler.stop(processID, 0, null);
      break;
    //  /engine/transport/open/irc/$HOST_OR_IP/$CHANNEL  ->  connect to host/channel
    case 'open' :
      if(typeof command[1]==='undefined') {
        result = ['irc','torrent'];
        scheduler.stop(processID, 0, result);
      } else {
        var nodeId = global.hybrixd.nodeId;
        var protocol = command[1];
        switch (protocol) {
          case 'irc':
            var host = command[2]||target.defaultIrcHost
            var channel = (command[3]||target.defaultChannel).toLowerCase();
            transportIrc.open(processID,target.id,host,channel,target.hashSalt);
          break;
          case 'torrent':
            var channel = command[2]||target.defaultChannel;
            var passwd = command[3]||target.defaultTorrentPasswd;
            transportTorrent.open(processID,target.id,channel,passwd,target.hashSalt);
          break;
        }
      }
      break;
    case 'stop':
      var handle = command[1];
      if(global.hybrixd.engine[target.id].handles.indexOf(handle)>-1) {        
        if(global.hybrixd.engine[target.id].hasOwnProperty(handle) && global.hybrixd.engine[target.id][handle].hasOwnProperty('protocol')) {
          switch (global.hybrixd.engine[target.id][handle].protocol) {
            case 'irc':
              transportIrc.stop(processID,target.id,handle, function() {
                removeEndpoint(target.id,'irc://'+global.hybrixd.engine[target.id][handle].host+'/'+global.hybrixd.engine[target.id][handle].channel+'/'+global.hybrixd.engine[target.id][handle].peerId);
                removeHandle(target.id,handle);
                scheduler.stop(processID, 0, 'irc socket closed');
                console.log(' [i] transport irc: stopped and closed socket '+handle);
              });              
            break;
            case 'torrent':
              transportTorrent.stop(processID,target.id,handle, function() {
                removeEndpoint(target.id,'torrent://'+global.hybrixd.engine[target.id][handle].channel+'/'+global.hybrixd.engine[target.id][handle].peerId);
                removeHandle(target.id,handle);
                scheduler.stop(processID, 0, 'torrent socket closed');
                console.log(' [i] transport torrent: stopped and closed socket '+handle);
              });              
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
          }
          scheduler.stop(processID, 0, information);
        } else {
          scheduler.stop(processID, 500, 'Transport not yet fully initialized. Please try again later!');
        }
      } else {
        scheduler.stop(processID, 404, 'Transport handle does not exist!');
      }
      break;
    case 'send':
      function sendMessage(engine,handle,protocol,nodeIdTarget,messageId,message) {
        switch (protocol) {
          case 'irc':
            transportIrc.send(processID,engine,handle,nodeIdTarget,messageId,message,target.hashSalt);
          break;
          case 'torrent':
            transportTorrent.send(processID,engine,handle,nodeIdTarget,messageId,message,target.hashSalt);
          break;
        }
        return messageId;
      }
      var handle = command[1];
      var nodeIdTarget = command[2]; // if is *, sends broadcast to all targets
      var message = command[3];      // unencrypted message
      // create unique message ID
      var shaHash = require('js-sha256').sha224
      var openTime = (new Date).getTime();
      var messageId = shaHash(nodeId+target.hashSalt+openTime).substr(16,24);        
      if(handle && nodeIdTarget && message) {
        if(handle==='*') {
          // loop through all handles and broadcast
          for(var i=0;i<global.hybrixd.engine[target.id].handles.length;i++) {
            handle = global.hybrixd.engine[target.id].handles[i];
            if(global.hybrixd.engine[target.id].hasOwnProperty(handle) && global.hybrixd.engine[target.id][handle].hasOwnProperty('protocol')) {
              messageId = sendMessage( target.id,
                           handle,
                           global.hybrixd.engine[target.id][handle].protocol,
                           nodeIdTarget,
                           messageId,
                           message );
            }
          }
          scheduler.stop(processID, 0, messageId);
        } else {
          if(global.hybrixd.engine[target.id].handles.indexOf(handle)>-1) {
            if(global.hybrixd.engine[target.id].hasOwnProperty(handle) && global.hybrixd.engine[target.id][handle].hasOwnProperty('protocol')) {
              messageId = sendMessage( target.id,
                           handle,
                           global.hybrixd.engine[target.id][handle].protocol,
                           nodeIdTarget,
                           messageId,
                           message );
            }
            scheduler.stop(processID, 0, messageId);
          } else {
            scheduler.stop(processID, 404, 'Specified handle does not exist!');
          }
        }
      } else {
        scheduler.stop(processID, 1, 'Please specify $HANDLE/$TARGET/$MESSAGE!');
      }
      break;    
    case 'list':
      var err = 0;
      var result;
      switch (command[1]) {
        case 'endpoints':
          result = global.hybrixd.engine[target.id].endpoints;
        break;
        case 'handles':
          result = global.hybrixd.engine[target.id].handles;
        break;
        case 'peers':
          var handle;
          if(command[2]) {
            handle = command[2];
            if(global.hybrixd.engine[target.id].handles.indexOf(handle)>-1) {
              result = global.hybrixd.engine[target.id][handle].peers;
            } else {
              scheduler.stop(processID, 404, 'Handle does not exist!');
            }
          } else {
            result = {};
            for(var i=0;i<global.hybrixd.engine[target.id].handles.length;i++) {
              handle = global.hybrixd.engine[target.id].handles[i];
              result[handle] = global.hybrixd.engine[target.id][handle].peers;
            }
          }
        break;
        case 'peersURIs':
          result = global.hybrixd.engine[target.id].peersURIs;
        break;
        default:
          result = ['endpoints','handles','peers','peersURIs'];
        break;
      }
      scheduler.stop(processID, err, result);
      break;
  }
}

function removeEndpoint(targetId,endpoint) {
  var index = global.hybrixd.engine[targetId].endpoints.indexOf(endpoint);
  if (index > -1) {
    global.hybrixd.engine[targetId].endpoints.splice(index, 1);
  }
}

function removeHandle(targetId,handle) {
  var index = global.hybrixd.engine[targetId].handles.indexOf(handle);
  if (index > -1) {
    global.hybrixd.engine[targetId].handles.splice(index, 1);
  }
  delete global.hybrixd.engine[targetId][handle];
}


// exports
exports.init = init;
exports.exec = exec;
