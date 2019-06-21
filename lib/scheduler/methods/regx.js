/**
   * Test the data against the regex pattern
   * @category String
   * @param {String} pattern - the regex pattern
   * @example
   * data applepie
   * regx '^apple' 1 2
   * done Match
   * done 'No Match'
   */
exports.regx = data => function (p, pattern, onMatch, onNoMatch) {
  const flags = '';// TODO add flags
  const pattern2 = pattern; // TODO escape regex characters
  const regex = new RegExp(pattern2, flags);
  if (regex.test(data)) {
    this.jump(p, onMatch || 1, data);
  } else {
    this.jump(p, onNoMatch || 1, data);
  }
};
