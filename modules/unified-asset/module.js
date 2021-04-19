// (C) 2020 hybrix / Rouke Pouw / Joachim de Koning
// hybrixd module - unified asset
// Module to unify assets

// required libraries in this context
const compressUnifiedAddress = require('../../common/compress-unified-address');

// functions
function compress (proc, address) {
  const symbol = proc.command[1];
  proc.done(symbol + ':' + compressUnifiedAddress.encode(address));
}

function decompress (proc, address) {
  const symbol = proc.command[1];
  if(!symbol || symbol === 'undefined') return proc.done(tryDecompress(address));
  else if (address.startsWith(symbol + ':')) { // `${symbol}:${encoded}`
    const encoded = address.split(':')[1]; // `${symbol}:${encoded}` -> encoded
    const decoded = compressUnifiedAddress.decode(encoded);
    if (decoded === null) return proc.fail('Could not parse unified asset address!');
    else return proc.done(decoded);
  } else return proc.done(address); // `${subSymbol}:${subAddress},...`
}

function tryDecompress(address){
  if(!address.includes(':')) return address;
  const encoded = address.split(':')[1]; // `${symbol}:${encoded}` -> encoded
  const decoded = compressUnifiedAddress.decode(encoded);
  return decoded === null ? address : decoded; // fallback to undecompressable address
}

// exports
exports.compressUnifiedAddress = compress;
exports.decompressUnifiedAddress = decompress;
