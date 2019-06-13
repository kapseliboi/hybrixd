// (C) 2019 Internet of Coins / Joachim de Koning
// hybrixd module - evm-interpreter/module.js
// Module containing an Ethereum Virtual Machine (EVM) interpreter and decompiler,
// along with several other utils for programmatically extracting information from bytecode.

// required libraries
const { EVM } = require('evm');
const fs = require('fs');

const id = 'evm-interpreter';

// exports
exports.get = get;
exports.parse = parse;
exports.decompile = decompile;

// get functions
function get (proc) {
  try {
    const func = proc.command[1];
    const bytecode = proc.command[2];
    const evm = typeof bytecode === 'undefined' ? null : new EVM(bytecode);
    let output;
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
        for (let i = 0; i < opCodes.length; i++) {
          if (opCodes[i].fee) {
            output = output + opCodes[i].fee;
          }
        }
        break;
      case 'gastable':
        const filePath = 'modules/' + id + '/gastable.json';
        if (fs.existsSync('../' + filePath)) {
          try {
            output = JSON.parse(fs.readFileSync('../' + filePath));
          } catch (e) { output = null; }
        }
        break;
    }
    if (typeof output !== 'undefined' && output !== null) {
      proc.done(output);
    } else {
      proc.fail(output);
    }
  } catch (e) {
    proc.fail(e);
  }
}
// other functions
function parse (proc) {
  const evm = new EVM(proc.command[1]);
  try {
    proc.done(evm.parse());
  } catch (e) {
    proc.fail(e);
  }
}

function decompile (proc) {
  const evm = new EVM(proc.command[1]);
  try {
    proc.done(evm.decompile());
  } catch (e) {
    proc.fail(e);
  }
}
