// hy_login.js - contains javascript for login, encryption and session authentication
var C = commonUtils;
var A = animations;
var S = loginInputStreams;
var V = validations;
var U = utils;

var POW = proofOfWork_;
var Storage = storage;

var path = 'api'; // TODO: Factor up!
var args = {};

GL = {
  assets: [],
  assetnames: {},
  assetmodes: {},
  coinMarketCapTickers: [],
  powqueue: [],
  usercrypto: {},
  // usercrypto: {
  //   user_keys: args.user_keys,
  //   nonce: args.nonce
  // },
  initCount: 0
};

// Don't move this yet, as the cur_step is needed by assetModesUrl. Synchronous coding!
nacl_factory.instantiate(function (naclinstance) { nacl = naclinstance; }); // TODO
session_step = 1; // Session step number at the end of login. TODO

var defaultAssetData = [
  { id: 'btc', starred: false },
  { id: 'eth', starred: false }
];

////////////////////////////////
// GLOBAL STUFFZ ///////////////
////////////////////////////////

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

var validatedUserCredentialsStream = userSubmitStream
    .withLatestFrom(S.credentialsStream)
    .map(mkCredentialsObj)
    .map(R.map(U.normalizeUserInput))
    .filter(hasValidCredentials);

function main () {
  document.keydown = handleCtrlSKeyEvent; // for legacy wallets enable signin button on CTRL-S
  maybeOpenNewWalletModal(location);
  keyDownOnUserIDStream.subscribe(function (_) { document.querySelector('#inputPasscode').focus(); });
  validatedUserCredentialsStream.subscribe(function (userCredentials) {
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
          GL.usercrypto = {
            user_keys: R.nth(0, z),
            nonce: R.path(['3', 'current_nonce'], z)
          };
          return z
        })
        .delay(500);

    A.startLoginAnimation();
    setCSSTorenderButtonsToDisabled();
    // HACK! :( So that CSS gets rendered immediately and user gets feedback right away.
    setTimeout(function () {
      // FLIP LOGIN FORM
      document.querySelector('.flipper').classList.add('active');
      document.querySelector('#generateform').classList.add('inactive');
      fetchViewStream.subscribe(function (z) {
        main_(z);
      });
    }, 500);
  });
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

// EFF ::
function initialize_ (z) {
  var globalAssets = R.nth(0, z);
  var assetsModesAndNames = R.nth(1, z);

  GL.assetnames = mkAssetData(assetsModesAndNames, 'name');
  GL.assetmodes = mkAssetData(assetsModesAndNames, 'mode');
  initializeGlobalAssets(globalAssets);
  Storage.Set(userStorageKey('ff00-0035'), userEncode(globalAssets));
}

function initializeAsset (asset) {
  return function (entry) {
    return initAsset(entry, GL.assetmodes[entry], asset);
  };
}

function mkAssetData (data, key) {
  return R.compose(
    R.mergeAll,
    R.map(R.curry(matchSymbolWithData)(key)),
    R.prop('data')
  )(data);
}

function matchSymbolWithData (key, data) {
  return R.assoc(
    R.prop('symbol', data),
    R.prop(key, data),
    {}
  );
}

function storedOrDefaultUserData (decodeUserData) {
  return R.compose(
    R.unless(
      R.allPass([
        R.all(R.allPass([
          R.has('id'),
          R.has('starred')
        ])),
        R.compose(R.not, R.isEmpty)
      ]),
      R.always(defaultAssetData)
    ),
    R.defaultTo(defaultAssetData)
  )(decodeUserData);
}

function initializeGlobalAssets (assets) {
  return R.compose(
    U.updateGlobalAssets,
    R.map(R.merge({balance: { amount: 'n/a', lastTx: 0 }})),
    R.filter(existsInAssetNames)
  )(assets);
}

function existsInAssetNames (asset) {
  return R.compose(
    R.defaultTo(false),
    R.find(R.equals(R.prop('id', asset))),
    R.keys
  )(GL.assetnames);
}

