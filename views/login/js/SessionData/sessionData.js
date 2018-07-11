var UserFeedback = userFeedback;
var UserCredentialsValidation = userCredentialsValidation;

function mkSessionDataStream (nacl, userCredentials) {
  var validatedUserCredentialsStream_ = rxjs.of(userCredentials);

  var generatedKeysStream =
      validatedUserCredentialsStream_
        .pipe(
          rxjs.operators.map(mkSessionKeys)
        );

  var sessionStepStream = rxjs.of(0); // Make incremental with every call
  var randomNonceStream = rxjs.of(nacl) // TODO
    .pipe(
      rxjs.operators.switchMap(randomNonceOrErrorHandlingStream),
      rxjs.operators.filter(R.compose(
        R.not,
        R.has('error')
      ))
    );

  var initialSessionDataStream = rxjs
    .combineLatest(
      randomNonceStream,
      sessionStepStream,
      generatedKeysStream
    )
    .pipe(
      rxjs.operators.map(createSessionStep0UrlAndData)
    );

  var postSessionStep0DataStream =
      initialSessionDataStream
        .pipe(
          rxjs.operators.switchMap(sessionStep0OrErrorHandlingStream),
          rxjs.operators.filter(_ => { return R.propEq('error', 0, _); })
        );

  var processSessionStep0ReplyStream = rxjs
    .zip(
      postSessionStep0DataStream,
      sessionStepStream // SESSIONSTEP NEEDS TO BE INCREMENTED HERE. Now gets incremented in mkPostSessionStep1Url
    )
    .pipe(
      rxjs.operators.filter(R.compose(
        V.nonceHasCorrectLength,
        R.prop('nonce1'),
        R.nth(0)
      )),
      rxjs.operators.map(mkPostSessionStep1Url)
    );

  var postSessionStep1DataStream =
      processSessionStep0ReplyStream
        .pipe(
          rxjs.operators.switchMap(sessionStep1OrErrorHandlingStream),
          rxjs.operators.filter(R.compose(
            R.not,
            R.has('error')
          ))
        );

  var processSession1StepDataStream = rxjs
    .combineLatest(
      postSessionStep1DataStream,
      randomNonceStream,
      generatedKeysStream
    )
    .pipe(
      rxjs.operators.map(mkSessionHexAndNonce)
    );

  var sessionDataStreamReal = rxjs
    .combineLatest(
      generatedKeysStream,
      randomNonceStream,
      validatedUserCredentialsStream_,
      processSession1StepDataStream
    );

  return sessionDataStreamReal;
}

function createSessionStep0UrlAndData (z) {
  var nonce = R.nth(0, z);
  var sessionStep = R.nth(1, z);
  var initialSessionData = C.generateInitialSessionData(nonce);
  return {
    url: path + 'x/' + R.prop('session_hexsign', initialSessionData) + '/' + sessionStep,
    initialSessionData
  };
}

function mkSessionHexAndNonce (z) {
  var sessionStep1Data = R.path(['0', 'sessionStep1'], z);
  var sessionData = R.mergeAll([
    R.path(['0', 'initialSessionData'], z),
    R.path(['0', 'secondarySessionData'], z),
    sessionStep1Data,
    { nonce: R.nth('1', z) },
    { userKeys: R.nth('2', z) }
  ]);

  return C.sessionStep1Reply(sessionStep1Data, sessionData, setSessionDataInElement);
}

function mkPostSessionStep1Url (z) {
  var nonce1 = R.path(['0', 'nonce1'], z);
  var sessionStep = z[1] + 1; // TODO: NOW SETTING SESSION STEP MANUALLY.....
  var initialSessionData = R.path(['0', 'initialSessionData'], z);
  var sessionStep1Data = C.generateSecondarySessionData(nonce1, R.prop('session_hexkey', initialSessionData), R.path(['session_signpair', 'signSk'], initialSessionData));

  return {
    url: path + 'x/' + R.prop('session_hexsign', initialSessionData) + '/' + sessionStep + '/' + R.prop('crypt_hex', sessionStep1Data),
    initialSessionData,
    secondarySessionData: sessionStep1Data
  };
}

function sessionStep1OrErrorHandlingStream (sessionStep1Data) {
  return rxjs.of(sessionStep1Data)
    .pipe(
      rxjs.operators.flatMap(function (initialSessionData) {
        return rxjs.from(
          S.mkSessionStepFetchPromise(initialSessionData, 'postSessionStep1Data')
        );
      }),
      rxjs.operators.map(function (sessionStep1Response) {
        var responseHasErrors = R.compose(
          R.not,
          R.pathEq(['sessionStep1', 'error'], 0)
        )(sessionStep1Response);

        if (responseHasErrors) {
          throw { error: 1, msg: 'Error posting session step 1.'};
        } else {
          return sessionStep1Response;
        }
      }),
      rxjs.operators.catchError(function (e) {
        return rxjs.of(e)
          .pipe(
            rxjs.operators.tap(UserFeedback.resetFlipOverAnimation),
            rxjs.operators.tap(function (_) { UserFeedback.setCSSTorenderButtonsToEnabled(); })
          );
      })
    );
}

// TODO Refactor with sessionStep1OrErrorHandlingStream
function sessionStep0OrErrorHandlingStream (sessionStep0Data) {
  return rxjs.of(sessionStep0Data)
    .pipe(
      rxjs.operators.flatMap(function (initialSessionData) {
        return rxjs.from(
          S.mkSessionStepFetchPromise(initialSessionData, 'postSessionStep0Data')
        );
      }),
      rxjs.operators.map(function (deterministicHashesProcessResponse) {
        if (R.not(R.propEq('error', 0, deterministicHashesProcessResponse))) {
          throw { error: 1, msg: 'Error posting session step 0.'};
        } else {
          return deterministicHashesProcessResponse;
        }
      }),
      rxjs.operators.catchError(function (e) {
        return rxjs.of(e)
          .pipe(
            rxjs.operators.tap(UserFeedback.resetFlipOverAnimation),
            rxjs.operators.tap(function (_) { UserCredentialsValidation.setCSSTorenderButtonsToEnabled(); })
          );
      })
    );
}

function randomNonceOrErrorHandlingStream (naclInstance) {
  return rxjs.of(naclInstance)
    .pipe(
      rxjs.operators.map(function (nacl_) { return nacl_.crypto_box_random_nonce(); }),
      rxjs.operators.catchError(function (e) {
        return rxjs.of({ error: 1, msg: 'Something unexpected happened. Please try again.' + e })
          .pipe(
            rxjs.operators.tap(UserFeedback.notifyUserOfIncorrectCredentials),
            rxjs.operators.tap(function (_) { UserFeedback.toggleLoginSpinner('remove'); }),
            rxjs.operators.tap(function (_) { UserFeedback.setLoginButtonText('Sign in'); }),
            rxjs.operators.tap(function (_) { UserFeedback.setCSSTorenderButtonsToEnabled(); }),
            rxjs.operators.tap(function (_) { console.log('Nacl threw an error:', e); })
          );
      })
    );
}

function mkSessionKeys (credentials) { return C.generateKeys(R.prop('password', credentials), R.prop('userID', credentials), 0); }
function setSessionDataInElement (sessionHex) { document.querySelector('#session_data').textContent = sessionHex; }

sessionData = {
  mkSessionDataStream
};
