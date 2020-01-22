const vars = require('../vars.js');
const Decimal = require('../../../common/crypto/decimal-light.js');
const baseCode = require('../../../common/basecode.js');
const encoder = require('../../../common/byte/encoder.js');
const decoder = require('../../../common/byte/decoder.js');

function encode (p, data, variable, method, parameter, code) {
  if (typeof data !== 'string') {
    this.fail(p, `Expected type of data to be string, got ${typeof data}.`);
    return;
  }

  const result = vars.peek(p, variable);
  if (result.e > 0) {
    this.fail(p, result.v);
    return;
  }

  let input = result.v;
  if (typeof input === 'string') {
    if (typeof code === 'undefined') { code = 'ascii'; }
  } else if (typeof input === 'number') { // TODO check if integer
    input = input.toString();
    if (typeof code === 'undefined') { code = 'dec'; }
  } else if (input instanceof Decimal) { // TODO check if integer
    input = input.toString();
    if (typeof code === 'undefined') { code = 'dec'; }
  } else {
    this.fail(p, `Expected type of ${variable} to be number or string, got ${typeof input}.`);
    return;
  }

  let output = baseCode.recode(code, 'bin', input);
  let error;
  switch (method) {
    case 'fixed' :
      [error, input, output] = encoder.encodeFixed(output, input, parameter, code);
      break;
    case 'indexed' :
      [error, input, output] = encoder.encodeIndexed(output, input, parameter, code);
      break;
    case 'delimited' :
      [error, input, output] = encoder.encodeDelimited(output, input, parameter, code);
      break;
    case 'enum':
      [error, input, output] = encoder.encodeEnum(output, input, parameter, code);
      break;
    default:
      this.fail(p, `Unknown method "${method}".`);
      return;
  }
  if (error) { this.fail(p, error); return; }
  data += output;
  this.next(p, 0, data);
}

function decode (p, input, variable, method, parameter, code) {
  if (typeof input !== 'string') {
    this.fail(p, `Expected type of data to be string, got ${typeof input}.`);
    return;
  }

  let output;
  let error;
  switch (method) {
    case 'fixed' :
      [error, input, output] = decoder.decodeFixed(input, parameter, code);
      break;
    case 'indexed' :
      [error, input, output] = decoder.decodeIndexed(input, parameter, code);
      break;
    case 'delimited' :
      [error, input, output] = decoder.decodeDelimited(input, parameter, code);
      break;
    case 'enum':
      [error, input, output] = decoder.decodeEnum(input, parameter, code);
      break;
    default:
      this.fail(p, `Unknown method ${method}`);
      return;
  }

  if (error) { this.fail(p, error); return; }

  const result = vars.poke(p, variable, output);
  if (result.e > 0) {
    this.fail(p, result.v);
    return;
  }

  this.next(p, 0, input);
}
/**
   * Encoding and decoding data from/to a bitstream.
   * @category TODO
   * @param {String} direction - 'encode' or 'decode'
   * @param {String} variable - the variable to read or write to when encoding or decoding respectively
   * @param {String} method - The method used. 'fixed' for fixed data of size parameter. 'indexed' for storing the data length in a parameter sized index followed by the data. 'delimited' for storing the data delimited by the parameter. 'enum' for storing the index of an enum array.
   * @param {Number|String|Array} parameter - paramer used for method
   * @param {String} [code] - the encoding of the data
   * @example
   * data x
   * poke var
   * data ''
   * byte encode var fixed 10
   */
exports.byte = data => function (p, direction, variable, method, parameter, code) {
  switch (direction) {
    case 'encode' :
      encode.bind(this)(p, data, variable, method, parameter, code);
      break;
    case 'decode':
      decode.bind(this)(p, data, variable, method, parameter, code);
      break;
    default:
      this.fail(p, `Expected encode or decode.`);
  }
};
