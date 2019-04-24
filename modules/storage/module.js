// (C) 2015 Internet of Coins / Joachim de Koning
// hybrixd module - storage/module.js
// Module to provide storage

// IDEAS:
//  -->>> return ipfs.files.add(Buffer.from(content), { onlyHash: true })

// required libraries in this context
let storage = require('./storage'); // key-value storage

function cron (proc) {
  storage.autoClean();
  proc.pass('Autoclean');
}

function size (proc, data) {
  storage.size(proc.done, proc.fail);
}

function seek (proc, data) {
  storage.seek(data.key, proc.done, proc.fail);
}

function meta (proc, data) {
  storage.getMeta(data.key, proc.done, proc.fail);
}

function load (proc, data) {
  storage.get(data.key, proc.done, proc.fail);
}

function save (proc, data) {
  storage.set({key: data.key, value: data.value}, proc.done, proc.fail);
}

function work (proc, data) {
  storage.provideProof({key: data.key, pow: data.pow}, proc.done, proc.fail);
}

// exports
exports.save = save;
exports.load = load;
exports.work = work;
exports.seek = seek;
exports.size = size;
exports.cron = cron;
exports.meta = meta;
