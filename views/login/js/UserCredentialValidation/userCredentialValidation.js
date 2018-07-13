var S = loginInputStreams;
var U = utils;
var V = validations;
var UserFeedback = userFeedback;

var keyDownOnPasswordStream = S.mkInputStream('#inputPasscode');

var loginBtnStream = rxjs.fromEvent(document.querySelector('#loginbutton'), 'click')
  .pipe(
    rxjs.operators.filter(U.btnIsNotDisabled)
  );

var userSubmitStream = rxjs
  .merge(
    loginBtnStream,
    keyDownOnPasswordStream
  )
  .pipe(
    rxjs.operators.tap(UserFeedback.maybeDisableLogOutMessage),
    rxjs.operators.tap(function (_) { UserFeedback.setCSSTorenderButtonsToDisabled(); })
  );

var credentialsStream = S.credentialsStream
  .pipe(
    rxjs.operators.tap(UserFeedback.disableUserNotificationBox),
    // rxjs.operators.tap(UserFeedback.maybeDisableLogOutMessage),
    rxjs.operators.tap(UserFeedback.setCSSTorenderButtonsToEnabled)
  );

var validatedUserCredentialsStream = userSubmitStream
  .pipe(
    rxjs.operators.withLatestFrom(credentialsStream)
  );

var credentialsOrErrorStream = validatedUserCredentialsStream
  .pipe(
    rxjs.operators.map(mkCredentialsObj),
    rxjs.operators.map(R.map(U.normalizeUserInput)),
    rxjs.operators.switchMap(validCredentialsOrHandleError),
    rxjs.operators.filter(R.compose(
      R.not,
      R.has('error')
    ))
  );

function validCredentialsOrHandleError (credentials) {
  return rxjs.of(credentials)
    .pipe(
      rxjs.operators.map(credentialsOrThrowError),
      rxjs.operators.catchError(resetFormWithDisabledLoginBtn)
    );
}

function credentialsOrThrowError (c) {
  if (V.hasValidCredentials(c)) {
    return c;
  } else {
    throw { error: 1, msg: 'It seems the credentials you entered are incorrect. Please check your username and password and try again.' };
  }
}

function resetFormWithDisabledLoginBtn (e) {
  return rxjs.of(e)
    .pipe(
      rxjs.operators.tap(UserFeedback.notifyUserOfIncorrectCredentials),
      rxjs.operators.tap(function (_) { UserFeedback.toggleLoginSpinner('remove'); }),
      rxjs.operators.tap(function (_) { UserFeedback.setLoginButtonText('Sign in'); })
    );
}

function mkCredentialsObj (z) { return { userID: R.path(['1', '0'], z), password: R.path(['1', '1'], z) }; }

userCredentialsValidation = {
  credentialsOrErrorStream,
  userSubmitStream
};
