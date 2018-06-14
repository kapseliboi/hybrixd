// hy_login.js - contains javascript for login, encryption and session authentication
var C = commonUtils;
var S = loginInputStreams;
var V = validations;
var U = utils;

var AssetInitialisationStreams = assetInitialisationStreams;
var BrowserSupport = browserSupport;

var path = 'api'; // TODO: Factor up!
var args = {};

assets = {
  count: 0, // amount of assets
  init: [], // initialization status
  mode: {}, // mode of assets
  modehashes: {}, // mode hashes
  seed: {}, // cryptoseeds of assets
  keys: {}, // keys of assets
  addr: {}, // public addresses of assets
  cntr: {}, // stored contract pointer, location or address
  fact: {}, // factor of assets
  fees: {}, // fees of assets
  fsym: {}, // fees of assets
  base: {} // fees of assets
};

GL = {
  assets: [],
  assetnames: {},
  assetmodes: {},
  coinMarketCapTickers: [],
  powqueue: [],
  usercrypto: {},
  initCount: 0
};

// Don't move this yet, as the cur_step is needed by assetModesUrl. Synchronous coding!
nacl_factory.instantiate(function (naclinstance) { nacl = naclinstance; }); // TODO
session_step = 1; // Session step number at the end of login. TODO

/// /////////////////////////////
// GLOBAL STUFFZ ///////////////
/// /////////////////////////////

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
  .filter(U.btnIsNotDisabled);

var userSubmitStream = Rx.Observable
  .merge(
    loginBtnStream,
    keyDownOnPasswordStream
  );

var bar = S.credentialsStream
  .flatMap(c => Rx.Observable.of(c)
    .map(disableUserNotificationBox));

var validatedUserCredentialsStream = userSubmitStream
  .withLatestFrom(bar)
  .map(mkCredentialsObj)
  .map(R.map(U.normalizeUserInput));

var foo = validatedUserCredentialsStream
  .map(c => {
    var err = { error: 1, msg: 'It seems the credentials you entered are incorrect. Please check your username and password and try again.' };
    return V.hasValidCredentials(c)
      ? c
      : notifyUserOfIncorrectCredentials(err);
  })
  .filter(R.compose(
    R.not,
    R.has('error'))
  );

function main () {
  BrowserSupport.checkBrowserSupport(window.navigator.userAgent);
  document.keydown = handleCtrlSKeyEvent; // for legacy wallets enable signin button on CTRL-S
  maybeOpenNewWalletModal(location);

  // S.credentialsStream.subscribe(disableUserNotificationBox);
  keyDownOnUserIDStream.subscribe(function (_) { document.querySelector('#inputPasscode').focus(); });
  foo.subscribe(z => { console.log('correct, z'); });
  // .flatMap(continueLoginOrNotifyUser)
}

function processLoginDetails (userCredentials) {
  var validatedUserCredentialsStream_ = Rx.Observable.of(userCredentials);

  var generatedKeysStream =
      validatedUserCredentialsStream_
        .map(mkSessionKeys);

  var sessionStepStream = Rx.Observable.of(0); // Make incremental with every call
  var randomNonceStream = Rx.Observable.of(nacl.crypto_box_random_nonce()); // TODO

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
      V.nonceHasCorrectLength,
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
    .map(z => {
      setCSSTorenderButtonsToDisabled();
      doFlipOverAnimation();
      return initialiseAssets(z);
    });
    // .flatMap(AssetInitialisationStreams.doAssetInitialisation);
  // // HACK! :( So that CSS gets rendered immediately and user gets feedback right away.
  // setTimeout(function () {
  return fetchViewStream;
  // }, 500);
}

function initialiseAssets (userSessionData) {
  return;
  GL.usercrypto = {
    user_keys: R.nth(0, userSessionData),
    nonce: R.path(['3', 'current_nonce'], userSessionData),
    userid: R.path(['2', 'userID'], userSessionData)
  };
  AssetInitialisationStreams.doAssetInitialisation(userSessionData);
}

function doFlipOverAnimation () {
  document.querySelector('.flipper').classList.add('active'); // FLIP LOGIN FORM
  document.querySelector('#generateform').classList.add('inactive');
  document.querySelector('#alertbutton').classList.add('inactive');
  document.querySelector('#helpbutton').classList.add('inactive');
}

// Eff (dom :: DOM) Error
function notifyUserOfIncorrectCredentials (err) {
  document.querySelector('.user-login-notification').classList.add('active');
  document.querySelector('.user-login-notification').innerHTML = R.prop('msg', err);
  return err;
}

// Eff (dom :: DOM) Credentials
function disableUserNotificationBox (c) {
  var notificationElement = document.querySelector('.user-login-notification');
  if (notificationElement.classList.contains('active')) {
    notificationElement.classList.remove('active');
    notificationElement.innerHTML = '';
  }
  return c;
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

// TODO: mk into Stream
function handleCtrlSKeyEvent (e) {
  var possible = [ e.key, e.keyIdentifier, e.keyCode, e.which ];

  while (R.isNil(key) && possible.length > 0) {
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
  document.querySelector('#loginbutton .spinner-loader').classList.add('active');
  document.querySelector('#loginbutton').classList.add('disabled');
  document.querySelector('#loginwrap').innerHTML = '';
  document.querySelector('#generatebutton').setAttribute('disabled', 'disabled');
  document.querySelector('#helpbutton').setAttribute('disabled', 'disabled');
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

function mkSessionKeys (credentials) { return C.generateKeys(R.prop('password', credentials), R.prop('userID', credentials), 0); }
function setSessionDataInElement (sessionHex) { document.querySelector('#session_data').textContent = sessionHex; }
function mkCredentialsObj (z) { return { userID: R.path(['1', '0'], z), password: R.path(['1', '1'], z) }; }

U.documentReady(main);

loginModule = {
  validatedUserCredentialsStream
};
