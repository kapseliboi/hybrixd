// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// required libraries in this context

// load validators
// https://github.com/ognus/wallet-address-validator
const WAValidator = require('wallet-address-validator');
const stellarValidator = require('./validators/validator.xlm.js');

// exports
exports.validate = validate;

function validate (proc, data) {
  let command = proc.command;

  let symbol = command[0].toUpperCase().split('.')[0];
  let address = command[1];
  if (symbol === 'UBQ' || symbol === 'EXP') { symbol = 'ETH'; }
  if (symbol === 'XCP' || symbol === 'OMNI') { symbol = 'BTC'; }

  if (symbol === 'XLM') {
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
