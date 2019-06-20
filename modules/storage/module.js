// (C) 2015 Internet of Coins / Joachim de Koning
// hybrixd module - storage/module.js
// Module to provide storage

// IDEAS:
//  -->>> return ipfs.files.add(Buffer.from(content), { onlyHash: true })

// required libraries in this context
const storage = require('./storage'); // key-value storage

function cron (proc) {
  storage.autoClean();
  proc.pass('autoclean in progress');
}

function size (proc, data) {
  storage.size(proc.done, proc.fail);
}

function pull (proc, data) {
  storage.pull(proc.done, proc.fail);
}

function seek (proc, data) {
  const key = proc.command && proc.command[1] ? proc.command[1] : data.key;
  storage.seek({key: key}, proc.done, proc.fail);
}

function meta (proc, data) {
  const key = proc.command && proc.command[1] ? proc.command[1] : data.key;
  storage.getMeta({key: key}, proc.done, proc.fail);
}

function work (proc, data) {
  const key = proc.command && proc.command[1] ? proc.command[1] : data.key;
  const pow = proc.command && proc.command[2] ? proc.command[2] : data.pow;
  storage.provideProof({key: key, pow: pow}, proc.done, proc.fail);
}

function load (proc, data) {
  storage.get({key: data.key, readFile: data.readFile}, proc.done, proc.fail);
}

function save (proc, data) {
  storage.set({key: data.key, value: data.value, noSync: data.noSync}, proc.done, proc.fail);
}

function burn (proc, data) {
  const key = proc.command && proc.command[1] ? proc.command[1] : data.key;
  storage.burn(key, proc.done, proc.fail);
}

// exports
exports.save = save;
exports.load = load;
exports.work = work;
exports.seek = seek;
exports.size = size;
exports.cron = cron;
exports.meta = meta;
exports.pull = pull;
exports.burn = burn;
