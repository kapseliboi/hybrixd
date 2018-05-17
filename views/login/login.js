// hy_login.js - contains javascript for login, encryption and session authentication
var C = commonUtils;
var A = animations;
var S = loginInputStreams;
var V = validations;
var U = utils;

var path = 'api';

////////////////////////////////
// GLOBAL STUFFZ ///////////////
////////////////////////////////

nacl_factory.instantiate(function (naclinstance) { nacl = naclinstance; });
session_step = 1; // Session step number at the end of login

// TODO:
// - Remove global session_step --> Make into incremental counter (save in state)
// - Remove Nacl as a global and save in some state
// - Put Ctrl-S event in Stream
// - Factor 'path' up
// - Fix HACK for priority queue

var keyDownOnUserIDStream = S.mkInputStream('#inputUserID');
var keyDownOnPasswordStream = S.mkInputStream('#inputPasscode');

var loginBtnStream = Rx.Observable
    .fromEvent(document.querySelector('#loginbutton'), 'click')
    .filter(btnIsNotDisabled);

var userSubmitStream = Rx.Observable
    .merge(
      loginBtnStream,
      keyDownOnPasswordStream
    );

var validatedUserCredentialsStream = userSubmitStream
    .withLatestFrom(S.credentialsStream)
    .map(mkCredentialsObj)
    .map(R.map(function (v) {
      return v.mapReplace({
        '0': 'O',
        '1': 'I',
        '8': 'B',
        '9': 'G'
      });
    }))
    .filter(hasValidCredentials);

function createSessionStep0UrlAndData (z) {
  var nonce = R.nth(0, z);
  var sessionStep = R.nth(1, z);
  var initialSessionData = C.generateInitialSessionData(nonce);
  return {
    // TODO: Factor 'path' up
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
  var sessionStep = z[1] + 1; // NOW SETTING SESSION STEP MANUALLY.....
  var initialSessionData = R.path(['0', 'initialSessionData'], z);
  var sessionStep1Data = C.generateSecondarySessionData(nonce1, R.prop('session_hexkey', initialSessionData), R.path(['session_signpair', 'signSk'], initialSessionData));

  return {
    url: path + 'x/' + R.prop('session_hexsign', initialSessionData) + '/' + sessionStep + '/' + R.prop('crypt_hex', sessionStep1Data),
    initialSessionData,
    secondarySessionData: sessionStep1Data
  };
}

// TODO: mk into Stream
function handleCtrlSKeyEvent (e) {
  var possible = [ e.key, e.keyIdentifier, e.keyCode, e.which ];

  while (key === undefined && possible.length > 0) {
    key = possible.pop();
  }

  if (key && (key === '115' || key === '83') && (e.ctrlKey || e.metaKey) && !(e.altKey)) {
    e.preventDefault();
    document.querySelector('#loginbutton').removeAttribute('disabled');
    return false;
  }
  return true;
}

function setCSSTorenderButtonsToDisabled () {
  var arcBackgroundColor = document.querySelector('#combinator').style.color;
  document.querySelector('#loginbutton').classList.add('disabled');
  document.querySelector('#arc0').style.backgroundColor = arcBackgroundColor;
  document.querySelector('#generatebutton').setAttribute('disabled', 'disabled');
  document.querySelector('#helpbutton').setAttribute('disabled', 'disabled');
  document.querySelector('#combinatorwrap').style.opacity = 1;
}

function maybeOpenNewWalletModal (location) {
  if (location.href.indexOf('#') !== -1) {
    var locationHref = location.href.substr(location.href.indexOf('#'));
    if (locationHref === '#new') {
      PRNG.seeder.restart(); // As found in: newaccount_b.js
      document.getElementById('newaccountmodal').style.display = 'block';
    }
  }
}

function nonceHasCorrectLength (nonce1) { return C.clean(nonce1).length === 48; }
function btnIsNotDisabled (e) { return !e.target.parentElement.classList.contains('disabled'); }
function mkSessionKeys (credentials) { return C.generateKeys(R.prop('password', credentials), R.prop('userID', credentials), 0); }
function setSessionDataInElement (sessionHex) { document.querySelector('#session_data').textContent = sessionHex; }
function hasValidCredentials (credentials) { return V.validateCredentials(R.prop('userID', credentials), R.prop('password', credentials)); }
function mkCredentialsObj (z) { return { userID: R.path(['1', '0'], z), password: R.path(['1', '1'], z) }; }

U.documentReady(function () {
  document.keydown = handleCtrlSKeyEvent; // for legacy wallets enable signin button on CTRL-S
  maybeOpenNewWalletModal(location);
  keyDownOnUserIDStream.subscribe(function (_) { document.querySelector('#inputPasscode').focus(); });
  validatedUserCredentialsStream.subscribe(function (userCredentials) {
    var validatedUserCredentialsStream_ = Rx.Observable.of(userCredentials);

    var generatedKeysStream =
        validatedUserCredentialsStream_
        .map(mkSessionKeys);

    var sessionStepStream = Rx.Observable.of(0); // Make incremental with every call
    var randomNonceStream = Rx.Observable.of(nacl.crypto_box_random_nonce());

    var initialSessionDataStream = Rx.Observable
        .combineLatest(
          randomNonceStream,
          sessionStepStream,
          generatedKeysStream
        )
        .map(createSessionStep0UrlAndData);

    var postSessionStep0DataStream =
        initialSessionDataStream
        .flatMap(function (initialSessionData) {
          return Rx.Observable.fromPromise(
            S.mkSessionStepFetchPromise(initialSessionData, 'postSessionStep0Data')
          );
        });

    var processSessionStep0ReplyStream = Rx.Observable
        .zip(
          postSessionStep0DataStream,
          sessionStepStream // SESSIONSTEP NEEDS TO BE INCREMENTED HERE. Now gets incremented in mkPostSessionStep1Url
        )
        .filter(R.compose(
          nonceHasCorrectLength,
          R.prop('nonce1'),
          R.nth(0)
        ))
        .map(mkPostSessionStep1Url);

    var postSessionStep1DataStream =
        processSessionStep0ReplyStream
        .flatMap(function (sessionData) {
          return Rx.Observable
            .fromPromise(
              S.mkSessionStepFetchPromise(sessionData, 'postSessionStep1Data'));
        });

    var processSession1StepDataStream = Rx.Observable
        .combineLatest(
          postSessionStep1DataStream,
          randomNonceStream,
          generatedKeysStream
        )
        .map(mkSessionHexAndNonce);

    var fetchViewStream = Rx.Observable
        .combineLatest(
          generatedKeysStream,
          randomNonceStream,
          validatedUserCredentialsStream_,
          processSession1StepDataStream
        )
        .map(function (z) {
          fetchview('interface', {
            user_keys: R.nth(0, z),
            nonce: R.path(['3', 'current_nonce'], z),
            userid: R.path(['2', 'userID'], z)
          });
        });

    A.startLoginAnimation();
    setCSSTorenderButtonsToDisabled();
    // HACK! :( So that CSS gets rendered immediately and user gets feedback right away.
    setTimeout(function () {
      fetchViewStream.subscribe();
    }, 500);
  });
});
