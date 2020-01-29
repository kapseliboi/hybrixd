const modules = require('../../modules');

/**
   * Return a list of storage keys based on a string. Wildcards are supported.
   * @category Storage
   * @param {String} [key] - Key for which to compile the list.
   * @example
   * list                     // list based on string from the data stream
   * list 1 2                 // list based on string from the data stream, on failure jump 2 steps
   * list myFavorite*         // list all keys starting with 'myFavorite'
   * list myFavorite?         // list all keys with 'myFavorite' and any character following it
   * list myFavorite['s','d'] // list all keys that are 'myFavorites' or 'myFavorited'
   */
exports.list = data => function (p, key, success, failure) {
  if (!isNaN(key)) {
    failure = success;
    success = key;
    key = data;
  }
  const done = data => { this.jump(p, isNaN(success) ? 1 : success || 1, data); };
  const fail = () => { this.jump(p, isNaN(failure) ? 1 : failure || 1, data); };
  modules.module['storage'].main.list({done, fail}, {key: encodeURIComponent(key)}); // TODO ugly global hack
};
