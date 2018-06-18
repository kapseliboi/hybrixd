var S = loginInputStreams;

var keyDownOnPasswordStream = S.mkInputStream('#inputPasscode');

var loginBtnStream = rxjs.fromEvent(document.querySelector('#loginbutton'), 'click')
  .pipe(
    rxjs.operators.filter(U.btnIsNotDisabled)
  );

var userSubmitStream = rxjs.merge(
  loginBtnStream,
  keyDownOnPasswordStream
);

var credentialsStream = S.credentialsStream
  .pipe(
    rxjs.operators.map(disableUserNotificationBox)
  );

var validatedUserCredentialsStream = userSubmitStream
  .pipe(
    rxjs.operators.withLatestFrom(credentialsStream)
  );

var credentialsOrErrorStream = validatedUserCredentialsStream
  .pipe(
    rxjs.operators.map(mkCredentialsObj),
    rxjs.operators.map(R.map(U.normalizeUserInput)),
    rxjs.operators.switchMap(value => {
      return rxjs.of(value)
        .pipe(
          rxjs.operators.map(c => {
            if (V.hasValidCredentials(c)) {
              return c;
            } else {
              throw { error: 1, msg: 'It seems the credentials you entered are incorrect. Please check your username and password and try again.' };
            }
          }),
          rxjs.operators.catchError(e => rxjs.of(e))
        );
    })
  );

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

function mkCredentialsObj (z) { return { userID: R.path(['1', '0'], z), password: R.path(['1', '1'], z) }; }

userCredentialsValidation = {
  credentialsOrErrorStream
};
