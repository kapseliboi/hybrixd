import balance as Balance from './js/Balance/balance.js'
import userFeedback as UserFeedback from './js/UserFeedback/userFeedback.js'
import valuations as Valuations from './js//valuations.js'

import R from 'ramda'

import { concat } from 'rxjs/observable/concat';
import { from } from 'rxjs/observable/from';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { of } from 'rxjs/observable/of';
import { interval } from 'rxjs/observable/interval';
import { zip } from 'rxjs/observable/zip';
import { combineLatest } from 'rxjs/observable/combineLatest';
import { delay, map, filter, switchMap, startWith, takeUntil, tap, flatMap, catchError } from 'rxjs/operators';

var logOutBtnStream = fromEvent(document.querySelector('.logOutBtn'), 'click')
  .pipe(
    filter(R.propEq('type', 'click')),
    map(R.curry(UserFeedback.setLocalUserLogOutStatus)(true)),
    tap(removeUserSessionData),
    tap(function () { fetchview('login', {}); })
  );

var logOutStream = concat(
    fromEvent(document.querySelector('#topmenu-logout'), 'click'),
    logOutBtnStream
  );

var dollarPriceStream = interval(60000)
  .pipe(
    startWith(0),
    takeUntil(logOutStream)
  );

var retrieveBalanceStream = interval(60000)
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

export var interfaceStreams = {
  logOutStream
};
