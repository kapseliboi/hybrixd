// - Get assetmodes and names
// - Get modehashes
// - Retrieve user's assets from storage
// - Initialize user assets

// NOPE \/\/\/ Render DOM independently!!!!
//   When ready:
// - Fetch view: dashboard

// - Async: Fetch valuations
// - Async: Initialize Proof of Work loop

var Valuations = valuations;
var path = 'api';

var dollarPriceStream = Rx.Observable
    .interval(30000)
    .startWith(0);

function main () {
  document.querySelector('#topmenu-assets').onclick = fetchAssetsViews(pass_args);
  document.querySelector('#topmenu-assets').classList.add('active');
  dollarPriceStream.subscribe(function (_) { Valuations.getDollarPrices(); });
  alertOnBeforeUnload();
}

function alertOnBeforeUnload () {
  function warning () {
    return 'Are you sure you want to leave?';
  }
  window.onbeforeunload = warning;
}

function fetchAssetsViews (args) { return function () { fetchview('interface.assets', args); }; }

main();
