import { assetInitialisation } from './js/AssetInitialisationStreams/assetInitialisationStreams.js';
import { browserSupport } from './js/BrowserSupport/browserSupport.js';
import { sessionData } from './js/SessionData/sessionData.js';
import { userCredentialsValidation } from './js/UserCredentialValidation/userCredentialValidation.js';
import { userFeedback } from './js/UserFeedback/userFeedback.js';
import { walletMaintenance } from './js/WalletMaintenance/walletMaintenance.js';

import { utils_ } from './../index/utils.js';

import { loginInputStreams } from './js/loginStreams.js';

import * as R from 'ramda';

import { from } from 'rxjs/observable/from';
import { delay, map, tap, flatMap } from 'rxjs/operators';

import customAlert from './login.ui.js';

var path = 'api'; // TODO: Factor up!
var args = {};

var animationDelayByBrowser = bowser.name === 'Firefox' ? 1000 : 10;

/// /////////////////////////////
// GLOBAL STUFFZ ///////////////
/// /////////////////////////////

// TODO:
// - Remove global session_step --> Make into incremental counter (save in state)
// - Remove Nacl as a global and save in some state
// - Put Ctrl-S event in Stream
// - Factor 'path' up

// - Fix HACK for priority queue

var keyDownOnUserIDStream = loginInputStreams.mkInputStream('#inputUserID');
var localForageUserConfigStream = from(localforage.getItem('userHasLoggedOut'))
  .pipe(
    map(userFeedback.maybeRenderLogOutMessage),
    delay(500),
    tap(R.curry(userFeedback.setLocalUserLogOutStatus)(false))
  );
var handleLoginStream = userCredentialsValidation.credentialsOrErrorStream
  .pipe(
    tap(function (_) { userFeedback.doFlipOverAnimation(); }),
    delay(animationDelayByBrowser), // HACK: Delay data somewhat so browser gives priority to DOM manipulation instead of initiating all further streams.
    flatMap(R.curry(sessionData.mkSessionDataStream)(nacl)), // TODO: Remove global dependency
    tap(updateUserCrypto),
    flatMap(assetInitialisation.mkAssetInitializationStream),
    map(R.sortBy(R.compose(R.toLower, R.prop('id')))),
    tap(utils_.updateGlobalAssets)
  );

function main () {
  browserSupport.checkBrowserSupport(window.navigator.userAgent);
  walletMaintenance.mkTestHybriddAvailabilityStream().subscribe();
  maybeOpenNewWalletModal(location);
  localForageUserConfigStream.subscribe();
  document.keydown = handleCtrlSKeyEvent; // for legacy wallets enable signin button on CTRL-S
  keyDownOnUserIDStream.subscribe(function (_) { document.querySelector('#inputPasscode').focus(); });
  handleLoginStream.subscribe(renderInterface);
}

function renderInterface (assets) {
  fetchview('interface');
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

function maybeOpenNewWalletModal (location) {
  if (location.href.indexOf('#') !== -1) {
    var locationHref = location.href.substr(location.href.indexOf('#'));
    if (locationHref === '#new') {
      PRNG.seeder.restart(); // As found in: newaccount_b.js
      document.getElementById('newaccountmodal').style.display = 'block';
    }
  }
}

function updateUserCrypto (userSessionData) {
  GL.usercrypto = {
    user_keys: R.nth(0, userSessionData),
    nonce: R.path(['3', 'current_nonce'], userSessionData),
    userid: R.path(['2', 'userID'], userSessionData)
  };
}

utils_.documentReady(main);
