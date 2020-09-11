// (C) 2020 hybrix / Rouke Pouw / Joachim de Koning
// hybrixd module - unified asset
// Module to unify assets

// required libraries in this context
const compressUnifiedAddress = require('../../common/compress-unified-address');

// functions
function compress (proc, data) {
  proc.done(compressUnifiedAddress.encode(data));
}

function decompress (proc, address) {
  const symbol = proc.peek('symbol');
  if (address.startsWith(symbol + ':')) { // `${symbol}:${encoded}`
    const encoded = address.split(':')[1]; // `${symbol}:${encoded}` -> encoded
    const decoded = compressUnifiedAddress.decode(encoded);
    if (decoded === null) return proc.fail('Could not parse unified asset address!');
    else return proc.done(decoded);
  } else return proc.done(address); // `${subSymbol}:${subAddress},...`
}

// exports
exports.compressUnifiedAddress = compress;
exports.decompressUnifiedAddress = decompress;
