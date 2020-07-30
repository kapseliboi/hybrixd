// used by shuf
function shuffle (a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}
/**
   * Shuffle elements in an array or input string randomly or shift them left or right.
   * @category Array/String
   * @param {Number} [amount] - Optional: Amount to shift, if omited the array is shufled randomly
   * @example
   * shuf            // input: ['A','B','C'], output: ['B','A','C'] (or any other random combination)
   * shuf 1            // input: ['A','B','C'], output: ['C','A','B']
   * shuf -1            // input: ['A','B','C'], output: ['B','C','A']
   */
exports.shuf = data => function (p, amount) {
  const str = typeof data === 'string';
  if (str) data = data.split('');
  if (!(data instanceof Array)) p.fail('shuf: expected array');
  else if (typeof amount === 'undefined') {
    shuffle(data);
    if (str) data = data.join('');
    p.next(data);
  } else if (!isNaN(amount)) {
    amount = Number(amount);
    if (amount < 0) {
      const head = data.splice(0, -amount); // remove and stor head
      data.push(...head); // append head to data
    } else {
      const tail = data.splice(data.length - amount); // remove and store tail
      data.unshift(...tail); // prepend tail to data
    }
    if (str) data = data.join('');
    p.next(data);
  } else p.fail('shuf: expected numerical amount or rand');
};
