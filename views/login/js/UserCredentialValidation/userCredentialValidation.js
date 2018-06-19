var S = loginInputStreams;

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
    rxjs.operators.tap(function (_) { setCSSTorenderButtonsToDisabled(); })
  );

var credentialsStream = S.credentialsStream
  .pipe(
    rxjs.operators.tap(disableUserNotificationBox),
    rxjs.operators.tap(setCSSTorenderButtonsToEnabled)
  );

var validatedUserCredentialsStream = userSubmitStream
  .pipe(
    rxjs.operators.withLatestFrom(credentialsStream)
  );

var credentialsOrErrorStream = validatedUserCredentialsStream
  .pipe(
    rxjs.operators.map(mkCredentialsObj),
    rxjs.operators.map(R.map(U.normalizeUserInput)),
    rxjs.operators.switchMap(function (value) {
      return rxjs.of(value)
        .pipe(
          rxjs.operators.map(c => {
            if (V.hasValidCredentials(c)) {
              return c;
            } else {
              throw { error: 1, msg: 'It seems the credentials you entered are incorrect. Please check your username and password and try again.' };
            }
          }),
          rxjs.operators.catchError(e => rxjs.of(e)
            .pipe(
              rxjs.operators.tap(notifyUserOfIncorrectCredentials),
              rxjs.operators.tap(function (_) { toggleLoginSpinner('remove'); }),
              rxjs.operators.tap(function (_) { setLoginButtonText('Sign in'); })
            ))
        );
    }),
    rxjs.operators.filter(R.compose(
      R.not,
      R.has('error')
    ))
  );

// Eff (dom :: DOM) Error
function notifyUserOfIncorrectCredentials (err) {
  document.querySelector('.user-login-notification').classList.add('active');
  document.querySelector('.user-login-notification').innerHTML = R.prop('msg', err);
}

// TODO: Should move to subscribe?
// Eff (dom :: DOM) Credentials
function disableUserNotificationBox (c) {
  var notificationElement = document.querySelector('.user-login-notification');
  if (notificationElement.classList.contains('active')) {
    notificationElement.classList.remove('active');
    notificationElement.innerHTML = '';
  }
  return c;
}

function toggleLoginSpinner (addOrRemove) {
  document.querySelector('#loginbutton .spinner-loader').classList[addOrRemove]('active');
}

function setCSSTorenderButtonsToEnabled () {
  document.querySelector('#loginbutton').classList.remove('disabled');
  document.querySelector('#generatebutton').removeAttribute('disabled');
  document.querySelector('#helpbutton').removeAttribute('disabled');
}

function setLoginButtonText (str) {
  document.querySelector('#loginwrap').innerHTML = str;
}

function setCSSTorenderButtonsToDisabled () {
  document.querySelector('#loginbutton .spinner-loader').classList.add('active');
  document.querySelector('#loginbutton').classList.add('disabled');
  document.querySelector('#loginwrap').innerHTML = '';
  document.querySelector('#generatebutton').setAttribute('disabled', 'disabled');
  document.querySelector('#helpbutton').setAttribute('disabled', 'disabled');
}

function mkCredentialsObj (z) { return { userID: R.path(['1', '0'], z), password: R.path(['1', '1'], z) }; }

userCredentialsValidation = {
  credentialsOrErrorStream,
  setCSSTorenderButtonsToEnabled
};
