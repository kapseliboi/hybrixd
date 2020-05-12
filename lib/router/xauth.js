// xauth.js -> implements secure connect exchange /x
//
// (c)2020 hybrix - Amadeus de Koning, Joachim de Koning, Rouke Pouw
//
const route = require('../router/router');

const LZString = require('../../common/crypto/lz-string');
const UrlBase64 = require('../../common/crypto/urlbase64');
const hex2dec = require('../../common/crypto/hex2dec'); // convert long HEX to decimal
const Decimal = require('../../common/crypto/decimal-light.js');
Decimal.set({precision: 64}); // cryptocurrencies (like for example Ethereum) require extremely high precision!

const sessions = [];

// cleans a string
function clean (dirty) {
  if (typeof dirty !== 'undefined') {
    let dirty_str = dirty.toString();
    var clean_str = dirty_str.replace(/[^A-Za-z0-9]/g, '');
  } else { clean_str = ''; }
  return clean_str;
}

function processX (request, xpath) {
  if (xpath.length > 1) {
    return xauth(xpath);
  } else {
    global.hybrixd.logger(['error', 'xauth'], 'Error 0.');
    return ''; // Silent Error
  }
}

function getProcessPayload (decodeOrIDfn, stringifyFn, errorLogStr) {
  return function (request, xpath) {
    if (xpath.length === 4) { // GET must carry payload, or '0' for POST
      try {
        const sessionHexKey = xpath[1];
        const hexKey = sessions[sessionHexKey];
        const hexIsValid = !hexKey.invalid;
        const credentialsAreValid = typeof hexKey.server_session_seckey !== 'undefined' && !hexKey.invalid;
        const reqSessionData = { // do a nested route on the decoded GET/POST to return plaintext result (encrypt the result, and put in a JSON object)
          url: decodeOrIDfn(getPayloadFromType(sessionHexKey, xpath[2], UrlBase64.safeDecompress(xpath[3]), 'xplain', hexIsValid)),
          sessionID: xpath[1],
          nonce: xpath[2]
        };
        const req = Object.assign(request, reqSessionData);
        const payloadOrNull = getPayloadFromType(sessionHexKey, xpath[2], stringifyFn(req), 'xcrypt', credentialsAreValid);

        return {error: 0, data: UrlBase64.safeCompress(payloadOrNull)};
      } catch (err) {
        global.hybrixd.logger(['error', 'xauth'], 'Error 1 : ', err);
        return {error: 1}; // Silent Error
      }
    } else {
      global.hybrixd.logger(['error', 'xauth'], 'Error 2.');
      return {error: 1}; // Silent Error
    }
  };
}

function xauth (xpath) {
  let xresponse = {error: 1};
  let sessionStep = parseInt(xpath[2]);
  if (sessionStep < 2) {
    // authenticate and secure session communications
    try {
      let sessionHexkey = String(clean(xpath[1]));
      // step 1. give nonce1 to user
      if (typeof sessions[sessionHexkey] === 'undefined' && sessionStep === 0 && sessionHexkey.length === 64) { // no session defined
        xresponse = lowerNonceChar(sessionHexkey);
      } else if (typeof sessions[sessionHexkey].nonce1 !== 'undefined' && sessionStep === 1) {
        xresponse = maybeCreateSession(sessionHexkey, sessionStep, xpath);
      } else {
        if (typeof sessions[sessionHexkey] !== 'undefined') { delete sessions[sessionHexkey]; }
      }
    } catch (err) {
      global.hybrixd.logger(['error', 'xauth'], 'Error 3.');
    }
  }
  // return object to router for delivery
  return xresponse;
}

// perform char lowering of the nonce1 (for sum purposes)
function lowerNonceChar (sessionHexkey) {
  const nonce1 = nacl.to_hex(nacl.crypto_box_random_nonce()).replace(/^[8-9a-f]/, matchChar);
  sessions[sessionHexkey] = {
    nonce1
  };
  return {
    error: 0,
    nonce1
  };
}

