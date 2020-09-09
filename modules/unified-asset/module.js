// (C) 2020 hybrix / Rouke Pouw / Joachim de Koning
// hybrixd module - unified asset
// Module to unify assets

// required libraries in this context
const compressUnifiedAddress = require('../../common/compress-unified-address');

// functions
function compress (proc,data) {
  proc.done( compressUnifiedAddress.encode(data) );
}

function decompress (proc,data) {
  const targetArray = data.split(':'); // remove unified symbol prefix i.e. hy:... , and decompress ?
  if (targetArray.length < 3) {
    const decoded = compressUnifiedAddress.decode(targetArray.splice(targetArray.length - 1, targetArray.length)[0]);
    if(decoded === null) {
      proc.fail('Could not parse unified asset address!');
    } else {
      proc.done( decoded );
    }
  } else {
    proc.done( data ); // apparently not a proper or expanded unified address, return input
  }
}

// exports
exports.compressUnifiedAddress = compress;
exports.decompressUnifiedAddress = decompress;
