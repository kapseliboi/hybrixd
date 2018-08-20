import { commonUtils } from './../../../common/index.js';

import * as R from 'ramda';

function validateUseridForLegacyWallets (userID) {
  var hxid = base32ToHex(userID).toUpperCase();
  var hxidSubStr = hxid.substr(12, 4);
  var hxidHash = DJB2.hash(hxid.substr(0, 12)).substr(0, 4);
  return hxidHash === hxidSubStr;
}

function validatePassForLegacyWallets (userID, pass) {
  var hxid = base32ToHex(userID).toLowerCase();
  var passwordUpperCase = pass.toUpperCase();
  var hxidSubStr = hxid.substr(16, 4).toUpperCase();
  var hxidHash = DJB2.hash(hxid.substr(0, 12) + passwordUpperCase).substr(4, 4);
  return hxidHash === hxidSubStr;
}

function validateCredentials (userID, pass) {
  var isUserIDValid = commonUtils.validateUserIDLength(userID) && validateUseridForLegacyWallets(userID) && userID !== pass;
  var isPasswordValid = commonUtils.validatePasswordLength(pass) && validatePassForLegacyWallets(userID, pass);

  return isUserIDValid && isPasswordValid;
}

function nonceHasCorrectLength (nonce1) { return commonUtils.clean(nonce1).length === 48; }
function hasValidCredentials (credentials) { return validateCredentials(R.prop('userID', credentials), R.prop('password', credentials)); }

export var validations = {
  validateCredentials,
  nonceHasCorrectLength,
  hasValidCredentials
};
