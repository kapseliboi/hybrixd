// (C) 2019 Internet of Coins / Joachim de Koning
// hybrixd module - evm-interpreter/module.js
// Module containing an Ethereum Virtual Machine (EVM) interpreter and decompiler,
// along with several other utils for programmatically extracting information from bytecode.

// required libraries
const { EVM } = require("evm");
const id = 'evm-interpreter';

// exports
exports.get = get;
exports.parse = parse;
exports.decompile = decompile;

// get functions
function get(proc,data) {
  const evm = new EVM(data.bytecode);
  let output = null;
  switch(data.func) {
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
      let array = evm.getOpcodes();
      output = 0;
      for (let i=0; i<array.length; i++) {
        if(array[i].fee) {
          output = output + array[i].fee;
        }
      }
    break;
    case 'gastable':
      let fs = require('fs');
      let filePath = 'modules/' + id + '/gastable.json';
      if (fs.existsSync('../' + filePath)) {
        try {
          output = JSON.parse(fs.readFileSync('../' + filePath))
        } catch(e) { output = null; }
      }
    break;
  }
  if(typeof output!=='undefined' || !isNaN(output)) {
    proc.done(output);
  } else {
    proc.fail(output);
  }
}

// other functions
function parse(proc,data) {
  const evm = new EVM(data);
  try {
    proc.done(evm.parse());
  } catch(e) {
    proc.fail(e);
  }
}

function decompile(proc,data) {
  const evm = new EVM(data);
  try {
    proc.done(evm.decompile());
  } catch(e) {
    proc.fail(e);
  }
}
