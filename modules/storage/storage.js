// storage.js :: higher level storage functions
// depends on localforage.nopromises.min.js
const SECONDS_IN_A_DAY = 5184000;

let fs = require('fs');
let conf = require('../../lib/conf/conf');
let DJB2 = require('../../common/crypto/hashDJB2');
let proofOfWork = require('../../common/crypto/proof');
let storagePath = require('path').normalize(process.cwd() + '/../storage/'); // TODO define in conf file
let du = require('du');

const getFilesizeInBytes = function (filename) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes;
};

function makeDir (dirname) {
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname);
  }
}

let size = function (dataCallback, errorCallback) {
  let storageSize = 0;
  if (fs.existsSync(storagePath + '/size')) {
    storageSize = fs.readFileSync(storagePath + '/size').toString();
  }
  dataCallback(storageSize);
};

let seek = function (data, dataCallback) {
  const fold = data.key.substr(0, 2) + '/';
  const filePath = storagePath + fold + data.key;
  if (fs.existsSync(filePath)) {
    dataCallback(true);
  } else {
    dataCallback(false);
  }
};

let load = function (data, dataCallback, errorCallback) {
  const fold = data.key.substr(0, 2) + '/';
  const filePath = storagePath + fold + data.key;

  if (fs.existsSync(filePath)) {
    // update meta data with last time read
    let meta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
    meta.read = Date.now();
    fs.writeFileSync(filePath + '.meta', JSON.stringify(meta));

    if (typeof data.readFile !== 'undefined' && data.readFile) {
      dataCallback(fs.readFileSync(filePath).toString());
    } else {
      let fileKey = 'storage/' + fold + data.key;
      dataCallback(fileKey);
    }
  } else {
    errorCallback('File not found');
  }
};

const createFile = (key, value, dataCallback, errorCallback) => {
  const fold = key.substr(0, 2) + '/';
  const filePath = storagePath + fold + key;
  const hash = DJB2.hash(value);

  const size = value.length;
  const difficulty = (size * 64 > 5000 ? size * 64 : 5000); // the more bytes to store, the bigger the POW challenge TODO conf setting
  const pow = proofOfWork.create(difficulty);

  const meta = {
    time: Date.now(), // Creation time
    mod: Date.now(), // Modification time
    read: null, // Read time
    expire: null, // Expiration time : null means ephimiral it could be removed at any moment

    hash, // Content Hash

    pow: pow.proof, // proof of work solution
    challenge: pow.hash, // proof of work challenge
    difficulty: difficulty // proof of work difficulty
  };

  fs.writeFileSync(filePath, value); // TODO ASYNC when web wallet is able to do autoproc calls
  fs.writeFileSync(filePath + '.meta', JSON.stringify(meta));

  dataCallback({action: 'create', hash, expire: null, challenge: meta.challenge, difficulty: meta.difficulty});
};

const updateFile = (key, value, dataCallback, errorCallback) => {
  const fold = key.substr(0, 2) + '/';
  const filePath = storagePath + fold + key;
  const meta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
  const hash = DJB2.hash(value);
  if (hash === meta.hash) { // value has not changed
    dataCallback({action: 'none', hash, expire: meta.expire, challenge: meta.challenge, difficulty: meta.difficulty});
  } else {
    const currentSize = getFilesizeInBytes(filePath);
    const newSize = value.length;

    if (meta.expire !== null) { // If proof of work has been done then this might need modificaion
      if (newSize > currentSize) { // Size is larger, so it will expire sooner
        meta.expire = Math.round(meta.time + (meta.expire - meta.time) / newSize * currentSize);
      }
    }

    meta.hash = hash;

    fs.writeFileSync(filePath, value);
    fs.writeFileSync(filePath + '.meta', JSON.stringify(meta));

    dataCallback({action: 'update', hash, expire: meta.expire, challenge: meta.challenge, difficulty: meta.difficulty});
  }
};

let save = function (data, dataCallback, errorCallback) {
  const storageLimit = 65536;
  if (data.value.length > 65536) { // TODO value to conf
    errorCallback('Storage limit is ' + storageLimit + ' bytes!');
  } else {
    const fold = data.key.substr(0, 2) + '/';

    makeDir(storagePath + fold);

    const filePath = storagePath + fold + data.key;
    if (fs.existsSync(filePath + '.meta')) {
      updateFile(data.key, data.value, dataCallback, errorCallback);
    } else {
      createFile(data.key, data.value, dataCallback, errorCallback);
    }
    if (!data.noSync) {
      sync(data, dataCallback, errorCallback);
    }
  }
};

let sync = function (data, dataCallback, errorCallback) {
  const fold = data.key.substr(0, 2) + '/';
  const filePath = storagePath + fold + data.key;
  const range = 250;
  const randomIdx = ('00' + Math.floor(Math.random() * range)).slice(-3);
  if (pullList().indexOf(data.key) === -1 && fs.existsSync(filePath)) {
    fs.writeFileSync(storagePath + '/sync' + randomIdx, data.key);
    dataCallback();
  } else {
    errorCallback();
  }
};

let pullList = function () {
  const range = 250;
  const list = [];
  for (let i = 0; i < range; i++) {
    const randomIdx = ('00' + i).slice(-3);
    const filePath = storagePath + '/sync' + randomIdx;
    if (fs.existsSync(filePath)) {
      list.push(fs.readFileSync(filePath).toString());
    }
  }
  return list;
};

