const tran = require('./tran');

function doTran (p, property, value, data, onExist, onNotExist) {
  const checkVar = tran.chckVar(p, property, value);
  if (checkVar.valid) return p.jump(onExist, data);
  else if (typeof onNotExist === 'undefined') return p.fail(data);
  else p.jump(onNotExist, data);
}
/**
   * Checks for data object to contain other objects.
   * Also for arrays and dictionaries of property paths, and for explicit primitive values.
   * @param {Object} pattern - A (or nested array/dicationary of) strings containing:
   * - explicit values (Example: "Hello")
   * - property paths to test and pass, prefixed with "." (Example: ".foo.bar")
   * - expressions, prefixed with "=" (Example: "=a+b", "=.foo.bar|default")
   * @param {Object} objectDefinition - The data object to check for.
   * @param {Number} [onExist] - Amount of instructions lines to jump on success.
   * @param {Number} [onNotExist] - Amount of instructions lines to jump on failure. Fails if not defined.
   * @example
   * have 'foo' 3 2                         // jumps 3 instructions if variable foo exists, two otherwise
   * have 'foo'                            // jumps 1 instruction if variable foo exists, fails otherwise
   * have '.foo' 1 2                        // input: {foo:"bar"} : jumps 1 instruction
   * have '.foo.bar[2]' 1 2                 // input: {foo:{bar:[0,1,5]}} : jumps 1 instruction
   * have '.foo.bar[2]' 1 2                 // input: {apple:"pie"} : jumps 2 instructions
   */
exports.have = data => function (p, property, onExist, onNotExist) {
  if (typeof onExist === 'undefined') onExist = 1;
  if (typeof onNotExist === 'undefined') onNotExist = 1;

  if ((typeof property === 'string' && !property.startsWith('[') && !property.startsWith('.')) || typeof property === 'number') {
    const baseVariableName = String(property).replace(/\[/g, '.').split('.')[0];
    const result = p.peek(baseVariableName);
    if (result.e > 0) {
      if (typeof onNotExist === 'undefined') return p.fail(data);
      return p.jump(onNotExist, data);
    } else { // variable exists, now see if the subvariable path exists
      const subProperty = property.substr(baseVariableName.length);
      return subProperty === ''
        ? p.jump(onExist, data) // no subProperty, so it exists
        : doTran(p, subProperty, result.v, data, onExist, onNotExist);
    }
  } else return doTran(p, property, data, data, onExist, onNotExist);
};

exports.tests = {
  have1: [
    'data {foo:bar}',
    'have .foo 1 2',
    'done $OK',
    'fail'
  ],
  have2: [
    'data {apple:pie}',
    'have .foo 1 2',
    'fail',
    'done $OK'
  ],
  have3: [
    'data 1',
    'poke myVar',
    'have myVar 1 2',
    'done $OK',
    'fail'
  ],
  have4: [
    'have nonExistingVariable 1 2',
    'fail',
    'done $OK'
  ]
};
