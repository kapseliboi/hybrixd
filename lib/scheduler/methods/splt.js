/**
   * Explode a string into an array, split by separator.
   * @category Array/String
   * @param {String} [separator=' '] - Separator character to use for splitting.
   * @param {String} [elements=undefined] - Elements to select from splitted string.
   * @example
   * splt             // input: "This is nice.", output: ["This","is","nice."]
   * splt ','         // input: "Some,list,of,stuff", output: ["Some","list","of","stuff]
   * splt ',' 2       // input: "Some,list,of,stuff", output: "list"
   * splt ',' [2,3]   // input: "Some,list,of,stuff", output: ["list","of"]
   */
exports.splt = ydata => function (p, separator, elements) {
  if (typeof separator === 'undefined') { separator = ''; }
  let splitted;
  if (typeof ydata === 'string') {
    splitted = ydata.split(separator);
  } else {
    splitted = [];
  }
  let result = [];
  if (typeof elements !== 'undefined') {
    if (!isNaN(elements)) {
      result = splitted[elements];
      if (typeof result === 'undefined' || result === null) {
        result = '';
      }
    }
    if (elements instanceof Array) {
      for (let key = 0; key < result.length; key++) {
        result.push(splitted[key]);
      }
    }
  } else {
    result = splitted;
  }
  this.next(p, 0, result);
};
