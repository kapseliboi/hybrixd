// (C) 2020 hybrix / Rouke Pouw / Joachim de Koning

const DEFAULT_RATE = '3.1546';
const DEFAULT_VOLUME = '15635.3';
const DEFAULT_SUPPLY = '7000000';
const DEFAULT_SUPPLYATOM = '7000000000000000000000000';

function hystat (proc) {
  const command = proc.command;
  const endpoint = command[1];
  proc.mime('text/plain');
  switch (endpoint) {
    case 'maximumSupply': proc.done('21000000'); return;
    case 'reservedSupply': proc.done(proc.peek('local::reservedSupply', DEFAULT_SUPPLY)); return;
    case 'circulatingSupply': proc.done(proc.peek('local::circulatingSupply', DEFAULT_SUPPLY)); return;
    case 'circulatingSupplyAtom': proc.done(proc.peek('local::circulatingSupplyAtom', DEFAULT_SUPPLYATOM)); return;
    case 'circulatingSupplyWithoutReserve': proc.done(proc.peek('local::circulatingSupplyWithoutReserve', DEFAULT_SUPPLY)); return;
    case 'supplyFactor': proc.done('18'); return;
    case 'currentPrice': proc.done(proc.peek('local::rate', DEFAULT_RATE)); return;
    case 'currentVolume': proc.done(proc.peek('local::volume', DEFAULT_VOLUME)); return;
  }
  proc.fail('Unknown command');
}

// exports
exports.hystat = hystat;
