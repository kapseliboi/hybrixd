// used by shuf
function shuffle (a) {
  let j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}
/**
   * Shuffle elements in an array or input string randomly.
   * @category Array/String
   * @example
   * shuf            // input: ['A','B','C'], output: ['B','A','C']
   */
exports.shuf = data => function (p) {
  let result = null;
  if (data instanceof Array) {
    result = shuffle(data);
  } // TODO string
  this.next(p, 0, result);
};
