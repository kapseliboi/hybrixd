const SYNC_RANDOM_ID_RANGE = 250;

const fs = require('fs');
const storagePath = require('path').normalize(process.cwd() + '/../storage/'); // TODO define in conf file

function pullList () {
  const list = [];
  for (let i = 0; i < SYNC_RANDOM_ID_RANGE; i++) {
    const randomIdx = ('00' + i).slice(-3);
    const filePath = storagePath + 'sync' + randomIdx;
    if (fs.existsSync(filePath)) {
      list.push(fs.readFileSync(filePath).toString());
    }
  }
  return list;
}

function pull (proc) {
  const list = pullList();
  const result = [];
  for (let fileName of list) {
    const fold = fileName.substr(0, 2) + '/';
    const filePath = storagePath + fold + fileName;
    if (fs.existsSync(filePath + '.meta')) {
      try {
        const meta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
        result.push(meta.mod + '/' + fileName + '/' + meta.hash);
      } catch (e) { proc.fail(e); }
    }
  }
  proc.done(result);
}

function writeSyncFile (data, dataCallback, errorCallback) {
  const fold = data.key.substr(0, 2) + '/';
  const filePath = storagePath + fold + data.key;
  const randomIdx = (Math.floor(Math.random() * SYNC_RANDOM_ID_RANGE)).toString().padStart(3, '0');
  const fileExists = fs.existsSync(filePath);
  if (!pullList().includes(data.key) && fileExists) {
    try {
      fs.writeFileSync(storagePath + 'sync' + randomIdx, data.key);
    } catch (e) {
      errorCallback(e);
      return;
    }
    dataCallback('Queued on index ' + randomIdx);
  } else if (!fileExists) {
    dataCallback(false);
  } else {
    dataCallback(null);
  }
}

function queue (proc, data) {
  const key = proc.command && proc.command[1] ? proc.command[1] : data.key;
  writeSyncFile({key: key}, proc.done, proc.fail);
}

function sync (proc) {
  const key = proc.command[1];
  writeSyncFile({key}, proc.done, proc.fail);
}

exports.queue = queue;
exports.pull = pull;
exports.sync = sync;
