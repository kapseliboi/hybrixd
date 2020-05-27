// (C) 2020 hybrix / Rouke Pouw

const DEFAULT_RATE = '3.1546';
const DEFAULT_VOLUME = '15635.3';

function hystat (proc) {
  const command = proc.command;
  const endpoint = command[1];
  proc.mime('text/plain');
  switch (endpoint) {
    case 'maximumSupply': proc.done('21000000'); return;
    case 'circulatingSupply': proc.done('7000000.00'); return;
    case 'supplyFactor': proc.done('18'); return;
    case 'circulatingSupplyAtom': proc.done('21000000000000000000000000'); return;
    case 'circulatingSupplyWithoutReserve': proc.done('6000000.00'); return;
    case 'currentPrice': proc.done(proc.peek('local::rate', DEFAULT_RATE)); return;
    case 'currentVolume': proc.done(proc.peek('local::volume', DEFAULT_VOLUME)); return;
  }
  proc.fail('Unknown command');
}

// exports
exports.hystat = hystat;
