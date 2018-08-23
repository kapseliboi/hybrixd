// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd module - storage/module.js
// Module to provide storage

// required libraries in this context
var IoC = require('../../common/ioc.client/ioc.nodejs.client');
var ioc = new IoC.Interface({http: require('http')});

window = {}; // TODO hier nog een goede oplossing voor vinden

// exports
exports.init = init;
exports.exec = exec;

var peers = [];
var captain = null;
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

      /*      ioc.sequential([
        'init',
        {username: 'POMEW4B5XACN3ZCX', password: 'TVZS7LODA5CSGP6U'}, 'login',
        {host: 'http://localhost:1111/'}, 'addHost',
        {symbol: 'dummy'}, 'addAsset',
        {symbol: 'dummy', amount: 100}, 'transaction'
      ]
        , () => { console.log('Succes'); }
        , (error) => { console.error(error); }
      );
*/
      subprocesses.push('stop(0,' + JSON.stringify(peers) + ')');
      break;
    case 'command' :
      var xpath = command.slice(1);

      for (var peer in peers) {
        subprocesses.push("curl('http://" + peers[peer] + "','/" + xpath.join('/') + "','GET',null,{},{autoproc:true})");
      }
      subprocesses.push('coll(' + peers.length + ')');

      break;
    case 'clusterstatus' :
      for (var peer in peers) {
        subprocesses.push("curl('http://" + peers[peer] + "','/e/cluster/peers','GET',null,{},{autoproc:true})");
      }
      subprocesses.push('coll(' + peers.length + ')');

      break;
    case 'propose' :
      var key = command[1];
      var value = command[2];
      if (typeof captain === 'undefined') { // Yah, I'm the captain
        subprocesses.push('rout("/engine/storage/' + key + '/' + value + '")');
      } else { // I'm not the captain, so send this proposal to the captain
        subprocesses.push("curl('http://" + peers[peer] + "','/e/cluster/propose/" + key + '/' + value + "','GET',null,{},{autoproc:true})");
      }
      break;
    case 'captain' :
      if (command.length > 1) { // set captain
        captain = command[1]; // todo validate hostname
        if (peers.indexOf(captain) === -1) {
          peers.push(captain); // TODO refactor
          peers.sort();
          subprocesses.push('stop(0,"' + captain + ' succesfully added as peer and set as captain.")');
        } else {
          subprocesses.push('stop(0,"' + captain + ' succesfully set as captain.")');
        }
      } else { // retrieve captain
        subprocesses.push('stop(0,"' + captain + '")');
      }
      break;
    case 'add' :
      var peer = command[1];
      if (peers.indexOf(peer) === -1) {
        peers.push(peer); // todo validate hostname
        peers.sort();
        subprocesses.push('stop(0,"Peer ' + peer + ' succesfully added.")');
      } else {
        subprocesses.push('stop(0,"Peer ' + peer + ' already added.")');
      }
      break;
    case 'remove' :
      var peer = command[1]; // todo validate hostname
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
