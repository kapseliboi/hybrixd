// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd module - storage/module.js
// Module to provide clustering

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
  var me = global.hybridd.hostname[0] + ':' + global.hybridd.restport;

  // handle standard cases here, and construct the sequential process list
  switch (command[0]) {
    case 'peers' :

      var r = [me].concat(peers).join(',');

      subprocesses.push('stop(0,"' + r + '")');
      break;
    case 'command' :
      var xpath = command.slice(1);
      for (var peer in peers) {
        subprocesses.push("curl('http://" + peers[peer] + "','/" + xpath.join('/') + "','GET',null,{},{parsing:'none',autoproc:true,proceedOnTimeOut:true})");//
      }
      subprocesses.push('coll(' + peers.length + ')');
      subprocesses.push('stop(0,data)');

      break;
    case 'status' :
      for (var peer in peers) {
        subprocesses.push("curl('http://" + peers[peer] + "','/engine/cluster/peers','GET',null,{},{parsing:'none',autoproc:true,proceedOnTimeOut:true})");
      }
      subprocesses.push('coll(' + peers.length + ')');
      var captain2 = captain || me;
      subprocesses.push('stop(0,"Self: ' + me + '\\nCaptain: ' + captain2 + '\\nPeers: ' + peers.join(',') + '\\nPeers-connections:\\n"+data.join("\\n"))');
      break;
    case 'propose' :
      var key = command[1];
      var value = command[2];
      if (captain === null) { // Yah, I'm the captain
        subprocesses.push('rout("/engine/storage/set/' + key + '/' + value + '")'); // Store locally
        subprocesses.push('rout("/engine/cluster/command/engine/storage/set/' + key + '/' + value + '")'); // Store at all peers
      } else { // I'm not the captain, so send this proposal to the captain
        subprocesses.push("curl('http://" + peers[peer] + "','/e/cluster/propose/" + key + '/' + value + "','GET',null,{},{autoproc:true})");
      }
      subprocesses.push('stop(0,"Done")');
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
        subprocesses.push('stop(0,"' + (captain || me) + '")');//
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