let pull = function (dataCallback, errorCallback) {
  const list = pullList();
  const result = [];
  for (let i = 0; i < list.length; i++) {
    const fold = list[i].substr(0, 2) + '/';
    const filePath = storagePath + fold + list[i];
    if (fs.existsSync(filePath + '.meta')) {
      try {
        const meta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
        result.push(meta.mod + '/' + list[i] + '/' + meta.hash);
      } catch (e) {}
    }
  }
  dataCallback(result);
};

let del = function (key, dataCallback, errorCallback) {
  const fold = key.substr(0, 2) + '/';
  const filePath = storagePath + fold + key;
  // TODO check if path exists
  fs.unlinkSync(filePath);
  fs.unlinkSync(filePath + '.meta');
  dataCallback();
};

let provideProof = function (data, dataCallback, errorCallback) {
  const key = data.key;
  const pow = data.pow;
  getMeta(key, (meta) => {
    if (meta.hasOwnProperty('pow')) {
      if (meta.pow === pow) {
        const fold = key.substr(0, 2) + '/';
        const filePath = storagePath + fold + key;

        delete meta.pow;
        delete meta.challenge;
        delete meta.difficulty;

        if (meta.expire === null) {
          meta.expire = Date.now() + conf.get('storage.maxstoragetime') * SECONDS_IN_A_DAY;
        } else {
          meta.expire += conf.get('storage.maxstoragetime') * SECONDS_IN_A_DAY;
        }

        fs.writeFileSync(filePath + '.meta', JSON.stringify(meta));

        dataCallback({expire: meta.expire});
      } else {
        errorCallback('Invalid proof.');
      }
    } else {
      errorCallback('No proof requested.');
    }
  }, errorCallback);
};

const getMeta = function (key, dataCallback, errorCallback) {
  const fold = key.substr(0, 2) + '/';
  const filePath = storagePath + fold + key;
  if (fs.existsSync(filePath + '.meta')) {
    const meta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
    dataCallback(meta);
  } else {
    errorCallback('File not found');
  }
};

const getMetaExt = function (data, dataCallback, errorCallback) {
  getMeta(data.key, m => {
    delete m.pow; // Remove meta to not expose
    dataCallback(m);
  }, errorCallback
  );
};

let autoClean = function () {
  if (!fs.existsSync(storagePath)) {
    console.log(' [.] module storage: creating storage directory');
    fs.mkdirSync(storagePath);
    return; // if path did not exists it's already cleaned
  }
  console.log(' [.] module storage: auto-clean scan');

  const now = Date.now();
  du(storagePath, function (e, maxstoragesize) {
    console.log(' [i] module storage: size is ' + maxstoragesize + ' bytes');
    fs.writeFileSync(storagePath + '/size', maxstoragesize); // store size for /size call

    if (maxstoragesize > conf.get('storage.maxstoragesize')) {
      console.log(' [.] module storage: size maximum reached, cleaning...');

      fs.readdir(storagePath, (e, directories) => {
        // scan storage directories
        directories.forEach((fold, dirindex, dirarray) => {
          if (fs.statSync(storagePath + fold).isDirectory()) {
            // DEBUG: console.log(" [i] module storage: found directory " + storepath + fold);
            fs.readdir(storagePath + fold, (e, files) => {
              files.forEach((storekey, fileindex, filearray) => {
                if (storekey.substr(-5) === '.meta') {
                  let fileelement = storagePath + fold + '/' + storekey;
                  // DEBUG: console.log(" [i] module storage: test on storage " + fileelement);
                  if (fs.existsSync(fileelement)) {
                    let meta = JSON.parse(String(fs.readFileSync(fileelement)));

                    let minstoragetime = meta.time + conf.get('storage.minstoragetime') * SECONDS_IN_A_DAY;
                    let maxstoragetime = meta.time + conf.get('storage.maxstoragetime') * SECONDS_IN_A_DAY;
                    let powstoragetime = meta.expire;
                    const expire = meta.expire === null ? minstoragetime : (maxstoragetime > powstoragetime ? maxstoragetime : powstoragetime);

                    if (maxstoragesize > conf.get('storage.maxstoragesize') && expire < now) {
                      let dataelement = fileelement.substr(0, fileelement.length - 5);
                      try {
                        // get filesize and subtract that from maxstoragesize
                        let deleteSize = getFilesizeInBytes(fileelement) + getFilesizeInBytes(dataelement);
                        maxstoragesize = maxstoragesize - deleteSize;
                        // delete the file and metadata
                        fs.unlinkSync(dataelement);
                        fs.unlinkSync(fileelement);
                        console.log(' [i] module storage: purged stale storage element' + dataelement);
                      } catch (e) {
                        console.log(' [!] module storage: failed to purge stale storage ' + dataelement);
                      }
                    }
                  }
                }
              });
            });
          }
        });
      });
    } else {
      console.log(' [i] module storage: no cleaning necessary');
    }
  });
};

exports.size = size;
exports.seek = seek;
exports.sync = sync;
exports.pull = pull;
exports.get = load;
exports.set = save;
exports.del = del;
exports.getMeta = getMetaExt;
exports.provideProof = provideProof;
exports.autoClean = autoClean;
