/**
   * Change case of a string.
   * @category Array/String
   * @param {String} mode - Target case type.
   * @example
   *  case upper           // input: 'what is THIS?', returns: 'WHAT IS THIS?'
   *  case lower           // input: 'what is THIS?', returns: 'what is this?'
   *  case words           // input: 'what is THIS?', returns: 'What Is This?'
   *  case first           // input: 'what is THIS?', returns: 'What is this?'
   *  case camel           // input: 'what is THIS?', returns: 'whatIsThis?'
   *  case inverse         // input: 'what is THIS?', returns: 'WHAT IS this?'
   */
exports.case = input => function (p, mode) {
  let output;
  switch (mode) {
    case 'lower': output = input.toLowerCase(); break;
    case 'upper': output = input.toUpperCase(); break;
    case 'words': output = input.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
      break;
    case 'first': output = input.replace(/.+?([.?!]\s|$)/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
      break;
    case 'camel': output = input.replace(/(?:^\w|[A-Z]|\b\w)/g, function (letter, index) {
      return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
    }).replace(/\s+/g, '');
      break;
      // case 'inverse':
    default:
      output = '';
      for (let i = 0; i < input.length; i++) {
        const j = input.substr(i, 1);
        if (j === j.toLowerCase()) {
          output = output + j.toUpperCase();
        } else {
          output = output + j.toLowerCase();
        }
      }
      break;
  }
  this.next(p, 0, output);
};
