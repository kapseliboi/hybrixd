const modules = require('../../modules');

/**
   * Retrieve a string value stored under key.
   * NOTE: When loading saved objects, pass them through jpar for object conversion.
   * @category Storage
   * @param {String} [key] - Key from which to retrieve data.
   * @example
   * load @success @notFound           // load from the key specified in the data stream, on success jump to @success, else jump to @notFound
   * load myFavoriteColor              // retrieve the value for myFavoriteColor
   * load myObject                     // retrieve the value for myObject
   * load myObject @success @notFound  // attempt to retrieve the value for myObject, jump to @success on success, or to @notFound on failure
   * jpar                              // often used in conjunction with load - converts a loaded JSON value to an object
   */
exports.load = data => function (p, input, success, failure) {
  let key;
  if (input && isNaN(input)) {
    key = input;
    failure = failure || 1;
    success = success || 1;
  } else {
    key = data;
    failure = success || 1;
    success = input || 1;
  }

  const done = data => { this.jump(p, isNaN(success) ? 1 : success || 1, data); };
  const fail = error => { this.jump(p, isNaN(failure) ? 1 : failure || 1, error); };
  modules.module['storage'].main.load({done, fail}, {key: encodeURIComponent(key), readFile: true}); // TODO ugly global hack
};
