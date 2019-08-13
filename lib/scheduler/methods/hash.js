const djb2 = require('../../../common/crypto/hashDJB2');
const sha256 = require('js-sha256');

/**
   * Create a sha256 hash from an input string.
   * @param {String} [method='sha256'] - Method to use for hashing, defaults to SHA256
   * @example
   *  hash          // input: "this_is_my_data", returns hash: 5322fecfc92a5e3248a297a3df3eddfb9bd9049504272e4f572b87fa36d4b3bd
   *  hash sha256   // input: "this_is_my_data", returns hash: 5322fecfc92a5e3248a297a3df3eddfb9bd9049504272e4f572b87fa36d4b3bd
   *  hash sha244   // input: "this_is_my_data", returns hash: 5c9a89e377c61881a6eac897e7308ceab6ad5587755db1d5ce82b2b7
   *  hash djb2     // input: "this_is_my_data", returns hash: 49B87777
   */
this.hash = ydata => function (p, method) {
  let hash;
  switch (method) {
    case 'djb2':
      hash = djb2.hash(ydata);
      break;
    case 'sha244':
      hash = sha256.sha224(ydata);
      break;
    default:
      hash = sha256.sha256(ydata);
      break;
  }
  this.next(p, 0, hash);
};
