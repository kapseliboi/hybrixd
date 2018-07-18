var Balance = balance;
var UserFeedback = userFeedback;
var Valuations = valuations;

var logOutBtnStream = rxjs.fromEvent(document.querySelector('.logOutBtn'), 'click')
  .pipe(
    rxjs.operators.filter(R.propEq('type', 'click')),
    rxjs.operators.map(R.curry(UserFeedback.setLocalUserLogOutStatus)(true)),
    rxjs.operators.tap(removeUserSessionData),
    rxjs.operators.tap(function () { fetchview('login', {}); })
  );

var logOutStream = rxjs
  .concat(
    rxjs.fromEvent(document.querySelector('#topmenu-logout'), 'click'),
    logOutBtnStream
  );

var dollarPriceStream = rxjs
  .interval(60000)
  .pipe(
    rxjs.operators.startWith(0),
    rxjs.operators.takeUntil(logOutStream)
  );

var retrieveBalanceStream = rxjs
  .interval(60000)
  .pipe(
    rxjs.operators.startWith(0),
    rxjs.operators.takeUntil(logOutStream)
  );

function main () {
  document.querySelector('#topmenu-assets').onclick = fetchAssetsViews(pass_args); // MAKE INTO STREAM
  document.querySelector('#topmenu-assets').classList.add('active');
  logOutBtnStream.subscribe();
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

function removeUserSessionData (_) {
  $(document).off('click.bs.modal.data-api', '[data-toggle="modal"]');
  cached = {};
  window.onbeforeunload = null;
}

function fetchAssetsViews (args) { return function () { fetchview('interface.assets', args); }; }

main();

modules.exports = interfaceStreams = {
  logOutStream
};
