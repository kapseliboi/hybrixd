const modules = require('../../modules');

/**
   * Return a list of storage keys based on a string. Wildcards are supported.
   * @category Storage
   * @param {String} [key] - Key for which to compile the list.
   * @param {Integer} [onSuccess=1] - Key for which to compile the list.
   * @param {Integer} [onFail=1] - Key for which to compile the list.
   * @param {Integer} [onEmpty=onSuccess] - Key for which to compile the list.
   * @example
   * list                     // list based on string from the data stream
   * list 1 2                 // list based on string from the data stream, on failure jump 2 steps
   * list myFavorite*         // list all keys starting with 'myFavorite'
   * list myFavorite?         // list all keys with 'myFavorite' and any character following it
   * list myFavorite['s','d'] // list all keys that are 'myFavorites' or 'myFavorited'
   */
exports.list = data => function (p, key, onSuccess, onFailure, onEmpty) {
  if (!isNaN(key)) {
    onEmpty = onFailure;
    onFailure = onSuccess;
    onSuccess = key;
    key = data;
  }
  onSuccess = onSuccess || 1;
  onEmpty = onSuccess || 1;

  const done = data => {
    if (data.length !== 0) return p.jump(onSuccess, data);
    else return p.jump(onEmpty, data);
  };
  const fail = error => {
    if (typeof onFailure === 'undefined') return p.fail(error);
    else return p.jump(onFailure, data);
  };
  modules.module['storage'].main.list({done, fail}, {key: encodeURIComponent(key)}); // TODO ugly global hack
};
