// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd module - storage/module.js
// Module to provide storage

// required libraries in this context
var IoC = require('../../common/ioc.client/ioc.nodejs.client');
var ioc = new IoC.Interface({http: require('http')});

// exports
exports.init = init;
exports.exec = exec;

var peers = [];
// initialization function
function init () {
}

// exec
function exec (properties) {
  // decode our serialized properties
  var processID = properties.processID;
  // var source = properties.source;
  var command = properties.command;
  var subprocesses = [];
  // set request to what command we are performing
  global.hybridd.proc[processID].request = properties.command;

  // handle standard cases here, and construct the sequential process list
  switch (command[0]) {
    case 'peers' :

      ioc.sequential([
        'init',
        {username: 'POMEW4B5XACN3ZCX', password: 'TVZS7LODA5CSGP6U'}, 'login',
        {host: 'http://localhost:1111/'}, 'addHost',
        {symbol: 'dummy'}, 'addAsset',
        {symbol: 'dummy', amount: 100}, 'transaction'
      ]
        , () => { console.log('Succes'); }
        , (error) => { console.error(error); }
      );

      subprocesses.push('stop(0,' + JSON.stringify(peers) + ')');
      break;
    case 'cluster' :
      var xpath = command.slice(1);

      for (var peer in peers) {
        subprocesses.push("curl('http://" + peers[peer] + "','/" + xpath.join('/') + "','GET',null,{},{autoproc:true})");
      }
      subprocesses.push('coll(' + peers.length + ')');

      break;
    case 'clusterstatus' :
      for (var peer in peers) {
        subprocesses.push("curl('http://" + peers[peer] + "','/e/raft/peers','GET',null,{},{autoproc:true})");
      }
      subprocesses.push('coll(' + peers.length + ')');

      break;
    case 'add' :
      var peer = command[1];
      if (peers.indexOf(peer) === -1) {
        peers.push(peer);
        subprocesses.push('stop(0,"Peer added.")');
      } else {
        subprocesses.push('stop(0,"Peer already added.")');
      }
      break;
    case 'remove' :
      var peer = command[1];
      var index = peers.indexOf(peer);
      if (index === -1) {
        subprocesses.push('stop(0,"Peer not in cluster.")');
      } else {
        peers.splice(index, 1);
        subprocesses.push('stop(0,"Peer removed.")');
      }
  }

  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID, subprocesses);
}