function decryptData (d) { return R.curry(zchan_obj)(GL.usercrypto)(GL.cur_step)(d); }
function nonceHasCorrectLength (nonce1) { return C.clean(nonce1).length === 48; }
function mkSessionKeys (credentials) { return C.generateKeys(R.prop('password', credentials), R.prop('userID', credentials), 0); }
function setSessionDataInElement (sessionHex) { document.querySelector('#session_data').textContent = sessionHex; }
function hasValidCredentials (credentials) { return V.validateCredentials(R.prop('userID', credentials), R.prop('password', credentials)); }
function mkCredentialsObj (z) { return { userID: R.path(['1', '0'], z), password: R.path(['1', '1'], z) }; }

function main_ (z) {
  GL.cur_step = nextStep();
  function mkAssetModesUrl () {
    return path + zchan(GL.usercrypto, GL.cur_step, 'l/asset/details');
  }

  var assetsModesAndNamesStream = Rx.Observable
      .fromPromise(U.fetchDataFromUrl(mkAssetModesUrl(), 'Error retrieving asset details.'))
      .map(decryptData);

  var initialAnimationStateStream = Rx.Observable.interval(200)
      .startWith(0)
      .take(2);

  var deterministicHashesStream = Rx.Observable
      .fromPromise(hybriddcall({r: '/s/deterministic/hashes', z: true}))
      .filter(R.propEq('error', 0));

  var deterministicHashesResponseProcessStream = deterministicHashesStream
      .flatMap(function (properties) {
        return Rx.Observable
          .fromPromise(hybriddReturnProcess(properties));
      })
      .map(R.prop('data')) // VALIDATE?
      .map(function (deterministicHashes) { assets.modehashes = deterministicHashes; }) // TODO: Make storedUserStream dependent on this stream!

  var storedUserDataStream = Storage.Get_(userStorageKey('ff00-0035'))
      .map(userDecode)
      .map(storedOrDefaultUserData) // TODO: make pure!

  var assetsDetailsStream = storedUserDataStream
      .flatMap(a => a) // Flatten Array structure...
      .filter(existsInAssetNames) // TODO: Now REMOVES assets that have been disabed in the backed. Need to disable / notify user when this occurs.
      .flatMap(function (asset) {
        return R.compose(
          initializeAsset(asset),
          R.prop('id')
        )(asset);
      })
      .map(U.addIcon);

  var initializationStream = Rx.Observable
      .combineLatest(
        storedUserDataStream,
        assetsModesAndNamesStream,
        deterministicHashesResponseProcessStream
      );

  var animationStream = Rx.Observable
      .concat(
        initialAnimationStateStream,
        storedUserDataStream,
        assetsModesAndNamesStream,
        deterministicHashesResponseProcessStream,
        assetsDetailsStream
      )
      .scan(function (acc, curr) { return acc + 1; })
      .map(function (n) { return n <= 6 ? n : 6; })
      .map(doProgressAnimation);

  var powQueueIntervalStream = Rx.Observable
      .interval(30000);

  // EFF ::
  function updateAssetDetailsAndRenderDashboardView (assetDetails) {
    GL.initCount += 1; // HACK!
    GL.assets = R.reduce(U.mkUpdatedAssets(assetDetails), [], GL.assets);

    // HACK: Assets can only be viewed when all details have been retrieved. Otherwise, transactions will not work.
    if (GL.initCount === R.length(GL.assets)) {
      fetchview('interface', {
        user_keys: R.nth(0, z),
        nonce: R.path(['3', 'current_nonce'], z),
        userid: R.path(['2', 'userID'], z)
      });
      // HACK: Fix race condition for now.......
      setTimeout(function () {
        fetchview('interface.dashboard', args); // UNTIL VIEW IS RENDERED SEPARATELY:
      }, 500)
    }
  }

  animationStream.subscribe();
  powQueueIntervalStream.subscribe(function (_) { POW.loopThroughProofOfWork(); } ); // once every two minutes, loop through proof-of-work queue
  initializationStream.subscribe(initialize_);
  assetsDetailsStream.subscribe(updateAssetDetailsAndRenderDashboardView); // TODO: Separate data retrieval from DOM rendering. Dashboard should be rendered in any case.
}

function doProgressAnimation (step) {
  var elemExists = R.not(R.isNil(document.querySelector('.progress-bar'))) &&
                   R.not(R.isNil(document.querySelector('.progress-text')));
  if (elemExists) {
    document.querySelector('.progress-bar').style.width = R.path([step, 'weight'], A.progressMessages);
    document.querySelector('.progress-text').innerHTML = R.path([step, 'message'], A.progressMessages);
  }
}

U.documentReady(main);
