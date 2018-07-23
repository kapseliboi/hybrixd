import { balance } from './js/Balance/balance.js';
import { userFeedback } from './../login/js/UserFeedback/userFeedback.js';
import { valuations } from './js//valuations.js';

import * as R from 'ramda';

import { concat } from 'rxjs/observable/concat';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { interval } from 'rxjs/observable/interval';
import { map, filter, startWith, takeUntil, tap } from 'rxjs/operators';

var logOutBtnStream = fromEvent(document.querySelector('.logOutBtn'), 'click')
  .pipe(
    filter(R.propEq('type', 'click')),
    map(R.curry(userFeedback.setLocalUserLogOutStatus)(true)),
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
    startWith(0),
    takeUntil(logOutStream)
  );

function main () {
  document.querySelector('#topmenu-assets').onclick = fetchAssetsViews(pass_args); // MAKE INTO STREAM
  document.querySelector('#topmenu-assets').classList.add('active');
  logOutBtnStream.subscribe();
  dollarPriceStream.subscribe(function (_) { valuations.getDollarPrices(); });
  retrieveBalanceStream.subscribe(function (_) { balance.updateAssetsBalances(GL.assets); });
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
