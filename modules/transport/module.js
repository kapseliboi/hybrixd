// (C) 2015 Internet of Coins / Joachim de Koning
// hybrixd module - transport-irc/module.js
// Module to transport data over federated or decentralized networks

// required libraries in this context
const conf = require('../../lib/conf/conf');
const functions = require('./functions.js');
const transportIrc = require('./transportIrc.js');
const transportTorrent = require('./transportTorrent.js');
const shaHash = require('js-sha256').sha224;
const data = require('./data');

// add static endpoint entries from conf file
data.endpoints = [];
const httpEndpoints = conf.get('host.endpoints');
if (httpEndpoints instanceof Array) data.endpoints.push(...httpEndpoints);

function open (proc) {
  if (data.forceStop) return proc.fail('Cannot open socket when stop is forced.');
  if (conf.get('transport.enabled') !== true) return proc.done();
  else {
    const command = proc.command;

    if (typeof command[1] === 'undefined') return proc.done(['irc', 'torrent']);
    else {
      const protocol = proc.command[1];
      let channel;
      switch (protocol) {
        case 'irc':
          channel = (command[3] || proc.peek('defaultChannel')).toLowerCase();
          const host = command[2] || proc.peek('defaultIrcHost');
          return transportIrc.open(proc, host, channel, proc.peek('hashSalt'));
          break;
        case 'torrent':
          channel = command[2] || proc.peek('defaultChannel');
          const passwd = command[3] || proc.peek('defaultIrcHost');
          return transportTorrent.open(proc, channel, passwd, proc.peek('hashSalt'));
          break;
        default:
          return proc.fail(`Unknown transport protocol '${protocol}'.`);
      }
    }
  }
}

function stop (proc) {
  const handleId = proc.command[1];
  if (handleId === 'undefined' || typeof handleId === 'undefined') {
    data.forceStop = true;
    proc.logs('Preventing the opening of new transport sockets.');

    const waitForBootstrap = data.handleIds.length ? 3000 : 16000;

    // attempt to close all open transports
    proc.logs('Waiting for bootstrapping to finish before shutdown...');

    const pendingClosingHandles = {};
    const checkIfAllHandlesClosed = () => {
      if (Object.keys(pendingClosingHandles).length === 0) {
        proc.logs('All transport sockets closed.');
        return proc.done('All transport sockets closed.');
      }
    };

    setTimeout(() => {
      for (let i = 0; i < data.handleIds.length; i++) {
        const handleId = data.handleIds[i];
        if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) {
          proc.logs(`Requested to close transport handle ${handleId}.`);
          pendingClosingHandles[handleId] = true;
          stopTransport({
            done: () => {
              proc.logs(`Succesfully closed transport handle ${handleId}.`);
              delete pendingClosingHandles[handleId];
              checkIfAllHandlesClosed();
            },
            fail: error => proc.logs(`Failed to close transport handle ${handleId} : ${error}`),
            logs: proc.logs
          }, data.handles[handleId]);
        }
      }
      proc.logs('All sockets have been request to close.');
      checkIfAllHandlesClosed();
    }, waitForBootstrap);
  } else {
    // close a specific transport
    if (data.handleIds.indexOf(handleId) !== -1) {
      if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) return stopTransport(proc, data.handles[handleId]);
      else return proc.fail(500, 'Transport not yet fully bootstrapped. Please try again later!');
    } else return proc.fail(404, 'Transport handle does not exist!');
  }
}

function stopTransport (proc, handle) {
  switch (handle.protocol) {
    case 'irc': return transportIrc.stop(proc, handle);
    case 'torrent': return transportTorrent.stop(proc, handle);
    default: return proc.fail(1, 'Cannot close socket! Protocol not recognized!');
  }
}

function info (proc) {
  const handleId = proc.command[1];
  if (data.handleIds.indexOf(handleId) > -1) {
    if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) {
      const handle = data.handles[handleId];
      return proc.done({
        handle: handleId,
        opened: handle.opened,
        protocol: handle.protocol,
        channel: handle.channel,
        peerId: handle.peerId
      });
    } else return proc.fail(500, 'Transport not yet fully initialized. Please try again later!');
  } else return proc.fail(404, 'Transport handle does not exist!');
}

