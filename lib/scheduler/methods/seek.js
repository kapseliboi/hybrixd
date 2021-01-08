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
exports.seek = data => function (p, input, onFound, onNotFound) {
  let key;
  if (input && isNaN(input)) {
    key = input;
  } else {
    key = data;
    onNotFound = onFound;
    onFound = input;
  }

  if (typeof onFound === 'undefined') onFound = 1;
  if (isNaN(onFound)) return p.fail('seek: expects jump for onFound');
  if (typeof onNotFound !== 'undefined' && isNaN(onNotFound)) return p.fail('seek: expects jump for onFound');

  const done = data => data ? p.jump(onFound, data) : p.jump(onNotFound, data);
  const fail = error => p.fail(error);

  return modules.module['storage'].main.seek({done, fail}, {key: encodeURIComponent(key)}); // TODO ugly global hack
};
