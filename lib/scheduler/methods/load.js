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
exports.load = data => function (p, input, onSuccess, onFailure) {
  let key;
  if (input && isNaN(input)) {
    key = input;
  } else {
    key = data;
    onFailure = onSuccess;
    onSuccess = input;
  }

  if (typeof onSuccess === 'undefined') onSuccess = 1;
  if (isNaN(onSuccess)) return p.fail('load: expects jump for onSuccess');
  if (typeof onFailure !== 'undefined' && isNaN(onFailure)) return p.fail('load: expects jump for onFailure');

  const done = data => p.jump(onSuccess, data);
  const fail = error => {
    if (typeof onFailure === 'undefined') return p.fail(error);
    else return p.jump(onFailure, error);
  };

  return modules.module['storage'].main.load({done, fail}, {key: encodeURIComponent(key), readFile: true}); // TODO ugly global hack
};
