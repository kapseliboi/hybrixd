// hy_login.js - contains javascript for login, encryption and session authentication
var C = commonUtils;
var A = animations;
var S = loginInputStreams;
var V = validations;
var Utils = utils;
var fetch_ = fetch

var path = 'api';

////////////////////////////////
// GLOBAL STUFFZ ///////////////
////////////////////////////////

nacl_factory.instantiate(function (naclinstance) {
  nacl = naclinstance;
});

session_step = 1; // Session step number at the end of login

var randomNonce = nacl.crypto_box_random_nonce();

var keyDownOnUserIDStream = mkInputStream('#inputUserID');
var keyDownOnPasswordStream = mkInputStream('#inputPasscode');

var loginBtnStream = Rx.Observable
    .fromEvent(document.querySelector('#loginbutton'), 'click')
    .filter(btnIsNotDisabled);

var validatedUserCredentialsStream = Rx.Observable
    .merge(
      loginBtnStream,
      keyDownOnPasswordStream
    )
    .withLatestFrom(S.credentialsStream)
    .filter(function (z) {
      var userID = z[1][0];
      var password = z[1][1];
      return V.validateCredentials(userID, password);
    });

var doRenderAndAnimationStuffStream =
    validatedUserCredentialsStream
    .map(function (_) {
      setCSSTorenderButtonsToDisabled(); // Make own stream);
      A.startLoginAnimation(); // Combine with above stream
    });

var sessionStepStream = Rx.Observable
    .from([0]);

var generatedKeysStream =
    validatedUserCredentialsStream
    .map(function (z) {
      var userID = z[1][0];
      var password = z[1][1];
      return C.generateKeys(password, userID, 0);
    });

var randomNonceStream = Rx.Observable
    .from(randomNonce);

var initialSessionDataStream = Rx.Observable // GET INITIAL SESSIONDATA HERE
    .combineLatest(
      randomNonceStream,
      sessionStepStream,
      generatedKeysStream,
      doRenderAndAnimationStuffStream
    )
    .map(createSessionStep0UrlAndData);

var postSessionStep0DataStream =
    initialSessionDataStream
    .flatMap(initialSessionData =>
             Rx.Observable.fromPromise(
               fetch_(initialSessionData.url)
                 .then(r => r.json()
                       .then(r => R.merge(initialSessionData, r))
                       .catch(e => console.log('postSessionStep0Data: Error retrieving nonce:', e)))
                 .catch(e => console.log('postSessionStep0Data: Error fetching data:', e))
             ));

var processSessionStep0ReplyStream = Rx.Observable
    .zip(
      postSessionStep0DataStream,
      sessionStepStream // SESSIONSTEP NEEDS TO BE INCREMENTED HERE
    )
    .filter(nonceHasCorrectLength)
    .map(mkPostSessionStep1Url);

function mkPostSessionStep1Url (z) {
  var nonce1 = z[0].nonce1;
  var sessionStep = z[1] + 1; // NOW SETTING SESSION STEP MANUALLY.....
  var initialSessionData = z[0].sessionData;
  var sessionStep1Data = C.generateSecondarySessionData(nonce1, initialSessionData.session_hexkey, initialSessionData.session_signpair.signSk);
  return {
    url: path + 'x/' + initialSessionData.session_hexsign + '/' + sessionStep + '/' + sessionStep1Data.crypt_hex,
    sessionData: initialSessionData,
    sessionData2: sessionStep1Data
  }
}

var postSessionStep1DataStream =
    processSessionStep0ReplyStream
    .map(function (r) { console.log('rrrr1', r); return r; })
    .flatMap(function (sessionData) {
      return Rx.Observable
        .fromPromise(fetch_(sessionData.url)
                     .then(r => r.json()
                           .then(r => R.merge(sessionData, { sessionStep1: r }))
                           .catch(e => console.log('postSessionStep1Data: Error retrieving session step 1 data:', e)))
                     .catch(e => console.log('postSessionStep1Data: Error fetching data:', e)));
    });

var processSession1StepDataStream = Rx.Observable
    .combineLatest(
      postSessionStep1DataStream,
      randomNonceStream,
      generatedKeysStream
    )
    .map(function (r) { console.log('rrrr', r); return r; })
    .map(function (z) {
      var initialSessionData = z[0].sessionData;
      var secondarySessionData = z[0].sessionData2;
      var sessionStep1Data = z[0].sessionStep1;
      var nonce = z[1];
      var userKeys = z[2];
      var sessionData = R.mergeAll([
        initialSessionData,
        secondarySessionData,
        sessionStep1Data,
        { nonce },
        { userKeys }
      ]);

      return C.sessionStep1Reply(sessionStep1Data, sessionData, setSessionDataInElement);
    });

var fetchViewStream = Rx.Observable
    .combineLatest(
      generatedKeysStream,
      randomNonceStream,
      validatedUserCredentialsStream,
      processSession1StepDataStream
    )
    .filter(function (z) {
      var retrievedSessionData = z[2];
      return retrievedSessionData;
    })
    .map(function (z) {
      var userKeys = z[0];
      var nonce = z[3].current_nonce;
      var userid = z[2][0];

      fetchview('interface', {
        user_keys: userKeys,
        nonce,
        userid
      });
    });

function createSessionStep0UrlAndData (z) {
  var nonce = z[0];
  var sessionStep = z[1];
  var initialSessionData = C.generateInitialSessionData(nonce);
  return {
    url: path + 'x/' + initialSessionData.session_hexsign + '/' + sessionStep,
    sessionData: initialSessionData
  };
}

function nonceHasCorrectLength (z) {
  var nonce1 = z[0].nonce1;
  return C.clean(nonce1).length === 48;
}

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
;
function setCSSTorenderButtonsToDisabled () {
  var arcBackgroundColor = document.querySelector('#combinator').style.color;
  document.querySelector('#loginbutton').classList.add('disabled');
  document.querySelector('#arc0').style.backgroundColor = arcBackgroundColor;
  document.querySelector('#generatebutton').setAttribute('disabled', 'disabled');
  document.querySelector('#helpbutton').setAttribute('disabled', 'disabled');
  document.querySelector('#combinatorwrap').style.opacity = 1;
}

function mkInputStream (query) {
  return Rx.Observable
    .fromEvent(document.querySelector(query), 'keydown')
    .filter(function (e) { return e.key === 'Enter'; });
}

function maybeOpenNewWalletModal (location) {
  if (location.href.indexOf('#') !== -1) {
    var locationHref = location.href.substr(location.href.indexOf('#'));
    if (locationHref === '#new') {
      PRNG.seeder.restart();
      document.getElementById('newaccountmodal').style.display = 'block';
    }
  }
}

function btnIsNotDisabled (e) { return !e.target.parentElement.classList.contains('disabled'); }
function setSessionDataInElement (sessionHex) { document.querySelector('#session_data').textContent = sessionHex; }
function getSessionData () { return document.querySelector('#session_data').textContent; }

Utils.documentReady(function () {
  document.keydown = handleCtrlSKeyEvent; // for legacy wallets enable signin button on CTRL-S
  maybeOpenNewWalletModal(location);
  keyDownOnUserIDStream.subscribe(_ => document.querySelector('#inputPasscode').focus());
  fetchViewStream.subscribe();
});
