// hy_login.js - contains javascript for login, encryption and session authentication
const C = commonUtils;
const A = animations;
const Utils = utils;

const path = 'api';

Utils.documentReady(function () {
  initializeClickAndKeyEvents();
  maybeOpenNewWalletModal();
});

function handleLogin () {
  var btnIsNotDisabled = !document.querySelector('#loginbutton').classList.contains('disabled');
  if (btnIsNotDisabled) {
    // \/\/\/\/ CANNOT FACTOR THIS UP YET, BECAUSE IT WILL NOT FIND CREDENTIALS RIGHT AWAY.
    var userid = document.querySelector('#inputUserID').value.toUpperCase();
    var passcode = document.querySelector('#inputPasscode').value;
    var isValidUserIDAndPassword = C.validateUserIDLength(userid) && C.validatePasswordLength(passcode);
    if (isValidUserIDAndPassword) {
      var sessionStep = session_step = 0;
      A.rotateLogin(0);
      setCSSTorenderButtonsToDisabled();
      main(userid, passcode, sessionStep);
    }
  }
}

function main (userid, passcode, sessionStep) {
  blink('arc0');
  nacl = null; // TODO: make official global
  nacl_factory.instantiate(
    instantiateNaclAndHandleLogin(passcode, userid, sessionStep)
  ); // instantiate nacl and handle login
}

function instantiateNaclAndHandleLogin (passcode, userID, sessionStep, cb) {
  return function (naclinstance) {
    nacl = naclinstance; // TODO: INSTANTIATION MUST BE SAVED SOMEWHERE NON-GLOBALLY SO IT IS ACCESSABLE THROUGHOUT
    generateNonceAndUserKeys(passcode, userID, sessionStep);
  };
}

function generateNonceAndUserKeys (passcode, userID, sessionStep) {
  var nonce = nacl.crypto_box_random_nonce();
  var userKeys = C.generateKeys(passcode, userID, 0);
  var user_pubkey = nacl.to_hex(userKeys.boxPk);

  startAnimationAndDoLogin(userKeys, nonce, userID, sessionStep);
}

function startAnimationAndDoLogin (userKeys, nonce, userID, sessionStep) {
  A.dialLogin(0); // Do some animation
  postSessionStep0Data(userKeys, nonce, sessionStep);
  C.continueSession(userKeys, nonce, userID, getSessionData, sessionContinuation(userKeys, nonce, userID));
}

// posts to server under session sign public key
function postSessionStep0Data (userKeys, nonce, sessionStep) {
  var initialSessionData = C.generateInitialSessionData(nonce);
  var url = path + 'x/' + initialSessionData.session_hexsign + '/' + sessionStep;
  A.dialLogin(1);
  fetch(url)
    .then(r => r.json()
      .then(processSessionStep0Reply(initialSessionData, nonce, userKeys))
      .catch(e => console.log('postSessionStep0Data: Error retrieving nonce:', e)))
    .catch(e => console.log('postSessionStep0Data: Error fetching data:', e));
}

function processSessionStep0Reply (sessionStep0Data, nonce, userKeys) {
  return function (nonce1Data) {
    const cleanNonceHasCorrectLength = clean(nonce1Data.nonce1).length === 48;
    if (cleanNonceHasCorrectLength) {
      session_step++; // next step, hand out nonce2
      const sessionStep = session_step;
      var sessionStep1Data = C.generateSecondarySessionData(nonce1Data, sessionStep0Data.session_hexkey, sessionStep0Data.session_signpair.signSk);
      var url = path + 'x/' + sessionStep0Data.session_hexsign + '/' + sessionStep + '/' + sessionStep1Data.crypt_hex;
      fetch(url)
        .then(r => r.json()
              .then(postSession1StepData(sessionStep0Data, sessionStep1Data, nonce, userKeys))
              .catch(e => console.log('postSessionStep0Data: Error retrieving nonce:', e)))
        .catch(e => console.log('postSessionStep0Data: Error fetching data:', e));
    }
  };
}

function setSessionDataInElement (sessionHex) {
  document.querySelector('#session_data').textContent = sessionHex;
}

function postSession1StepData (initialSessionData, sessionStep1Data, nonce, userKeys) {
  return function (data) {
    var sessionData = Object.assign(initialSessionData, sessionStep1Data, { nonce }, { userKeys });
    A.dialLogin(2);
    C.sessionStep1Reply(data, sessionData, setSessionDataInElement);
    A.dialLogin(3);
  };
}

function maybeOpenNewWalletModal () {
  if (location.href.indexOf('#') !== -1) {
    var locationHref = location.href.substr(location.href.indexOf('#'));
    if (locationHref === '#new') {
      PRNG.seeder.restart();
      document.getElementById('newaccountmodal').style.display = 'block';
    }
  }
}

function cannotSetUpEncryptedSessionAlert () {
  console.log('Error: Cannot set up encrypted session. Please check your connectivity!');
}

function sessionContinuation (userKeys, nonce, userid) {
  return function () {
    if (DEBUG) { console.log(readSession(userKeys, nonce, sessionData, cannotSetUpEncryptedSessionAlert)); } // use read_session(user_keys,nonce) to read out session variables
    setTimeout(function () { // added extra time to avoid forward to interface before x authentication completes!
      fetchview('interface', {
        user_keys: userKeys,
        nonce,
        userid
      });
    }, 3000);
  };
}

function getSessionData () {
  return document.querySelector('#session_data').textContent;
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

function setCSSTorenderButtonsToDisabled () {
  const arcBackgroundColor = document.querySelector('#combinator').style.color;
  document.querySelector('#loginbutton').classList.add('disabled');
  document.querySelector('#arc0').style.backgroundColor = arcBackgroundColor;
  document.querySelector('#generatebutton').setAttribute('disabled', 'disabled');
  document.querySelector('#helpbutton').setAttribute('disabled', 'disabled');
  document.querySelector('#combinatorwrap').style.opacity = 1;
}

function focusOnPasswordAfterReturnKeyOnID (e) {
  const keyPressIsReturn = e.keyCode === 13;
  if (keyPressIsReturn) {
    document.querySelector('#inputPasscode').focus();
  }
}

function focusOnLoginButton (cb) {
  return function (e) {
    const keyPressIsReturn = e.keyCode === 13;
    if (keyPressIsReturn) {
      document.querySelector('#loginbutton').focus();
      cb();
    }
  };
}

function initializeClickAndKeyEvents () {
  document.querySelector('#loginbutton').onclick = handleLogin;
  document.querySelector('#inputUserID').onkeypress = focusOnPasswordAfterReturnKeyOnID;
  document.querySelector('#inputPasscode').onkeypress = focusOnLoginButton(handleLogin);
  document.keydown = handleCtrlSKeyEvent; // for legacy wallets enable signin button on CTRL-S
}
