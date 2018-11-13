// storage.js :: higher level storage functions
// depends on localforage.nopromises.min.js
var fs = require('fs');
var DJB2 = require('../../common/crypto/hashDJB2');
var proofOfWork = require('../../common/crypto/proof');
var storagePath = require('path').normalize(process.cwd() + '/../storage/'); // TODO define in conf file

function makeDir (dirname) {
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname);
  }
}

var seek = function (key, dataCallback, errorCallback) {
  var fold = key.substr(0, 2) + '/';
  var filePath = storagePath + fold + key;
  if (fs.existsSync(filePath)) {
    dataCallback(true);
  } else {
    dataCallback(false);
  }
};

var get = function (key, dataCallback, errorCallback) {
  var fold = key.substr(0, 2) + '/';
  var filePath = storagePath + fold + key;

  if (fs.existsSync(filePath)) {
    // update meta data with last time read
    var meta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
    meta.read = Date.now();
    fs.writeFileSync(filePath + '.meta', JSON.stringify(meta));

    var fileKey = 'storage/' + fold + key;
    dataCallback(fileKey);
  } else {
    errorCallback('File not found');
  }
};

var setMeta = function (data, dataCallback, errorCallback) {
  var fold = data.key.substr(0, 2) + '/';
  makeDir(storagePath + fold);
  var filePath = storagePath + fold + data.key;
  fs.writeFileSync(filePath + '.meta', JSON.stringify(data.meta));
  dataCallback();
};

var set = function (data, dataCallback, errorCallback) {
  if (data.value.length > 4096) { // TODO value to conf
    errorCallback('Storage limit is 4096 bytes.');
  } else {
    var fold = data.key.substr(0, 2) + '/';
    makeDir(storagePath + fold);
    var filePath = storagePath + fold + data.key;
    fs.writeFileSync(filePath, data.value); // TODO ASYNC when web wallet is able to do autoproc calls

    // create proof of work
    var size = data.value.length;
    var difficulty = (size * 64 > 5000 ? size * 64 : 5000); // the more bytes to store, the bigger the POW challenge
    var pow = proofOfWork.create(difficulty);

    var meta = {time: Date.now(), hash: DJB2.hash(data.value), size: size, pow: pow.proof, res: pow.hash, n: 0, read: null};

    if (fs.existsSync(filePath + '.meta')) {
      var oldmeta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
      if (typeof oldmeta.n !== 'undefined') { meta.n = oldmeta.n; } // overwrite n (not sure that that does though??)
    }
    setMeta({key: data.key, meta}, () => {
      dataCallback(pow.hash);
    }, errorCallback);
  }
};

var del = function (key, dataCallback, errorCallback) {
  var fold = key.substr(0, 2) + '/';
  var filePath = storagePath + fold + key;
  // TODO check if path exists
  fs.unlinkSync(filePath);
  fs.unlinkSync(filePath + '.meta');
  dataCallback();
};

var provideProof = function (data, dataCallback, errorCallback) {
  var key = data.key;
  var pow = data.pow;
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

var getMeta = function (key, dataCallback, errorCallback) {
  var fold = key.substr(0, 2) + '/';
  var filePath = storagePath + fold + key;
  if (fs.existsSync(filePath + '.meta')) {
    var meta = JSON.parse(String(fs.readFileSync(filePath + '.meta')));
    dataCallback(meta);
  } else {
    errorCallback('File not found');
  }
};

var autoClean = function () {
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
              var fileelement = storagePath + fold + '/' + storekey;
              // DEBUG: console.log(" [i] module storage: test on storage " + fileelement);
              if (fs.existsSync(fileelement)) {
                var meta = JSON.parse(String(fs.readFileSync(fileelement)));
                // DEPRECATED: var mindeadline = Date.now() - (global.hybridd.maxstoragetime * 86400) - global.hybridd.maxstoragetime * (864 * meta.n);
                var mindeadline = Date.now() - ((typeof global.hybridd.minstoragetime !== 'undefined' && global.hybridd.minstoragetime >= 1 ? global.hybridd.minstoragetime : 1) * 86400);
                var maxdeadline = Date.now() - ((typeof global.hybridd.maxstoragetime !== 'undefined' && global.hybridd.maxstoragetime >= 1 ? global.hybridd.maxstoragetime : 365) * 86400);
                if ((meta.res!==1 && meta.time < mindeadline) || (meta.res===1 && meta.time < maxdeadline)) {
                  var dataelement = fileelement.substr(0, fileelement.length - 5);
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
