// (C) 2015 Internet of Coins / Joachim de Koning
// hybrixd module - transport-irc/module.js
// Module to transport data over federated or decentralized networks

// required libraries in this context
// var execSync = require('child_process').execSync;
let scheduler = require('../../lib/scheduler');
let modules = require('../../lib/modules');
let functions = require('./functions.js');
let transportIrc = require('./transportIrc.js');
let transportTorrent = require('./transportTorrent.js');
let shaHash = require('js-sha256').sha224;

// initialization function
function init () {
  modules.initexec('transport', ['init']);
}

// exec
function exec (properties) {
  // decode our serialized properties
  let processID = properties.processID;
  let target = properties.target;
  let command = properties.command;
  let result = null;
  let handle;
  // set request to what command we are performing
  global.hybrixd.proc[processID].request = properties.command;
  global.hybrixd.proc[processID].timeout = 30000;
  // handle standard cases here, and construct the sequential process list
  switch (command[0]) {
    case 'init' :
      console.log(' [.] transport module initialization ');
      global.hybrixd.engine[target.id].handles = []; // transport handles
      global.hybrixd.engine[target.id].endpoints = []; // own endpoints
      global.hybrixd.engine[target.id].peersURIs = {}; // other peers URI endpoints
      // global.hybrixd.engine[target.id].peers = { irc:[], torrent:[] };
      global.hybrixd.engine[target.id].announceMaxBufferSize = 10000;
      scheduler.stop(processID, 0, null);
      break;
    //  /engine/transport/open/irc/$HOST_OR_IP/$CHANNEL  ->  connect to host/channel
    case 'open' :
      if (typeof command[1] === 'undefined') {
        result = ['irc', 'torrent'];
        scheduler.stop(processID, 0, result);
      } else {
        let protocol = command[1];
        let channel;
        switch (protocol) {
          case 'irc':
            channel = (command[3] || target.defaultChannel).toLowerCase();
            let host = command[2] || target.defaultIrcHost;
            transportIrc.open(processID, target.id, host, channel, target.hashSalt);
            break;
          case 'torrent':
            channel = command[2] || target.defaultChannel;
            let passwd = command[3] || target.defaultTorrentPasswd;
            transportTorrent.open(processID, target.id, channel, passwd, target.hashSalt);
            break;
        }
      }
      break;
    case 'stop':
      handle = command[1];
      if (global.hybrixd.engine[target.id].handles.indexOf(handle) > -1) {
        if (global.hybrixd.engine[target.id].hasOwnProperty(handle) && global.hybrixd.engine[target.id][handle].hasOwnProperty('protocol')) {
          switch (global.hybrixd.engine[target.id][handle].protocol) {
            case 'irc':
              transportIrc.stop(processID, target.id, handle);
              break;
            case 'torrent':
              transportTorrent.stop(processID, target.id, handle);
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
      handle = command[1];
      if (global.hybrixd.engine[target.id].handles.indexOf(handle) > -1) {
        if (global.hybrixd.engine[target.id].hasOwnProperty(handle) && global.hybrixd.engine[target.id][handle].hasOwnProperty('protocol')) {
          let information = {
            handle: handle,
            opened: global.hybrixd.engine[target.id][handle].opened,
            protocol: global.hybrixd.engine[target.id][handle].protocol,
            channel: global.hybrixd.engine[target.id][handle].channel,
            peerId: global.hybrixd.engine[target.id][handle].peerId
          };
          scheduler.stop(processID, 0, information);
        } else {
          scheduler.stop(processID, 500, 'Transport not yet fully initialized. Please try again later!');
        }
      } else {
        scheduler.stop(processID, 404, 'Transport handle does not exist!');
      }
      break;
    case 'send':
      try {
        send(properties);
      } catch (e) { console.log(e); }
      break;
    case 'read':
      read(properties);
      break;
    case 'list':
      let err = 0;
      switch (command[1]) {
        case 'endpoints':
          result = global.hybrixd.engine[target.id].endpoints;
          break;
        case 'handles':
          result = global.hybrixd.engine[target.id].handles;
          break;
        case 'peers':
          if (command[2]) {
            handle = command[2];
            if (global.hybrixd.engine[target.id].handles.indexOf(handle) > -1) {
              result = global.hybrixd.engine[target.id][handle].peers;
            } else {
              scheduler.stop(processID, 404, 'Handle does not exist!');
            }
          } else {
            result = {};
            for (let i = 0; i < global.hybrixd.engine[target.id].handles.length; i++) {
              handle = global.hybrixd.engine[target.id].handles[i];
              result[handle] = global.hybrixd.engine[target.id][handle].peers;
            }
          }
          break;
        case 'peersURIs':
          result = global.hybrixd.engine[target.id].peersURIs;
          break;
        default:
          result = ['endpoints', 'handles', 'peers', 'peersURIs'];
          break;
      }
      scheduler.stop(processID, err, result);
      break;
  }
}

function send (properties) {
  let processID = properties.processID;
  let engine = properties.target.id;
  let nodeId = global.hybrixd.node.publicKey;
  let command = properties.command;
  command.shift(); // remove 'send' portion
  let handle = command.shift(); // get handle
  let nodeIdTarget = command.shift(); // if is *, sends broadcast to all targets
  let message = command.join('/'); // unencrypted message
  // create unique message ID
  let openTime = (new Date()).getTime();
  let messageId = shaHash(nodeId + engine.hashSalt + openTime).substr(16, 8);
  if (handle && nodeIdTarget && message) {
    if (handle === '*') {
      // loop through all handles and broadcast
      for (let i = 0; i < global.hybrixd.engine[engine].handles.length; i++) {
        handle = global.hybrixd.engine[engine].handles[i];
        if (global.hybrixd.engine[engine].hasOwnProperty(handle) && global.hybrixd.engine[engine][handle].hasOwnProperty('protocol')) {
          messageId = functions.sendMessage(engine,
            handle,
            nodeIdTarget,
            messageId,
            message);
        }
      }
      scheduler.stop(processID, 0, messageId);
    } else {
      if (global.hybrixd.engine[engine].handles.indexOf(handle) > -1) {
        if (global.hybrixd.engine[engine].hasOwnProperty(handle) && global.hybrixd.engine[engine][handle].hasOwnProperty('protocol')) {
          messageId = functions.sendMessage(engine,
            handle,
            nodeIdTarget,
            messageId,
            message);
        }
        scheduler.stop(processID, 0, messageId);
      } else {
        scheduler.stop(processID, 1, 'Specified handle does not exist!');
      }
    }
  } else {
    scheduler.stop(processID, 1, 'Please specify $HANDLE/$TARGET/$MESSAGE!');
  }
}

function read (properties) {
  let processID = properties.processID;
  let engine = properties.target.id;
  let command = properties.command;
  let handle = command[1];
  let nodeIdTarget = command[2]; // if is *, reads messages from all targets
  if (command[3]) {
    let messageResponseId = shaHash(nodeIdTarget + command[3]).substr(16, 8); // if specified, read message response to previous messageId
    let loopHandles;
    if (handle === '*') {
      loopHandles = global.hybrixd.engine[engine].handles;
    } else {
      loopHandles = [ handle ];
    }
    if (loopHandles.length > 0) {
      let readInterval = setInterval(function () {
        let curHandle;
        for (let i = 0; i < loopHandles.length; i++) {
          curHandle = loopHandles[i];
          if (global.hybrixd.engine[engine].hasOwnProperty(curHandle) && global.hybrixd.engine[engine][curHandle].hasOwnProperty('buffer')) {
            let idx = -1;
            for (let i = 0; i < global.hybrixd.engine[engine][curHandle].buffer.length; i++) {
              if (global.hybrixd.engine[engine][curHandle].buffer[i] && global.hybrixd.engine[engine][curHandle].buffer[i].id === messageResponseId) {
                idx = i;
              }
            }
            if (idx > -1 && global.hybrixd.engine[engine][curHandle].buffer[idx].data !== null) {
              try {
                let messageData = JSON.parse(global.hybrixd.engine[engine][curHandle].buffer[idx].data);
                scheduler.stop(processID, 0, messageData);
              } catch (e) {
                scheduler.stop(processID, 1, 'Cannot decode response message!');
              }
              global.hybrixd.engine[engine][curHandle].buffer.splice(idx, 1);
            }
          }
        }
      }, 250, processID, loopHandles, messageResponseId);
      setTimeout(function () {
        clearInterval(readInterval);
        scheduler.stop(processID, 1, 'Transport message read timeout!');
      }, properties.target.readTimeout || 15000, processID, readInterval);
    } else {
      scheduler.stop(processID, 1, 'There are no active transport handles!');
    }
  } else {
    scheduler.stop(processID, 1, 'Please specify a message ID!');
  }
}

// exports
exports.init = init;
exports.exec = exec;
exports.send = send;
exports.read = read;
