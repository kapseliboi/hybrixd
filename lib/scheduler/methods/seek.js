const modules = require('../../modules');

/**
   * Seek a storage key and jump on existence or not. Wildcards are supported.
   * @category Storage
   * @param {String} [key=data] - Key for which to seek.
   * @param {Integer} [onFound=1] - Steps to jump when key is found.
   * @param {Integer} [onNotFound=1] - Steps to jump when key is not found.
   * @example
   * seek 1 2                   // seek key from the data stream, if found jump one step, else jump two steps
   * seek myFavoriteColor 1 2   // seek key 'myFavoriteColor', if found jump one step, else jump two steps
   * seek myFavorite* 1 2       // seek key 'myFavorite*', if for example 'myFavoriteColor' is found it jumps one step, else jump two steps
   */
exports.seek = data => function (p, key, onFound, onNotFound) {
  if (!isNaN(key)) {
    onNotFound = onFound;
    onFound = key;
    key = data;
  }
  // TODO error is key not string or number
  // TODO error if onFound not number
  // TODO error if onNOTFound not number

  onFound = isNaN(onFound) ? 1 : onFound || 1;
  onNotFound = isNaN(onNotFound) ? 1 : onNotFound || 1;

  const done = found => {
    p.jump(found ? onFound : onNotFound, data);
  };
  const fail = (errorCode, message) => {
    p.fail(errorCode, message);
  };

  modules.module['storage'].main.seek({done, fail}, {key: encodeURIComponent(key)}); // TODO ugly global hack
};
