import { loginInputStreams } from './../loginStreams.js';
import { utils_ } from './../../../index/utils.js';
import { validations } from './../Validations/validations.js';
import { userFeedback } from './..//UserFeedback/userFeedback.js';

import * as R from 'ramda';

import { fromEvent } from 'rxjs/observable/fromEvent';
import { of } from 'rxjs/observable/of';
import { merge } from 'rxjs/observable/merge';
import { map, filter, switchMap, tap, catchError, withLatestFrom } from 'rxjs/operators';

var keyDownOnPasswordStream = loginInputStreams.mkInputStream('#inputPasscode');

var loginBtnStream = fromEvent(document.querySelector('#loginbutton'), 'click')
  .pipe(
    filter(utils_.btnIsNotDisabled)
  );

var userSubmitStream = merge(
  loginBtnStream,
  keyDownOnPasswordStream
)
  .pipe(
    tap(userFeedback.maybeDisableLogOutMessage),
    tap(function (_) { userFeedback.setCSSTorenderButtonsToDisabled(); })
  );

var credentialsStream = loginInputStreams.credentialsStream
  .pipe(
    tap(userFeedback.disableUserNotificationBox),
    // rxjs.operators.tap(userFeedback.maybeDisableLogOutMessage),
    tap(userFeedback.setCSSTorenderButtonsToEnabled)
  );

var validatedUserCredentialsStream = userSubmitStream
  .pipe(
    withLatestFrom(credentialsStream)
  );

var credentialsOrErrorStream = validatedUserCredentialsStream
  .pipe(
    map(mkCredentialsObj),
    map(R.map(utils_.normalizeUserInput)),
    switchMap(validCredentialsOrHandleError),
    filter(R.compose(
      R.not,
      R.has('error')
    ))
  );

function validCredentialsOrHandleError (credentials) {
  return of(credentials)
    .pipe(
      map(credentialsOrThrowError),
      catchError(resetFormWithDisabledLoginBtn)
    );
}

function credentialsOrThrowError (c) {
  if (validations.hasValidCredentials(c)) {
    return c;
  } else {
    throw { error: 1, msg: 'It seems the credentials you entered are incorrect. Please check your username and password and try again.' };
  }
}

function resetFormWithDisabledLoginBtn (e) {
  return of(e)
    .pipe(
      tap(userFeedback.notifyUserOfIncorrectCredentials),
      tap(function (_) { userFeedback.toggleLoginSpinner('remove'); }),
      tap(function (_) { userFeedback.setLoginButtonText('Sign in'); })
    );
}

function mkCredentialsObj (z) { return { userID: R.path(['1', '0'], z), password: R.path(['1', '1'], z) }; }

export var userCredentialsValidation = {
  credentialsOrErrorStream,
  userSubmitStream
};
