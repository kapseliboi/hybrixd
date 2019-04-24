// (C) 2015 Internet of Coins / Joachim de Koning
// hybrixd module - transport-irc/module.js
// Module to transport data over federated or decentralized networks

// required libraries in this context
// var execSync = require('child_process').execSync;
let conf = require('../../lib/conf/conf');
let functions = require('./functions.js');
let transportIrc = require('./transportIrc.js');
let transportTorrent = require('./transportTorrent.js');
let shaHash = require('js-sha256').sha224;

let data = require('./data');

// add static endpoint entries from conf file
data.endpoints = [];
let httpEndpoints = conf.get('host.endpoints');
if(httpEndpoints instanceof Array) {
  for(let i=0;i<httpEndpoints.length;i++) {
    data.endpoints.push(httpEndpoints[i]);
  }
}

function open (proc) {
  const command = proc.command;

  if (typeof command[1] === 'undefined') {
    proc.done(['irc', 'torrent']);
  } else {
    let protocol = proc.command[1];
    let channel;
    switch (protocol) {
      case 'irc':
        channel = (command[3] || proc.peek('defaultChannel')).toLowerCase();
        let host = command[2] || proc.peek('defaultIrcHost');
        transportIrc.open(proc, host, channel, proc.peek('hashSalt'));
        break;
      case 'torrent':
        channel = command[2] || proc.peek('defaultChannel');
        let passwd = command[3] || proc.peek('defaultIrcHost');
        transportTorrent.open(proc, channel, passwd, proc.peek('hashSalt'));
        break;
    }
  }
}

function stop (proc) {
  const handleId = proc.command[1];
  if (data.handleIds.indexOf(handleId) > -1) {
    if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) {
      switch (data.handles[handleId].protocol) {
        case 'irc':
          transportIrc.stop(proc, handleId);
          break;
        case 'torrent':
          transportTorrent.stop(proc, handleId);
          break;
        default:
          proc.fail(1, 'Cannot close socket! Protocol not recognized!');
          break;
      }
    } else {
      proc.fail(500, 'Transport not yet fully bootstrapped. Please try again later!');
    }
  } else {
    proc.fail(404, 'Transport handle does not exist!');
  }
}

function info (proc) {
  const handleId = proc.command[1];
  if (data.handleIds.indexOf(handleId) > -1) {
    if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) {
      const handle = data.handles[handleId];
      proc.done({
        handle: handleId,
        opened: handle.opened,
        protocol: handle.protocol,
        channel: handle.channel,
        peerId: handle.peerId,
        nodeId: global.hybrixd.node.publicKey // TODO
      });
    } else {
      proc.fail(500, 'Transport not yet fully initialized. Please try again later!');
    }
  } else {
    proc.fail(404, 'Transport handle does not exist!');
  }
}

function list (proc) {
  switch (proc.command[1]) {
    case 'endpoints':
      // list specific external peerURIs/endpoints or your own
      let endpoints = [];
      if (proc.command[2]) {
        fromNodeId = proc.command[2];
        if (data.peersURIs[fromNodeId]) {
          endpoints = data.peersURIs[fromNodeId].slice(0);
        }
      } else {
        endpoints = data.endpoints.slice(0); // clone the array
      }
      // filter the endpoints
      if (proc.command[3]) {
        let filter = proc.command[3];
        for (let i=0;i<endpoints.length;i++) {
          if (endpoints[i].substr(0,filter.length)!==filter) {
            endpoints.splice(i,1);
          }
        }
      }
      proc.done(endpoints);
      break;
    case 'handles':
      proc.done(data.handleIds);
      break;
    case 'peers':
      if (proc.command[2]) {
        const handleId = proc.command[2];
        if (data.handleIds.indexOf(handleId) > -1) {
          if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) {
            proc.done(data.handles[handleId].peers);
          } else {
            proc.fail(500, 'Transport not yet fully initialized. Please try again later!');
          }
        } else {
          proc.fail(404, 'Handle does not exist!');
        }
      } else {
        const peers = {};
        for (let i = 0; i < data.handleIds.length; i++) {
          const handleId = data.handleIds[i];
          peers[handleId] = data.handles[handleId].peers;
        }
        proc.done(peers);
      }
      break;
  }
}

function send (proc) {
  const id = 'transport';
  let nodeId = global.hybrixd.node.publicKey;

  let command = proc.command;

  command.shift(); // remove 'send' portion
  let handleId = command.shift(); // get handle
  let nodeIdTarget = command.shift(); // if is *, sends broadcast to all targets
  let message = command.join('/'); // unencrypted message

  // create unique message ID
  let openTime = (new Date()).getTime();
  let messageId = shaHash(nodeId + proc.peek('hashSalt') + openTime).substr(16, 8);
  if (handleId && nodeIdTarget && message) {
    if (handleId === '*') {
      // loop through all handles and broadcast
      for (let i = 0; i < data.handleIds.length; i++) {
        const handleId = data.handleIds[i];
        if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) {
          messageId = functions.sendMessage(
            data.handles[handleId],
            nodeIdTarget,
            messageId,
            message);
        }
      }
      proc.done(messageId);
    } else {
      if (data.handleIds.indexOf(handleId) > -1) {
        if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) {
          messageId = functions.sendMessage(
            data.handles[handleId],
            nodeIdTarget,
            messageId,
            message);
        }
        proc.done(messageId);
      } else {
        proc.fail(404, 'Specified handle does not exist!');
      }
    }
  } else {
    proc.fail(400, 'Please specify $HANDLE/$TARGET/$MESSAGE!');
  }
}

function read (proc) {
  let command = proc.command;

  command.shift(); // remove 'read' portion
  let handleId = command.shift(); // get handle
  let nodeIdTarget = command.shift(); // if is *, reads messages from all targets
  let messageId = command.shift();

  if (messageId) {
    let messageResponseId = shaHash(nodeIdTarget + messageId).substr(16, 8); // if specified, read message response to previous messageId
    let loopHandles;
    if (handleId === '*') {
      loopHandles = data.handleIds;
    } else {
      loopHandles = [ handleId ];
    }
    if (loopHandles.length > 0) {
      let readInterval = setInterval(function (loopHandles, messageResponseId) {
        for (let i = 0; i < loopHandles.length; i++) {
          const curHandleId = loopHandles[i];
          if (data.handles.hasOwnProperty(curHandleId) && data.handles[curHandleId].hasOwnProperty('buffer')) {
            const curHandle = data.handles[curHandleId];
            let idx = -1;
            for (let i = 0; i < curHandle.buffer.length; i++) {
              if (curHandle.buffer[i] && curHandle.buffer[i].id === messageResponseId) {
                idx = i;
              }
            }
            if (idx > -1 && curHandle.buffer[idx].data !== null) {
              try {
                let messageData = JSON.parse(curHandle.buffer[idx].data);
                curHandle.buffer.splice(idx, 1);
                proc.done(messageData);
              } catch (e) {
                proc.fail(1, 'Cannot decode response message!');
              }
            }
          }
        }
      }, 250, loopHandles, messageResponseId);
      setTimeout(function (readInterval) {
        clearInterval(readInterval);
        proc.fail('Transport message read timeout!');
      }, proc.peek('readTimeout') || 32000, readInterval);
    } else {
      proc.fail(1, 'There are no active transport handles!');
    }
  } else {
    proc.fail(1, 'Please specify a message ID!');
  }
}

// exports
exports.stop = stop;
exports.list = list;
exports.open = open;
exports.info = info;
exports.send = send;
exports.read = read;
