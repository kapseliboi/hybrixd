// (C) 2019 Internet of Coins / Joachim de Koning
// hybrixd module - evm-interpreter/module.js
// Module containing an Ethereum Virtual Machine (EVM) interpreter and decompiler,
// along with several other utils for programmatically extracting information from bytecode.

// required libraries
const { EVM } = require('evm');
const EthereumTx = require('ethereumjs-tx').Transaction;

const fs = require('fs');

const id = 'evm-interpreter';

// exports
exports.get = get;
exports.parse = parse;
exports.decompile = decompile;
exports.decode = decode;

// get functions
function get (proc) {
  let output;
  try {
    const func = proc.command[1];
    const bytecode = proc.command[2];
    const evm = typeof bytecode !== 'string' ? null : new EVM(bytecode);
    switch (func) {
      case 'opcodes':
        output = evm.getOpcodes();
        break;
      case 'functions':
        output = evm.getFunctions();
        break;
      case 'events':
        output = evm.getEvents();
        break;
      case 'destinations':
        output = evm.getJumpDestinations();
        break;
      case 'swarmhash':
        output = evm.getSwarmHash();
        break;
      case 'gas':
        const opCodes = evm.getOpcodes();
        output = 0;
        for (let opCode of opCodes) {
          if (opCode.fee) output = output + opCode.fee;
        }
        break;
      case 'gastable':
        const filePath = 'modules/' + id + '/gastable.json';
        if (fs.existsSync('../' + filePath)) output = JSON.parse(fs.readFileSync('../' + filePath));
        break;
      default:
        return proc.fail('Unknown method' + func);
    }
  } catch (e) {
    return proc.fail(e);
  }

  return typeof output !== 'undefined' && output !== null
    ? proc.done(output)
    : proc.fail(output);
}
// other functions
function parse (proc) {
  const bytecode = proc.command[1];
  let result;
  try {
    const evm = typeof bytecode !== 'string' ? null : new EVM(bytecode);
    result = evm.parse();
  } catch (e) {
    return proc.fail(e);
  }
  return proc.done(result);
}

function decompile (proc) {
  const bytecode = proc.command[1];
  let result;
  try {
    const evm = typeof bytecode !== 'string' ? null : new EVM(bytecode);
    result = evm.decompile();
  } catch (e) {
    return proc.fail(e);
  }
  return proc.done(result);
}

function decode (proc) {
  const serializedTransaction = proc.command[1];
  let result;
  try {
    const tx = new EthereumTx(serializedTransaction);
    result = {
      nonce: parseInt(tx.nonce.toString('hex'), 16) || 0,
      gasPrice: parseInt(tx.gasPrice.toString('hex'), 16),
      gasLimit: parseInt(tx.gasLimit.toString('hex'), 16),
      source: '0x' + tx.from.toString('hex'),
      target: '0x' + tx.to.toString('hex'),
      amount: parseInt(tx.value.toString('hex'), 16) || 0,
      data: tx.data.toString('hex')
    };
  } catch (e) {
    return proc.fail(e);
  }
  return proc.done(result);
}
