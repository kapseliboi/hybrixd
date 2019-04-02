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
    fs.writeFileSync(filePath, data.value); // TODO ASYNC when web wallet is able to do autoproc calls

    // create proof of work
    let size = data.value.length;
    let difficulty = (size * 64 > 5000 ? size * 64 : 5000); // the more bytes to store, the bigger the POW challenge
    let pow = proofOfWork.create(difficulty);

    let meta = {time: Date.now(), hash: DJB2.hash(data.value), size: size, pow: pow.proof, res: pow.hash, difficulty: difficulty, n: 0, read: null};

    if (fs.existsSync(filePath + '.meta')) {
      let oldmeta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
      if (typeof oldmeta.n !== 'undefined') { meta.n = oldmeta.n; } // overwrite n (not sure that that does though??)
    }
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
        console.log('>>>>>>>> Proof accepted');
        setMeta({key, meta}, dataCallback, errorCallback);
      } else {
        console.log('>>>>>>>>  Proof ignored');
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

let autoClean = function () {
  console.log(' [.] module storage: storage auto-clean scan');
  if (!fs.statSync(storagePath).isDirectory()) {
    fs.mkdirSync(storagePath);
    return; // if path did not exists it's already cleaned
  }
  fs.readdir(storagePath, (err, directories) => {
    // scan storage directories
    directories.sort().forEach((fold, dirindex, dirarray) => {
      if (fs.statSync(storagePath + fold).isDirectory()) {
        // DEBUG: console.log(" [i] module storage: found directory " + storepath + fold);
        fs.readdir(storagePath + fold, (err, files) => {
          files.sort().forEach((storekey, fileindex, filearray) => {
            if (storekey.substr(-5) === '.meta') {
              let fileelement = storagePath + fold + '/' + storekey;
              // DEBUG: console.log(" [i] module storage: test on storage " + fileelement);
              if (fs.existsSync(fileelement)) {
                let meta = JSON.parse(String(fs.readFileSync(fileelement)));
                // DEPRECATED: var mindeadline = Date.now() - (global.hybrixd.maxstoragetime * 86400) - global.hybrixd.maxstoragetime * (864 * meta.n);
                let mindeadline = Date.now() - ((typeof global.hybrixd.minstoragetime !== 'undefined' && global.hybrixd.minstoragetime >= 1 ? global.hybrixd.minstoragetime : 1) * 86400);
                let maxdeadline = Date.now() - ((typeof global.hybrixd.maxstoragetime !== 'undefined' && global.hybrixd.maxstoragetime >= 1 ? global.hybrixd.maxstoragetime : 365) * 86400);
                if ((meta.res !== 1 && meta.time < mindeadline) || (meta.res === 1 && meta.time < maxdeadline)) {
                  let dataelement = fileelement.substr(0, fileelement.length - 5);
                  try {
                    fs.unlinkSync(dataelement);
                    fs.unlinkSync(fileelement);
                    console.log(' [i] module storage: purged stale storage element' + dataelement);
                    // DEBUG: console.log(' [i] module storage: STORETIME ' + meta.time + ' MINDEADLINE ' + mindeadline + ' MAXDEADLINE ' + maxdeadline);
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
};

exports.seek = seek;
exports.get = get;
exports.set = set;
exports.del = del;
exports.getMeta = getMeta;
exports.provideProof = provideProof;
exports.autoClean = autoClean;
exports.qrtzLoad = qrtzLoad;
