// (C) 2015 Internet of Coins / Joachim de Koning / Rouke Pouw
// required libraries in this context

// load validators
// https://github.com/ognus/wallet-address-validator
const WAValidator = require('wallet-address-validator');
const stellarValidator = require('./validators/validator.xlm.js');

// exports
exports.validate = validate;

function validate (proc, data) {
  const command = proc.command;

  let symbol = command[1].toUpperCase().split('.')[0];
  const address = command[2];
  if (symbol === 'ETC' || symbol === 'UBQ' || symbol === 'EXP' || symbol === 'TOMO') { symbol = 'ETH'; }
  if (symbol === 'XCP' || symbol === 'OMNI') { symbol = 'BTC'; }

  if (symbol.substr(0,5) === 'TEST_') {
      proc.done('valid');
  } else if (symbol === 'XLM') {
    if (stellarValidator.isValidPublicKey(address)) {
      proc.done('valid');
    } else {
      proc.done('invalid');
    }
  } else {
    try {
      if (WAValidator.validate(address, symbol)) {
        proc.done('valid');
      } else {
        proc.done('invalid');
      }
    } catch (e) {
      proc.fail('Symbol "' + symbol + '" is not supported by wallet-address-validator');
    }
  }
}
