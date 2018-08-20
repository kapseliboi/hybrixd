import { userFeedback } from './../UserFeedback/userFeedback.js';
import { userCredentialsValidation } from './../UserCredentialValidation/userCredentialValidation.js';
import { commonUtils } from './../../../common/index.js';
import * as R from 'ramda';

import { validations } from './../Validations/validations.js';
import { loginInputStreams } from './../loginStreams.js';

import { from } from 'rxjs/observable/from';
import { of } from 'rxjs/observable/of';
import { zip } from 'rxjs/observable/zip';
import { combineLatest } from 'rxjs/observable/combineLatest';
import { map, filter, switchMap, tap, flatMap, catchError } from 'rxjs/operators';

function mkSessionDataStream (nacl, userCredentials) {
  var validatedUserCredentialsStream_ = of(userCredentials);

  var generatedKeysStream =
      validatedUserCredentialsStream_
        .pipe(
          map(mkSessionKeys)
        );

  var sessionStepStream = of(0); // Make incremental with every call
  var randomNonceStream = of(nacl) // TODO
    .pipe(
      switchMap(randomNonceOrErrorHandlingStream),
      filter(R.compose(
        R.not,
        R.has('error')
      ))
    );

  var initialSessionDataStream = combineLatest(
    randomNonceStream,
    sessionStepStream,
    generatedKeysStream
  )
    .pipe(
      map(createSessionStep0UrlAndData)
    );

  var postSessionStep0DataStream =
      initialSessionDataStream
        .pipe(
          switchMap(sessionStep0OrErrorHandlingStream),
          filter(_ => { return R.propEq('error', 0, _); })
        );

  var processSessionStep0ReplyStream = zip(
    postSessionStep0DataStream,
    sessionStepStream // SESSIONSTEP NEEDS TO BE INCREMENTED HERE. Now gets incremented in mkPostSessionStep1Url
  )
    .pipe(
      filter(R.compose(
        validations.nonceHasCorrectLength,
        R.prop('nonce1'),
        R.nth(0)
      )),
      map(mkPostSessionStep1Url)
    );

  var postSessionStep1DataStream =
      processSessionStep0ReplyStream
        .pipe(
          switchMap(sessionStep1OrErrorHandlingStream),
          filter(R.compose(
            R.not,
            R.has('error')
          ))
        );

  var processSession1StepDataStream = combineLatest(
    postSessionStep1DataStream,
    randomNonceStream,
    generatedKeysStream
  )
    .pipe(
      map(mkSessionHexAndNonce)
    );

  var sessionDataStreamReal = combineLatest(
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
  var initialSessionData = commonUtils.generateInitialSessionData(nonce);
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

  return commonUtils.sessionStep1Reply(sessionStep1Data, sessionData, setSessionDataInElement);
}

function mkPostSessionStep1Url (z) {
  var nonce1 = R.path(['0', 'nonce1'], z);
  var sessionStep = z[1] + 1; // TODO: NOW SETTING SESSION STEP MANUALLY.....
  var initialSessionData = R.path(['0', 'initialSessionData'], z);
  var sessionStep1Data = commonUtils.generateSecondarySessionData(nonce1, R.prop('session_hexkey', initialSessionData), R.path(['session_signpair', 'signSk'], initialSessionData));

  return {
    url: path + 'x/' + R.prop('session_hexsign', initialSessionData) + '/' + sessionStep + '/' + R.prop('crypt_hex', sessionStep1Data),
    initialSessionData,
    secondarySessionData: sessionStep1Data
  };
}

function sessionStep1OrErrorHandlingStream (sessionStep1Data) {
  return of(sessionStep1Data)
    .pipe(
      flatMap(function (initialSessionData) {
        return from(
          loginInputStreams.mkSessionStepFetchPromise(initialSessionData, 'postSessionStep1Data')
        );
      }),
      map(function (sessionStep1Response) {
        var responseHasErrors = R.compose(
          R.not,
          R.pathEq(['sessionStep1', 'error'], 0)
        )(sessionStep1Response);

        if (responseHasErrors) {
          throw { error: 1, msg: userFeedback.defaultErrorMsg}; // TODO: Plugin error logging here.
        } else {
          return sessionStep1Response;
        }
      }),
      catchError(function (e) {
        return of(e)
          .pipe(
            tap(userFeedback.resetFlipOverAnimation),
            tap(R.always(userFeedback.toggleLoginSpinner('remove'))),
            tap(R.always(userFeedback.setLoginButtonText('Sign in'))),
            tap(function (_) { userFeedback.setCSSTorenderButtonsToEnabled(); })
          );
      })
    );
}

// TODO Refactor with sessionStep1OrErrorHandlingStream
function sessionStep0OrErrorHandlingStream (sessionStep0Data) {
  return of(sessionStep0Data)
    .pipe(
      flatMap(function (initialSessionData) {
        return from(
          loginInputStreams.mkSessionStepFetchPromise(initialSessionData, 'postSessionStep0Data')
        );
      }),
      map(function (deterministicHashesProcessResponse) {
        if (R.not(R.propEq('error', 0, deterministicHashesProcessResponse))) {
          throw { error: 1, msg: userFeedback.defaultErrorMsg }; // TODO: Plugin error logging here.
        } else {
          return deterministicHashesProcessResponse;
        }
      }),
      catchError(function (e) {
        return of(e)
          .pipe(
            tap(userFeedback.resetFlipOverAnimation),
            tap(function (_) { userCredentialsValidation.setCSSTorenderButtonsToEnabled(); })
          );
      })
    );
}

function randomNonceOrErrorHandlingStream (naclInstance) {
  return of(naclInstance)
    .pipe(
      map(function (nacl_) { return nacl_.crypto_box_random_nonce(); }),
      catchError(function (e) {
        return of({ error: 1, msg: 'Something unexpected happened. Please try again.' }) // TODO: Plugin error logging here.
          .pipe(
            tap(userFeedback.notifyUserOfIncorrectCredentials),
            tap(userFeedback.resetFlipOverAnimation),
            tap(function (_) { userFeedback.toggleLoginSpinner('remove'); }),
            tap(function (_) { userFeedback.setLoginButtonText('Sign in'); }),
            tap(function (_) { userFeedback.setCSSTorenderButtonsToEnabled(); }),
            tap(function (_) { console.log('Nacl threw an error:', e); })
          );
      })
    );
}

function mkSessionKeys (credentials) { return commonUtils.generateKeys(R.prop('password', credentials), R.prop('userID', credentials), 0); }
function setSessionDataInElement (sessionHex) { document.querySelector('#session_data').textContent = sessionHex; }

export var sessionData = {
  mkSessionDataStream
};
