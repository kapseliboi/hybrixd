// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - deterministic/module.js
// Module to provide deterministic cryptography tools

let DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing
let fs = require('fs');

// exports
exports.init = init;
exports.assets = assets;
exports.modes = modes;
exports.hashes = hashes;
exports.hash = hash;

// initialization function
function init () {
  // initialize available modes
  let assets = {};
  let modes = {};
  let hashes = {};
  for (let asset in global.hybrixd.asset) {
    let mode = (typeof global.hybrixd.asset[asset].mode !== 'undefined' ? global.hybrixd.asset[asset].mode : false);
    if (mode) {
      // index the modes
      assets[asset] = mode;
      if (typeof modes[mode] === 'undefined') { modes[mode] = []; }
      modes[mode].push(asset);

      // hash the deterministic packages
      let filename = '../modules/deterministic/' + mode.split('.')[0] + '/deterministic.js.lzma';
      if (typeof hashes[mode.split('.')[0]] === 'undefined' && fs.existsSync(filename)) {
        hashes[mode.split('.')[0]] = DJB2.hash(String(fs.readFileSync(filename)));
        console.log(' [i] module deterministic: hashed mode ' + mode.split('.')[0]);
      }
    }
  }
  global.hybrixd.source['deterministic'].assets = assets;
  global.hybrixd.source['deterministic'].modes = modes;
  global.hybrixd.source['deterministic'].hashes = hashes;
}

function assets (proc) {
  proc.done(global.hybrixd.source['deterministic'].assets);
}

function modes (proc) {
  proc.done(global.hybrixd.source['deterministic'].modes);
}

function hashes (proc) {
  proc.done(global.hybrixd.source['deterministic'].hashes);
}

function hash (proc) {
  const command = proc.command;
  const symbol = command[1].toLowerCase();
  const base = symbol.split('.')[0];

  let modetype = base;
  for (let entry in global.hybrixd.source['deterministic'].modes) {
    if (global.hybrixd.source['deterministic'].modes[entry].indexOf(symbol) !== -1) {
      modetype = entry;
    }
  }
  let basemode = modetype.split('.')[0];
  if (typeof global.hybrixd.source['deterministic'].hashes[basemode] !== 'undefined') {
    proc.done({deterministic: modetype, hash: global.hybrixd.source['deterministic'].hashes[basemode]});
  } else {
    proc.fail('Error: Mode or symbol does not exist!');
  }
}
