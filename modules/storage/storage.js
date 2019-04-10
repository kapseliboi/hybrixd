// storage.js :: higher level storage functions
// depends on localforage.nopromises.min.js
let fs = require('fs');
let DJB2 = require('../../common/crypto/hashDJB2');
let proofOfWork = require('../../common/crypto/proof');
let storagePath = require('path').normalize(process.cwd() + '/../storage/'); // TODO define in conf file

function makeDir (dirname) {
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname);
  }
}

let size = function (dataCallback, errorCallback) {
  let storageSize = 0;
  if (fs.existsSync(storagePath+'/size')) {
    storageSize = fs.readFileSync(storagePath+'/size').toString();
  }
  dataCallback(storageSize);
}

let seek = function (key, dataCallback, errorCallback) {
  let fold = key.substr(0, 2) + '/';
  let filePath = storagePath + fold + key;
  if (fs.existsSync(filePath)) {
    dataCallback(true);
  } else {
    dataCallback(false);
  }
};

let get = function (key, dataCallback, errorCallback) {
  let fold = key.substr(0, 2) + '/';
  let filePath = storagePath + fold + key;

  if (fs.existsSync(filePath)) {
    // update meta data with last time read
    let meta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
    meta.read = Date.now();
    fs.writeFileSync(filePath + '.meta', JSON.stringify(meta));

    let fileKey = 'storage/' + fold + key;
    dataCallback(fileKey);
  } else {
    errorCallback('File not found');
  }
};

let qrtzLoad = function (key, dataCallback, errorCallback) {
  let fold = key.substr(0, 2) + '/';
  let filePath = storagePath + fold + key;

  if (fs.existsSync(filePath)) {
    // update meta data with last time read
    let meta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
    meta.read = Date.now();
    fs.writeFileSync(filePath + '.meta', JSON.stringify(meta));

    dataCallback(fs.readFileSync(filePath).toString());
  } else {
    errorCallback('File not found');
  }
};

let setMeta = function (data, dataCallback, errorCallback) {
  let fold = data.key.substr(0, 2) + '/';
  makeDir(storagePath + fold);
  let filePath = storagePath + fold + data.key;
  fs.writeFileSync(filePath + '.meta', JSON.stringify(data.meta));
  dataCallback();
};

let set = function (data, dataCallback, errorCallback) {
  if (data.value.length > 4096) { // TODO value to conf
    errorCallback('Storage limit is 4096 bytes.');
  } else {
    let fold = data.key.substr(0, 2) + '/';
    makeDir(storagePath + fold);
    let filePath = storagePath + fold + data.key;
    fs.writeFileSync(filePath, data.value);       // TODO ASYNC when web wallet is able to do autoproc calls

    // create proof of work
    let size = data.value.length;
    let difficulty = (size * 64 > 5000 ? size * 64 : 5000); // the more bytes to store, the bigger the POW challenge
    let pow = proofOfWork.create(difficulty);

    let meta = {time: Date.now(), hash: DJB2.hash(data.value), size: size, pow: pow.proof, res: pow.hash, difficulty: difficulty, n: 0, read: null};

    if (fs.existsSync(filePath + '.meta')) {
      let oldmeta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
      if (typeof oldmeta.n !== 'undefined') { meta.n = oldmeta.n; } // overwrite n (not sure that that does though??)
    }

    // save entry to the mutation list
    // TODO!!!
    
    setMeta({key: data.key, meta}, () => {
      dataCallback({hint: pow.hash, difficulty: difficulty});
    }, errorCallback);
  }
};

let del = function (key, dataCallback, errorCallback) {
  let fold = key.substr(0, 2) + '/';
  let filePath = storagePath + fold + key;
  // TODO check if path exists
  fs.unlinkSync(filePath);
  fs.unlinkSync(filePath + '.meta');
  dataCallback();
};

let provideProof = function (data, dataCallback, errorCallback) {
  let key = data.key;
  let pow = data.pow;
  getMeta(key, (meta) => {
    if (meta.pow === pow) {
      if (meta.res !== 1) {
        meta.n += 1;
        meta.res = 1;
        setMeta({key, meta}, dataCallback, errorCallback);
      } else {
        dataCallback('Ignored');
      }
    } else {
      errorCallback('Invalid proof.');
    }
  }, errorCallback);
};

const getMeta = function (key, dataCallback, errorCallback) {
  let fold = key.substr(0, 2) + '/';
  let filePath = storagePath + fold + key;
  if (fs.existsSync(filePath + '.meta')) {
    let meta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
    dataCallback(meta);
  } else {
    errorCallback('File not found');
  }
};

let getFilesizeInBytes = function (filename) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes;
};

let autoClean = function () {
  if (!fs.statSync(storagePath).isDirectory()) {
    console.log(' [.] module storage: creating storage directory');
    fs.mkdirSync(storagePath);
    return; // if path did not exists it's already cleaned
  }
  console.log(' [.] module storage: auto-clean scan');
  let du = require('du');
  du(storagePath, function (err, maxstoragesize) {
    console.log(' [i] module storage: size is '+maxstoragesize+' bytes');
    fs.writeFileSync(storagePath+'/size',maxstoragesize); // store size for /size call
    if (maxstoragesize > global.hybrixd.maxstoragesize) {
      console.log(' [.] module storage: size maximum reached, cleaning...');
      fs.readdir(storagePath, (err, directories) => {
        // scan storage directories
        directories.sort().forEach((fold, dirindex, dirarray) => {
          if (fs.statSync(storagePath + fold).isDirectory()) {
            // DEBUG: console.log(" [i] module storage: found directory " + storepath + fold);
            fs.readdir(storagePath + fold, (err, files) => {
              files.forEach((storekey, fileindex, filearray) => {
                if (storekey.substr(-5) === '.meta') {
                  let fileelement = storagePath + fold + '/' + storekey;
                  // DEBUG: console.log(" [i] module storage: test on storage " + fileelement);
                  if (fs.existsSync(fileelement)) {
                    let meta = JSON.parse(String(fs.readFileSync(fileelement)));
                    let mindeadline = Date.now() - ((typeof global.hybrixd.minstoragetime !== 'undefined' && global.hybrixd.minstoragetime >= 1 ? global.hybrixd.minstoragetime : 1) * 86400);
                    let maxdeadline = Date.now() - ((typeof global.hybrixd.maxstoragetime !== 'undefined' && global.hybrixd.maxstoragetime >= 1 ? global.hybrixd.maxstoragetime : 365) * 86400);
                    let criteria_min = (String(meta.res) !== '1' && meta.time < mindeadline); // not past min deadline, unresolved PoW
                    let criteria_max = (String(meta.res) === '1' && meta.time < maxdeadline); // not past max deadline, resolved PoW
                    if (maxstoragesize > global.hybrixd.maxstoragesize && (criteria_min || criteria_max)) {
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
exports.get = get;
exports.set = set;
exports.del = del;
exports.getMeta = getMeta;
exports.provideProof = provideProof;
exports.autoClean = autoClean;
exports.qrtzLoad = qrtzLoad;
