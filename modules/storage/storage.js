// storage.js :: higher level storage functions
// depends on localforage.nopromises.min.js
const SECONDS_IN_A_DAY = 5184000;
const SYNC_RANDOM_ID_RANGE = 250;
const STORAGE_LIMIT = 131072; // TODO value to conf

let fs = require('fs');
let glob = require('glob');
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
    fs.mkdirSync(dirname, { recursive: true });
  }
}

const size = function (dataCallback, errorCallback) {
  let storageSize = 0;
  if (fs.existsSync(storagePath + '/size')) {
    storageSize = fs.readFileSync(storagePath + '/size').toString();
  }
  dataCallback(storageSize);
};

const seek = function (data, dataCallback, errorCallback) {
  const successCallback = function (data) {
    if (data.length) {
      dataCallback(true);
    } else {
      dataCallback(false);
    }
  };
  list(data, successCallback, errorCallback);
};

// if .meta file does not exist, return empty object
function getMetaOrEmpty (filePath) {
  let meta;
  if (fs.existsSync(filePath + '.meta')) {
    try {
      meta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
    } catch (e) {
      meta = {};
    }
  } else meta = {};
  return meta;
}

const load = function (data, dataCallback, errorCallback) {
  const fold = data.key.substr(0, 2) + '/';
  const filePath = storagePath + fold + data.key;

  if (fs.existsSync(filePath)) {
    const meta = getMetaOrEmpty(filePath);

    let value;
    if (data.readFile) {
      value = fs.readFileSync(filePath).toString();
      dataCallback(value);
    } else {
      const fileKey = 'storage/' + fold + data.key;
      dataCallback(fileKey);
    }
    // do this after so we don't slow stuff down
    const now = Date.now();
    if (!meta.time) meta.time = now; // if meta data not available, set now
    if (!meta.mod) meta.mod = now; // if meta data not available, set now
    if (!meta.hash && typeof value === 'string') meta.hash = DJB2.hash(value); // if meta data not available, set now

    meta.read = now; // update meta data with last time read
    fs.writeFileSync(filePath + '.meta', JSON.stringify(meta));
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
  const meta = getMetaOrEmpty(filePath);

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

    const now = Date.now();
    if (!meta.time) meta.time = now; // if meta data not available, set now
    meta.mod = now;
    meta.hash = hash;

    fs.writeFileSync(filePath, value);
    fs.writeFileSync(filePath + '.meta', JSON.stringify(meta));
    dataCallback({action: 'update', hash, expire: meta.expire, challenge: meta.challenge, difficulty: meta.difficulty});
  }
};

const save = function (data, dataCallback, errorCallback) {
  if (data.value.length > STORAGE_LIMIT) return errorCallback('Storage limit is ' + STORAGE_LIMIT + ' bytes!');
  else {
    const fold = data.key.substr(0, 2) + '/';

    makeDir(storagePath + fold);

    const filePath = storagePath + fold + data.key;
    if (fs.existsSync(filePath)) return updateFile(data.key, data.value, dataCallback, errorCallback);
    else return createFile(data.key, data.value, dataCallback, errorCallback);
  }
};

const list = function (data, dataCallback, errorCallback) {
  if (data.key.length < 2) {
    errorCallback('Specify a search string of two or more characters!');
  } else {
    const fold = data.key.substr(0, 2) + '/';
    const filePath = storagePath + fold;
    glob(data.key, {cwd: filePath, nodir: true}, function (err, files) {
      if (err) {
        errorCallback('Error reading storage list.');
      } else {
        const result = [];
        for (let i = 0; i < files.length; i += 2) {
          if (files[i].substr(-5) !== '.meta') {
            result.push(files[i]);
          }
        }
        dataCallback(result);
      }
    });
  }
};

const burn = function (key, dataCallback, errorCallback) {
  const fold = key.substr(0, 2) + '/';
  const filePath = storagePath + fold + key;
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  if (fs.existsSync(filePath + '.meta')) fs.unlinkSync(filePath + '.meta');
  return dataCallback('Burned key ' + key);
};

const provideProof = function (data, dataCallback, errorCallback) {
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
    if (data.sessionID !== 1) {
      delete m.pow; // Remove meta to not expose for non root users
    }
    dataCallback(m);
  }, errorCallback
  );
};

const autoClean = function () {
  if (!fs.existsSync(storagePath)) {
    global.hybrixd.logger(['storage'], 'creating storage directory');
    fs.mkdirSync(storagePath, { recursive: true });
    return; // if path did not exists it's already cleaned
  }
  global.hybrixd.logger(['storage'], 'auto-clean scan');

  const now = Date.now();
  du(storagePath, function (e, maxstoragesize) {
    global.hybrixd.logger(['info', 'storage'], 'size is ' + maxstoragesize + ' bytes');
    fs.writeFileSync(storagePath + '/size', maxstoragesize); // store size for /size call

    if (maxstoragesize > conf.get('storage.maxstoragesize')) {
      global.hybrixd.logger(['storage'], 'size maximum reached, cleaning...');

      fs.readdir(storagePath, (e, directories) => {
        // scan storage directories
        directories.forEach((fold, dirindex, dirarray) => {
          if (fs.statSync(storagePath + fold).isDirectory()) {
            // DEBUG: global.hybrixd.logger(['info', 'storage'], 'found directory ' + storepath + fold);
            fs.readdir(storagePath + fold, (e, files) => {
              files.forEach((storekey, fileindex, filearray) => {
                if (storekey.substr(-5) === '.meta') {
                  let fileelement = storagePath + fold + '/' + storekey;
                  // DEBUG: global.hybrixd.logger(['info', 'storage'], 'test on storage ' + fileelement);
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
                        global.hybrixd.logger(['info', 'storage'], 'purged stale storage element' + dataelement);
                      } catch (e) {
                        global.hybrixd.logger(['info', 'storage'], 'failed to purge stale storage ' + dataelement);
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
      global.hybrixd.logger(['info', 'storage'], 'no cleaning necessary');
    }
  });
};

exports.size = size;
exports.seek = seek;
exports.list = list;
exports.get = load;
exports.set = save;
exports.burn = burn;
exports.getMeta = getMetaExt;
exports.provideProof = provideProof;
exports.autoClean = autoClean;
