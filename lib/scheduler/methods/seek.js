const modules = require('../../modules');

/**
   * Seek a storage key and jump on existence or not.
   * @category Storage
   * @param {String} key - Key for which to seek
   * @example
   * seek myFavoriteColor 1 2
   */
exports.seek = data => function (p, key, success, failure) {
  key = key || data; // TODO handle success  and failure in this case
  const done = data => { this.jump(p, isNaN(success) ? 1 : success || 1, data); };
  const fail = () => { this.jump(p, isNaN(failure) ? 1 : failure || 1, data); };
  modules.module['storage'].main.seek({done, fail}, {key: encodeURIComponent(key)});// TODO ugly global hack
};