function matchChar (match) {
  let range = ['8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
  return range.indexOf(match);
}

function maybeCreateSession (sessionHexKey, sessionStep, xpath) {
  const cryptBin = nacl.from_hex(clean(xpath[3])); // 3rd argument contains crypt_hex
  const sessionBinkey = nacl.from_hex(sessionHexKey); // determine authenticity of pubkey by opening signed package
  const cryptMsg = nacl.crypto_sign_open(cryptBin, sessionBinkey);
  const secretsJson = JSON.parse(nacl.decode_utf8(cryptMsg));
  const isNonceCorrect = secretsJson.nonce1 === sessions[sessionHexKey].nonce1; // check nonce1 returned with nonce1 stored in step 0 (are we speaking to same person?)

  if (cryptMsg && isNonceCorrect) { // if returned signed nonce1 is authentic, create session keypair and store server_session_seckey in sessions
    return createSession(sessionHexKey, secretsJson, sessionStep);
  } else {
    global.hybrixd.logger(['error', 'xauth'], 'Error 4.');
  }
}

function createSession (sessionHexKey, secretsJson, sessionStep) {
  const serverData = getServerDataAndSetGlobally(sessionHexKey, secretsJson);
  const hexKey = sessions[sessionHexKey];
  const sessionData = getSessionData(hexKey, sessionStep);
  const nonceConvert = hex2dec.toHex(sessionData.nonce_constr.toFixed(0).toString());
  const nonceConhex = nonceConvert.substr(2, nonceConvert.length);
  const currentNonce = nacl.from_hex(nonceConhex);
  const sessionSecrets = {server_sign_pubkey: serverData.serverSignPubkey, server_session_pubkey: serverData.serverSessionPubkey, current_nonce: nonceConhex}; // prepare crypto packet variables (include server_sign_pubkey inside signed package for double check)
  const cryptBin = nacl.encode_utf8(JSON.stringify(sessionSecrets)); // using signing method
  const signHex = nacl.to_hex(nacl.crypto_sign(cryptBin, serverData.serverSessionSignpair.signSk));
  const clientSessionPubkey = hexKey.client_session_pubkey;
  const serverSessionSeckey = hexKey.server_session_seckey;

  // TODO: IS THIS STILL VALID \/\/\/\/
  // this is where it seems to botch up
  // check crypto_box function for arguments and their formats
  // need to convert sign_hex and current_nonce using nacl.from_hex ???
  const signBin = nacl.from_hex(signHex);
  const clientSessionPubkeyBin = nacl.from_hex(clientSessionPubkey);
  const serverSessionSeckeyBin = nacl.from_hex(serverSessionSeckey);
  const cryptHex = nacl.to_hex(nacl.crypto_box(signBin, currentNonce, clientSessionPubkeyBin, serverSessionSeckeyBin));
  const xresponse = {
    error: 0,
    server_sign_pubkey: serverData.serverSignPubkey,
    server_session_pubkey: serverData.serverSessionPubkey,
    current_nonce: nonceConhex,
    crhex: cryptHex
  }; // send server_session_pubhex *encrypted with client_session_pubkey*

  //  processDebug(nonceConhex, cryptBin, signHex, cryptHex, xresponse, sessionSecrets);

  return xresponse;
}

function getServerDataAndSetGlobally (sessionHexKey, secretsJson) {
  sessions[sessionHexKey].nonce2 = clean(secretsJson.nonce2); // store nonce2 provided by the client
  let serverSessionSeed = nacl.random_bytes(4096); // create a server session keypair (we know now the client is not a simple troll)
  let serverSessionKeypair = nacl.crypto_box_keypair_from_seed(serverSessionSeed);
  sessions[sessionHexKey].server_session_seckey = nacl.to_hex(serverSessionKeypair.boxSk);
  let serverSessionPubkey = nacl.to_hex(serverSessionKeypair.boxPk);
  sessions[sessionHexKey].client_session_pubkey = secretsJson.client_session_pubkey;
  let serverSessionSignpair = nacl.crypto_sign_keypair_from_seed(nacl.crypto_hash_sha256(serverSessionSeed)); // create a server signing key
  sessions[sessionHexKey].server_sign_seckey = nacl.to_hex(serverSessionSignpair.signSk);
  let serverSignPubkey = nacl.to_hex(serverSessionSignpair.signPk);

  return {
    serverSessionSignpair,
    serverSessionPubkey,
    serverSignPubkey
  };
}

function processDebug (nonceConhex, cryptBin, signHex, cryptHex, xresponse, sessionSecrets) {
  console.log('Server side xcrypt nonce: ' + nonceConhex + ' CryptPacket data: ' + JSON.stringify(sessionSecrets));
  console.log('Server side utf-8' + cryptBin);
  console.log('Server side sign_hex' + signHex);
  console.log('Server side crypt_hex' + cryptHex);
  console.log('xresponse:' + JSON.stringify(xresponse));
}

function getPayloadFromType (sessionHexKey, sessionStep, data, type, b) {
  const hexKey = sessions[sessionHexKey];
  const xcryptOrXplain = type === 'xplain' ? getXplainPayloadOrNull : getXcryptPayload;

  return b
    ? xcryptOrXplain(hexKey, data, sessionStep, sessionHexKey)
    : maybeDeleteSessionKey(sessionHexKey, hexKey);
}
/*
// TODO xplain and xcrypt could be refactored further
function xcrypt (sessionHexKey, sessionStep, txtdata) {
  const session = global.hybrixd.xauth.session;
  const hexKey = session[sessionHexKey];
  const credentialsAreValid = typeof hexKey.server_session_seckey !== 'undefined' && !hexKey.invalid;
  // used after xauth to communicate with client
  // decrypts the datagram sent to ychan
  return credentialsAreValid
    ? getXcryptPayload(hexKey, sessionStep, txtdata)
    : maybeDeleteSessionKey(sessionHexKey, hexKey);
}

// TODO xplain and xcrypt could be refactored further
function xplain (sessionHexKey, sessionStep, encdata) {
  const session = global.hybrixd.xauth.session;
  const hexKey = session[sessionHexKey];
  const hexIsValid = !hexKey.invalid;
  // decrypts the datagram sent to ychan
  return hexIsValid
    ? getXplainPayloadOrNull(hexKey, encdata, sessionStep, sessionHexKey) // TODO Unequal amount of arguments!
    : maybeDeleteSessionKey(sessionHexKey, hexKey);
} */

// DEBUG: console.log('Server side xcrypt nonce: '+nonce_conhex+' Txt data: '+txtdata);
// example encoding using crypto_box (needs to be double checked for correct keys used and place of parameters)
function getXcryptPayload (hexKey, txtdata, sessionStep) {
  const cryptUTF8 = nacl.encode_utf8(txtdata);
  return mkPayload(cryptUTF8, hexKey, sessionStep, nacl.crypto_box, nacl.to_hex);
}

// TODO: Make pure
function getXplainPayloadOrNull (hexKey, encdata, sessionStep, sessionHexKey) {
  if (typeof hexKey.server_session_seckey !== 'undefined' && typeof encdata !== 'undefined' && encdata) {
    const cryptBin = nacl.from_hex(clean(encdata));
    return mkPayload(cryptBin, hexKey, sessionStep, nacl.crypto_box_open, nacl.decode_utf8);
  } else { // dump session
    sessions[sessionHexKey].invalid = 1;
    return null;
  }
}

// TODO: additional signing check against in-transport meddling acc. to nacl docs!!!
// var crypt_msg = nacl.crypto_box_open(crypt_bin, nonceBin, senderPublicKeyBin, recipientSecretKeyBin);
function mkPayload (cryptData, hexKey, sessionStep, naclFn, decodingFn) {
  const sessionData = getSessionData(hexKey, sessionStep);
  const payload = getPayload(hexKey, cryptData, sessionStep, sessionData, naclFn, decodingFn);
  return payload;
}

function getPayload (hexKey, cryptData, sessionStep, sessionData, naclFn, decodingFn) {
  const nonceConvert = hex2dec.toHex(sessionData.nonce_constr.toFixed(0).toString());
  const sessionNonce = nacl.from_hex(nonceConvert.substr(2, nonceConvert.length));
  const payload = decodingFn(naclFn(cryptData, sessionNonce, sessionData.clientSessionPubkey, sessionData.server_session_seckey));
  return payload;
}

function getSessionData (hexKey, sessionStep) {
  const nonce1Dec = new Decimal(hex2dec.toDec(hexKey.nonce1));
  const nonce2Dec = new Decimal(hex2dec.toDec(hexKey.nonce2));
  const stepDec = new Decimal(sessionStep);

  return {
    clientSessionPubkey: nacl.from_hex(hexKey.client_session_pubkey), // get keys and nonce
    server_session_seckey: nacl.from_hex(hexKey.server_session_seckey),
    nonce1_dec: nonce1Dec, // calculate current session nonce from nonce1 + nonce2 + step
    nonce2_dec: nonce2Dec,
    step_dec: stepDec,
    nonce_constr: nonce1Dec.plus(nonce2Dec).plus(stepDec) // added using decimal-light plus function for looooong decimals
  };
}

function maybeDeleteSessionKey (session_hexkey, hexKey) {
  if (typeof hexKey !== 'undefined') { delete sessions[session_hexkey]; }
  return null;
}

function stringifyReq (req) {
  return JSON.stringify(route.route(req));
}

function compressAndStringifyReq (req) {
  return LZString.compressToEncodedURIComponent(
    JSON.stringify(
      route.route(req)
    )
  );
}

exports.processX = processX;
exports.processY = getProcessPayload(x => x, stringifyReq, '');
exports.processZ = getProcessPayload(LZString.decompressFromEncodedURIComponent, compressAndStringifyReq, ' [!] z chan error.');
