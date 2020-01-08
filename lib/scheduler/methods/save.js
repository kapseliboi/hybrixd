const modules = require('../../modules');

/**
   * Store a key value pair. When value is an object, it will be stored as a string.
   * @category Storage
   * @param {String} key - Key under which to store data
   * @param {Object} [value=data] - Value to store
   * @example
   * save storeDataStuff             // saves the data stream variable under key storeDataStuff
   * save myFavoriteColor 'blue'     // saves "blue" under key myFavoriteColor
   * save myObject {key:'storeme'}   // saves "{key:\"storeme\"}" under key myObject
   */
exports.save = data => function (p, key, value) {
  if (typeof value === 'undefined') { value = data; }
  const done = data => { this.next(p, 0, data); };
  const fail = error => { this.fail(p, error); };
  if (typeof value !== 'string') {
    value = JSON.stringify(value);
  }
  modules.module['storage'].main.save({done, fail}, {key: encodeURIComponent(key), value: value, noSync: true});// TODO ugly global hack
};
