// storage.js :: higher level storage functions
// contains localforage.nopromises.min.js

// var storage = (function () {
//   /*!
//     localForage -- Offline Storage, Improved
//     Version 1.5.0
//     https://localforage.github.io/localForage
//     (c) 2013-2017 Mozilla, Apache License 2.0
//   */

//   return storage;
// })();

import { hybridd, hybriddcall, hybriddReturnProcess } from './hybriddcall.js';

import * as R from 'ramda';

import { from } from 'rxjs/observable/from';
import { of } from 'rxjs/observable/of';
import { merge } from 'rxjs/observable/merge';
import { combineLatest } from 'rxjs/observable/combineLatest';
import { timer } from 'rxjs/observable/timer';
import { filter, map, delayWhen, flatMap, retryWhen } from 'rxjs/operators';

storage_;

var Sync = function (storekey) {
  var storageMetaStream = from(hybriddcall({r: 'e/storage/meta/' + storekey, z: false}))
    .pipe(
      filter(R.propEq('error', 0)),
      map(R.merge({r: 'e/storage/meta/' + storekey, z: true}))
    );

  var localForageStream = from(localforage.getItem(storekey + '.meta'))
    .pipe(
      map(function (localMetaData) {
        return R.isNil(localMetaData)
          ? { time: 0, hash: 0 }
          : localMetaData;
      })
    );

  var storageMetaResponseProcessStream = storageMetaStream
    .pipe(
      flatMap(function (properties) {
        return from(hybriddReturnProcess(properties));
      }),
      map(function (data) {
        if (R.isNil(R.prop('stopped', data)) && R.prop('progress', data) < 1) throw data;
        return data;
      }),
      retryWhen(function (errors) {
        return errors.pipe(
          delayWhen(_ => timer(1000))
        );
      }),
      map((z) => {
        var meta = z.data;
        var metaDataExists = typeof meta === 'undefined' || meta === null || meta === 'null';
        return R.not(metaDataExists)
          ? meta
          : { time: 0, hash: null };
      })
    );

  var compareStream = combineLatest(
    storageMetaResponseProcessStream,
    localForageStream
  )
    .pipe(
      flatMap(function (z) {
        var metaData = R.nth(0, z);
        var localMetaData = R.nth(1, z);

        if (metaData.hash !== localMetaData.hash) {
          return metaData.time > localMetaData.time
            ? remoteIsNewer(storekey)
            : remoteIsOlder(storekey, metaData);
        } else {
          return noChangesBetweenRemoteAndLocal(storekey, metaData);
        }
      })
    );

  function remoteIsNewer (storeKey) {
    var storageGetStream = from(hybridd.hybriddcall({r: 'e/storage/get/' + storeKey, z: 0}));

    var storageGetResponseStream = storageGetStream
      .pipe(
        flatMap(function (properties) {
          return from(hybridd.hybriddReturnProcess(properties));
        }),
        map(function (data) {
          if (R.isNil(R.prop('stopped', data)) && R.prop('progress', data) < 1) throw data;
          return data;
        }),
        retryWhen(function (errors) {
          return errors.pipe(
            delayWhen(_ => rxjs.timer(1000))
          );
        }),
        flatMap(function (object) {
          var dataExists = typeof object.data === 'undefined' ||
                object.data === null ||
                object.data === 'null';
          if (dataExists) {
            return from(localforage.getItem(storeKey));
          } else {
            try {
              localforage.setItem(storeKey, object.data);
              localforage.setItem(storeKey + '.meta', {time: Date.now(), hash: DJB2.hash(object.data)});
              return of(object.data);
            } catch (e) {
              // TODO: throw error!
              return of(object.data);
            }
          }
        }));

    return storageGetResponseStream.pipe(map(_ => {
      return _;
    }));
  }

  function remoteIsOlder (storeKey, metaData) {
    return from(localforage.getItem(storeKey)
      .then(r => r)
      .catch(e => console.log('e', e)))
      .pipe(
        flatMap(function (value) {
          var setStorageCallStream = from(hybridd.hybriddcall({r: 'e/storage/set/' + storekey + '/' + value, z: true }));

          var setStorageResponseStream = setStorageCallStream
            .pipe(
              flatMap(function (properties) {
                return from(hybridd.hybriddReturnProcess(properties));
              }),
              map(data => {
                if (R.isNil(R.prop('stopped', data)) && R.prop('progress', data) < 1) throw data;
                return data;
              }),
              retryWhen(function (errors) {
                return errors.pipe(
                  delayWhen(_ => timer(1000))
                );
              }),
              map(function (object) {
                // Add to Proof of Work queue.
                if (typeof object.data === 'string' &&
                      GL.powqueue.indexOf(metaData.res) === -1) {
                  GL.powqueue.push(storekey + '/' + R.prop('data', object));
                }
                return value;
              })
            );

          return setStorageResponseStream;
        })
      );
  }

  function noChangesBetweenRemoteAndLocal (storeKey, metaData) {
    return from(localforage.getItem(storeKey))
      .pipe(
        map(function (value) {
          var dataExists = metaData.res !== 'undefined' &&
              metaData.res !== 1 &&
              GL.powqueue.indexOf(metaData.res) !== -1;
          if (dataExists) {
            GL.powqueue.push(storeKey + '/' + metaData.res); // add to proof of work queue
          }
          return value;
        })
      );
  }

  return compareStream;
};

// if (typeof define === 'function' && define.amd) {
//   define(function () { return storage; });
// } else if (typeof module !== 'undefined' && module != null) {
//   module.exports = storage;
// } else if (typeof angular !== 'undefined' && angular != null) {
//   angular.module('storage', [])
//     .factory('storage', function () {
//       return storage;
//     });
// }

export var Storage = {
  Set: function (storekey, storevalue) {
    return merge(
      from(localforage.setItem(storekey, storevalue)),
      from(localforage.setItem(storekey + '.meta', {
        time: Date.now(),
        hash: DJB2.hash(storevalue)
      }))
    );
    // if (storekey.substr(-6) !== '-LOCAL') {
    //   console.log('not local');
    //   return Sync(storekey);
    // } else {
    //   console.log('local');
    //   return of(storevalue);
    // }
  },

  Get: function (storekey, postfunction) {
    if (storekey.substr(-6) === '-LOCAL') {
      localforage.getItem(storekey).then(function (value) {
        postfunction(value);
      });
    } else {
      Sync(storekey, function (value) { postfunction(value); });
    }
    return true;
  },

  Get_: function (storekey) {
    if (storekey.substr(-6) === '-LOCAL') {
      return from(localforage.getItem(storekey));
    } else {
      return Sync(storekey);
    }
  },

  Del: function (storekey) {
    try {
      localforage.removeItem(storekey);
      return true;
    } catch (e) {
      return false;
    }
  },
  Idx: function (postfunction) {
    localforage.keys().then(function (value) {
      if (typeof postfunction === 'function') {
        postfunction(value);
      }
    }).catch(function (err) {
      if (typeof postfunction === 'function') {
        postfunction([]);
      }
    });
  }
};
