var Valuations = valuations;
var Balance = balance;

var dollarPriceStream = Rx.Observable
  .interval(60000)
  .startWith(0);

var retrieveBalanceStream = Rx.Observable
  .interval(60000)
  .startWith(0);

function main () {
  document.querySelector('#topmenu-assets').onclick = fetchAssetsViews(pass_args); // MAKE INTO STREAM
  document.querySelector('#topmenu-assets').classList.add('active');
  dollarPriceStream.subscribe(function (_) { Valuations.getDollarPrices(); });
  retrieveBalanceStream.subscribe(function (_) { Balance.updateAssetsBalances(GL.assets); });
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
