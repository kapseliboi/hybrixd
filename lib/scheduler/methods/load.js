const modules = require('../../modules');

/**
   * Retrieve a string value stored under key.
   * NOTE: When loading saved objects, pass them through jpar() for conversion!
   * @category Storage
   * @param {String} key - Key from which to retrieve data
   * @example
   * load("myFavoriteColor")  // retrieve the value for myFavoriteColor
   * load("myObject")         // retrieve the value for myObject
   * load("myObject",@success,@notFound)
   * load(@success,@notFound)
   * jpar()                   // convert loaded value to object
   */
exports.load = data => function (p, input, success, failure) {
  let key;
  if (input && isNaN(input)) {
    key = input;
    failure = failure || 1;
    success = success || 1;
  } else {
    key = global.hybrixd.proc[p.processID].data;
    failure = success || 1;
    success = input || 1;
  }

  const done = data => { this.jump(p, isNaN(success) ? 1 : success || 1, data); };
  const fail = () => { this.jump(p, isNaN(failure) ? 1 : failure || 1, data); };
  modules.module['storage'].main.load({done, fail}, {key: encodeURIComponent(key), readFile: true}); // TODO ugly global hack
};
