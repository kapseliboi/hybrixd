import { utils_ } from './../../index/utils.js';

import { combineLatest } from 'rxjs/observable/combineLatest';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { map, filter, startWith } from 'rxjs/operators';

import * as R from 'ramda';

var fetch_ = fetch;

var userIdInputStr = fromEvent(document.querySelector('#inputUserID'), 'input')
  .pipe(
    map(utils_.getTargetValue)
  );

const passwordInputStream = fromEvent(document.querySelector('#inputPasscode'), 'input')
  .pipe(
    map(utils_.getTargetValue)
  );

var credentialsStream = combineLatest(
  userIdInputStr,
  passwordInputStream
)
  .pipe(
    startWith(['', ''])
  );

function mkInputStream (query) {
  return fromEvent(document.querySelector(query), 'keydown')
    .pipe(
      filter(function (e) { return e.key === 'Enter'; })
    );
}

function mkSessionStepFetchPromise (sessionData, stepNameStr) {
  return fetch_(sessionData.url)
    .then(function (r) {
      return r.json()
        .then(function (stepData) {
          var defaultOrAssociatedStepData = stepNameStr === 'postSessionStep1Data'
            ? R.assoc('sessionStep1', stepData, {})
            : stepData;
          return R.merge(sessionData, defaultOrAssociatedStepData);
        })
        .catch(function (e) { throw e; });
    })
    .catch(function (e) { throw e; });
}

export var loginInputStreams = {
  credentialsStream,
  mkInputStream,
  mkSessionStepFetchPromise
};
