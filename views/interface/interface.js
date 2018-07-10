var Valuations = valuations;
var Balance = balance;

var dollarPriceStream = rxjs
  .interval(60000)
  .pipe(
    rxjs.operators.startWith(0)
  );

var retrieveBalanceStream = rxjs
  .interval(60000)
  .pipe(
    rxjs.operators.startWith(0)
  );

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
