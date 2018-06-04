var Valuations = valuations;

var dollarPriceStream = Rx.Observable
    .interval(30000)
    .startWith(0);

function main () {
  document.querySelector('#topmenu-assets').onclick = fetchAssetsViews(pass_args);
  document.querySelector('#topmenu-assets').classList.add('active');
  dollarPriceStream.subscribe(function (_) { Valuations.getDollarPrices(); });
  alertOnBeforeUnload();
  fetchview('interface.dashboard', args); // UNTIL VIEW IS RENDERED SEPARATELY:
}

function alertOnBeforeUnload () {
  function warning () {
    return 'Are you sure you want to leave?';
  }
  window.onbeforeunload = warning;
}

function fetchAssetsViews (args) { return function () { fetchview('interface.assets', args); }; }

main();
