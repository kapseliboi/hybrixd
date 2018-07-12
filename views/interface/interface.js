var Valuations = valuations;
var Balance = balance;

var logoutStream = rxjs.fromEvent(document.querySelector('#topmenu-logout'), 'click')
  .pipe(
    rxjs.operators.tap(_ => localforage.setItem('userHasLoggedOut', { userConfig: {
      userHasLoggedOut: true
    } }, function (_) {})),
    rxjs.operators.tap(_ => fetchview('login', {})),
    rxjs.operators.tap(_ => {
      delete window.sendAssetButtonStream;
      delete window.generateAddressButtonStream;
      delete window.receiveAssetButtonStream;
      $(document).off('click.bs.modal.data-api', '[data-toggle="modal"]');
      cached = {};
    })
  );

var dollarPriceStream = rxjs
  .interval(60000)
  .pipe(
    rxjs.operators.startWith(0),
    rxjs.operators.takeUntil(logoutStream)
  );

var retrieveBalanceStream = rxjs
  .interval(60000)
  .pipe(
    rxjs.operators.startWith(0),
    rxjs.operators.takeUntil(logoutStream)
  );

function main () {
  document.querySelector('#topmenu-assets').onclick = fetchAssetsViews(pass_args); // MAKE INTO STREAM
  document.querySelector('#topmenu-assets').classList.add('active');
  logoutStream.subscribe();
  dollarPriceStream.subscribe(function (_) { Valuations.getDollarPrices(); });
  retrieveBalanceStream.subscribe(function (_) { Balance.updateAssetsBalances(GL.assets); });
  alertOnBeforeUnload();
  fetchview('interface.dashboard', {});
}

function alertOnBeforeUnload () {
  function warning () {
    return 'Are you sure you want to leave?';
  }
  window.onbeforeunload = warning;
}

function fetchAssetsViews (args) { return function () { fetchview('interface.assets', args); }; }

main();

interfaceStreams = {
  logoutStream
};
