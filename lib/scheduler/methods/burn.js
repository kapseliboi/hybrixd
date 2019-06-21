const modules = require('../../modules');

/**
   * Delete a storage item
   * @category Storage
   * @param {String} key - Key for the item to delete.
   * @example
   * burn myFavoriteColor  //
   */
exports.burn = data => function (p, key, success, failure) {
  key = key || data; // TODO handle success  and failure in this case
  const done = data => { this.jump(p, isNaN(success) ? 1 : success || 1, data); };
  const fail = () => { this.jump(p, isNaN(failure) ? 1 : failure || 1, data); };
  modules.module['storage'].main.burn({done, fail}, {key: encodeURIComponent(key)} // TODO ugly global hack
  );
};
