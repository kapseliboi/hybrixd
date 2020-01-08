const modules = require('../../modules');

/**
   * Seek a storage key and jump on existence or not.
   * @category Storage
   * @param {String} [key] - Key for which to seek.
   * @example
   * seek 1 2                   // seek key from the data stream, if found jump one step, else jump two steps
   * seek myFavoriteColor 1 2   // seek key 'myFavoriteColor', if found jump one step, else jump two steps
   */
exports.seek = data => function (p, key, success, failure) {
  if (!isNaN(key)) {
    failure = success;
    success = key;
    key = data;
  }
  const done = data => { this.jump(p, isNaN(success) ? 1 : success || 1, data); };
  const fail = error => { this.jump(p, isNaN(failure) ? 1 : failure || 1, error); };
  modules.module['storage'].main.seek({done, fail}, {key: encodeURIComponent(key)});// TODO ugly global hack
};