function list (proc) {
  switch (proc.command[1]) {
    case 'endpoints':
      // list specific external peerURIs/endpoints or your own
      let endpoints = [];
      if (proc.command[2]) {
        fromNodeId = proc.command[2];
        if (data.peersURIs[fromNodeId]) endpoints = data.peersURIs[fromNodeId].slice(0);
      } else endpoints = data.endpoints.slice(0); // clone the array

      // filter the endpoints
      let result = [];
      if (proc.command[3]) {
        const filter = proc.command[3];
        for (let i = 0; i < endpoints.length; i++) {
          if (endpoints[i].substr(0, filter.length) === filter) result.push(endpoints[i]);
        }
      } else result = endpoints;
      return proc.done(result);
    case 'handles':
      return proc.done(data.handleIds);
    case 'peers':
      if (proc.command[2]) {
        const handleId = proc.command[2];
        if (data.handleIds.indexOf(handleId) > -1) {
          if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) {
            return proc.done(data.handles[handleId].peers);
          } else return proc.fail(500, 'Transport not yet fully initialized. Please try again later!');
        } else return proc.fail(404, 'Handle does not exist!');
      } else {
        const peers = {};
        for (let i = 0; i < data.handleIds.length; i++) {
          const handleId = data.handleIds[i];
          peers[handleId] = data.handles[handleId].peers;
        }
        return proc.done(peers);
      }
    case 'nodes':
      let nodes = [];
      let handleId;
      if (proc.command[2]) {
        handleId = proc.command[2];
        if (data.handleIds.indexOf(handleId) > -1) {
          if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) {
            nodes = Object.keys(data.handles[handleId].peers);
          } else {
            proc.fail(500, 'Transport not yet fully initialized. Please try again later!');
          }
        } else return proc.fail(404, 'Handle does not exist!');
      } else {
        for (let i = 0; i < data.handleIds.length; i++) {
          handleId = data.handleIds[i];
          nodes = nodes.concat(Object.keys(data.handles[handleId].peers));
        }
      }
      return proc.done(sortAndUniq(nodes));
    default:
      return proc.fail(`Unknown list method ${proc.command[1]}.`);
  }
}

function sortAndUniq (a) {
  return a.sort().filter(function (item, pos, ary) {
    return !pos || item !== ary[pos - 1];
  });
}

function send (proc) {
  const id = 'transport';
  const nodeId = global.hybrixd.node.publicKey;

  const command = proc.command;

  command.shift(); // remove 'send' portion
  const handleId = command.shift(); // get handle
  const nodeIdTarget = command.shift(); // if is *, sends broadcast to all targets
  let message = command.join('/'); // unencrypted message

  // create unique message ID
  const openTime = (new Date()).getTime();
  let messageId = shaHash(nodeId + proc.peek('hashSalt') + openTime).substr(16, 8);
  if (handleId && nodeIdTarget && message) {
    if (handleId === '*') {
      // loop through all handles and broadcast
      for (let i = 0; i < data.handleIds.length; i++) {
        const handleId = data.handleIds[i];
        if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) {
          messageId = functions.sendMessage(
            proc,
            data.handles[handleId],
            nodeIdTarget,
            messageId,
            message);
        } else return proc.fail(404, 'Specified handle not initialized!');
      }
      return proc.done(messageId);
    } else {
      if (data.handleIds.indexOf(handleId) > -1) {
        if (data.handles.hasOwnProperty(handleId) && data.handles[handleId].hasOwnProperty('protocol')) {
          messageId = functions.sendMessage(
            proc,
            data.handles[handleId],
            nodeIdTarget,
            messageId,
            message);
          return proc.done(messageId);
        } else return proc.fail(404, 'Specified handle not initialized!');
      } else return proc.fail(404, 'Specified handle does not exist!');
    }
  } else return proc.fail(400, 'Please specify $HANDLE/$TARGET/$MESSAGE!');
}

function read (proc) {
  const command = proc.command;

  command.shift(); // remove 'read' portion
  const handleId = command.shift(); // get handle
  const nodeIdTarget = command.shift(); // if is *, reads messages from all targets
  const messageId = command.shift();

  if (messageId) {
    const messageResponseId = shaHash(nodeIdTarget + messageId).substr(16, 8); // if specified, read message response to previous messageId
    const loopHandles = handleId === '*' ? data.handleIds : [ handleId ];

    if (loopHandles.length > 0) {
      let timeoutHandle;
      let readInterval = setInterval((loopHandles, messageResponseId) => {
        for (let i = 0; i < loopHandles.length; i++) {
          const curHandleId = loopHandles[i];
          if (data.handles.hasOwnProperty(curHandleId) && data.handles[curHandleId].hasOwnProperty('buffer')) {
            const curHandle = data.handles[curHandleId];
            let idx = -1;
            for (let i = 0; i < curHandle.buffer.length; i++) {
              if (curHandle.buffer[i] && curHandle.buffer[i].id === messageResponseId) idx = i;
            }
            if (idx > -1 && curHandle.buffer[idx].data !== null) {
              if (readInterval) clearInterval(readInterval);
              if (timeoutHandle) clearTimeout(timeoutHandle);
              timeoutHandle = null;
              readInterval = null;
              try {
                let messageData = JSON.parse(curHandle.buffer[idx].data);
                curHandle.buffer.splice(idx, 1);
              } catch (e) {
                return proc.fail(1, 'Cannot decode response message!');
              }
              return proc.done(messageData);
            }
          }
        }
      }, 250, loopHandles, messageResponseId);
      timeoutHandle = setTimeout(readInterval => {
        if (readInterval) clearInterval(readInterval);
        readInterval = null;
        timeoutHandle = null;
        return proc.fail('Transport message read timeout!');
      }, proc.peek('readTimeout') || 32000, readInterval);
    } else return proc.fail(1, 'There are no active transport handles!');
  } else return proc.fail(1, 'Please specify a message ID!');
}

// exports
exports.stop = stop;
exports.list = list;
exports.open = open;
exports.info = info;
exports.send = send;
exports.read = read;
