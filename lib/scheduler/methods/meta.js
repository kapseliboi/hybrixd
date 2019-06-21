const modules = require('../../modules');

/**
   * Retrieve the meta data based on a key.
   * @category Storage
   * @param {String} key - Key for which to get metadata
   * @example
   * meta myFavoriteColor  // retrieve the meta data for myFavoriteColor
   */
this.meta = data => function (p, input, success, failure) {
  const key = input || data;
  const done = data => { this.jump(p, isNaN(success) ? 1 : success || 1, data); };
  const fail = () => { this.jump(p, isNaN(failure) ? 1 : failure || 1, data); };
  modules.module['storage'].main.meta({done, fail}, {key: encodeURIComponent(key)});// TODO ugly global hack
};
