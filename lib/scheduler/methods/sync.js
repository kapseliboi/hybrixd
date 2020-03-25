const modules = require('../../modules');

/**
   * Add a key to the synchronization list. Function will check for the existence of the object.
   * @category Storage
   * @param {String} key - Key under which to store data
   * @param {Object} [value=data] - Value to store
   * @example
   * sync storeDataStuff             // adds the key storeDataStuff to the synchronization queue
   * sync myFavoriteColor 1 2 3      // adds the key myFavoriteColor, jumps 1 on success, 2 when key does not exist, or 3 when already queued
**/

exports.sync = data => function (p, key, onSuccess, onFailure, onQueued) {
  if (!isNaN(key)) {
    onQueued = onFailure;
    onFailure = onSuccess;
    onSuccess = key;
    key = data;
  }

  // TODO error is key not string or number

  onSuccess = isNaN(onSuccess) ? 1 : onSuccess || 1;
  onFailure = isNaN(onFailure) ? 1 : onFailure || 1;
  onQueued = isNaN(onQueued) ? onSuccess : onQueued || onSuccess;

  const done = result => {
    p.jump(result === null ? onQueued : (result === false ? onFailure : onSuccess), data);
  };
  const fail = (errorCode, message) => {
    p.fail(errorCode, message);
  };

  modules.module['synchronize'].main.writeSyncFile({key: encodeURIComponent(key)}, done, fail);
};
