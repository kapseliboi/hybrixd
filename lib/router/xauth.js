// xauth.js -> implements secure connect exchange /x
//
// (c)2016 metasync r&d - Amadeus de Koning
//
let route = require('../router');
let functions = require('../functions');
let modules = require('../modules');

let LZString = require('../../common/crypto/lz-string');
let UrlBase64 = require('../../common/crypto/urlbase64');
let hex2dec = require('../../common/crypto/hex2dec'); // convert long HEX to decimal
let Decimal = require('../../common/crypto/decimal-light.js');
Decimal.set({precision: 64}); // cryptocurrencies (like for example Ethereum) require extremely high precision!

// export every function
exports.processX = processX;
exports.processY = processY;
exports.processZ = processZ;

// functions start here
function processX (request, xpath) {
  if (xpath.length > 1) {
    let tmp = xauth(request, xpath);
    return tmp;
  } else {
    return ''; // Silent Error
  }
}

function processY (request, xpath) {
  // RP: explicitly set acceptance to ==4  SInce only 4 are used
  if (xpath.length === 4) { // GET must carry payload, or '0' for POST
    try {
      request.url = xplain(xpath[1], xpath[2], UrlBase64.safeDecompress(xpath[3]));
      // do a nested route on the decoded GET/POST to return plaintext result (encrypt the result, and put in a JSON object)
      request.sessionID = xpath[1];
      request.nonce = xpath[2];
      return UrlBase64.safeCompress(xcrypt(xpath[1], xpath[2], JSON.stringify(route.route(request))));
    } catch (err) {
      console.log(' [!] y-chan decoding error, or illegal routing call!');
      return ''; // Silent Error
    }
  } else {
    return ''; // Silent Error
  }
}

function processZ (request, xpath) {
  if (xpath.length === 4) { // GET must carry payload, or '0' for POST
    try {
      // decompress incoming request
      request.url = LZString.decompressFromEncodedURIComponent(xplain(xpath[1], xpath[2], UrlBase64.safeDecompress(xpath[3])));
      // do a nested route on the decoded GET/POST, compress result, encrypt it
      request.sessionID = xpath[1];
      request.nonce = xpath[2];
      let response = route.route(request);
      let result = UrlBase64.safeCompress(xcrypt(xpath[1], xpath[2], LZString.compressToEncodedURIComponent(JSON.stringify(response))));
      return result;
    } catch (err) {
      console.log(' [!] z chan error.');
      return ''; // Silent Error
    }
  } else {
    return ''; // Silent Error
  }
}

function xauth (http_req, xpath) {
  let xresponse = {error: 1};
  let session_step = parseInt(xpath[2]);
  if (session_step < 2) {
    // authenticate and secure session communications
    try {
      let session_hexkey = String(functions.clean(xpath[1]));
      // step 1. give nonce1 to user
      if (typeof global.hybrixd.xauth.session[session_hexkey] === 'undefined' && session_step === 0 && session_hexkey.length === 64) { // no session defined
      // perform char lowering of the nonce1 (for sum purposes)
        let nonce1 = nacl.to_hex(nacl.crypto_box_random_nonce()).replace(/^[8-9a-f]/, function (match) { let range = ['8', '9', 'a', 'b', 'c', 'd', 'e', 'f']; return range.indexOf(match); });
        global.hybrixd.xauth.session[session_hexkey] = {
          nonce1: nonce1
        };
        xresponse = {error: 0, nonce1: global.hybrixd.xauth.session[session_hexkey].nonce1};
      } else if (typeof global.hybrixd.xauth.session[session_hexkey].nonce1 !== 'undefined' && session_step === 1) {
      // 3rd argument contains crypt_hex
        var crypt_bin = nacl.from_hex(functions.clean(xpath[3]));
        // determine authenticity of pubkey by opening signed package
        let session_binkey = nacl.from_hex(session_hexkey);
        let crypt_msg = nacl.crypto_sign_open(crypt_bin, session_binkey);
        // if returned signed nonce1 is authentic, create session keypair and store server_session_seckey in global
        if (crypt_msg) {
          let secrets_json = JSON.parse(nacl.decode_utf8(crypt_msg));
          if (DEBUG) { console.log(JSON.stringify(secrets_json)); }

          // check nonce1 returned with nonce1 stored in step 0 (are we speaking to same person?)
          if (secrets_json.nonce1 === global.hybrixd.xauth.session[session_hexkey].nonce1) {
          // store nonce2 provided by the client
            global.hybrixd.xauth.session[session_hexkey].nonce2 = functions.clean(secrets_json.nonce2);
            // create a server session keypair (we know now the client is not a simple troll)
            let server_session_seed = nacl.random_bytes(4096);
            let server_session_keypair = nacl.crypto_box_keypair_from_seed(server_session_seed);
            global.hybrixd.xauth.session[session_hexkey].server_session_seckey = nacl.to_hex(server_session_keypair.boxSk);
            let server_session_pubkey = nacl.to_hex(server_session_keypair.boxPk);
            global.hybrixd.xauth.session[session_hexkey].client_session_pubkey = secrets_json.client_session_pubkey;
            // create a server signing key
            let server_session_signpair = nacl.crypto_sign_keypair_from_seed(nacl.crypto_hash_sha256(server_session_seed));
            global.hybrixd.xauth.session[session_hexkey].server_sign_seckey = nacl.to_hex(server_session_signpair.signSk);
            let server_sign_pubkey = nacl.to_hex(server_session_signpair.signPk);
            // calculate current session nonce from nonce1 + nonce2 + step
            let nonce1_dec = new Decimal(hex2dec.toDec(global.hybrixd.xauth.session[session_hexkey].nonce1));
            let nonce2_dec = new Decimal(hex2dec.toDec(global.hybrixd.xauth.session[session_hexkey].nonce2));
            let step_dec = new Decimal(session_step);
            // added using decimal-light plus function for looooong decimals
            let nonce_constr = nonce1_dec.plus(nonce2_dec).plus(step_dec);
            // convert nonce_construct integer string back into hex
            let nonce_convert = hex2dec.toHex(nonce_constr.toFixed(0).toString()); // Agent725 bugfix: cutoff disabled to ensure working nonce
            let nonce_conhex = nonce_convert.substr(2, nonce_convert.length);
            let current_nonce = nacl.from_hex(nonce_conhex);
            // prepare crypto packet variables (include server_sign_pubkey inside signed package for double check)
            let session_secrets = {server_sign_pubkey: server_sign_pubkey, server_session_pubkey: server_session_pubkey, current_nonce: nonce_conhex};
            if (DEBUG) { console.log('Server side xcrypt nonce: ' + nonce_conhex + ' CryptPacket data: ' + JSON.stringify(session_secrets)); }

            // using signing method
            var crypt_bin = nacl.encode_utf8(JSON.stringify(session_secrets));
            if (DEBUG) { console.log('Server side utf-8' + crypt_bin); }
            let sign_hex = nacl.to_hex(nacl.crypto_sign(crypt_bin, server_session_signpair.signSk));
            if (DEBUG) { console.log('Server side sign_hex' + sign_hex); }
            let client_session_pubkey = global.hybrixd.xauth.session[session_hexkey].client_session_pubkey;
            let server_session_seckey = global.hybrixd.xauth.session[session_hexkey].server_session_seckey;
            // this is where it seems to botch up
            // check crypto_box function for arguments and their formats
            // need to convert sign_hex and current_nonce using nacl.from_hex ???
            let sign_bin = nacl.from_hex(sign_hex);
            let client_session_pubkey_bin = nacl.from_hex(client_session_pubkey);
            let server_session_seckey_bin = nacl.from_hex(server_session_seckey);
            let crypt_hex = nacl.to_hex(nacl.crypto_box(sign_bin, current_nonce, client_session_pubkey_bin, server_session_seckey_bin));
            if (DEBUG) { console.log('Server side crypt_hex' + crypt_hex); }
            // send server_session_pubhex *encrypted with client_session_pubkey*
            xresponse = {error: 0, server_sign_pubkey: server_sign_pubkey, server_session_pubkey: server_session_pubkey, current_nonce: nonce_conhex, crhex: crypt_hex};
            if (DEBUG) { console.log('xresponse:' + JSON.stringify(xresponse)); }
          }
        }
      } else {
        if (typeof global.hybrixd.xauth.session[session_hexkey] !== 'undefined') { delete global.hybrixd.xauth.session[session_hexkey]; }
      }
    } catch (err) {
      console.log(' [!] x chan error.');
    }
  }

  // return object to router for delivery
  return xresponse;
}

function xcrypt (session_hexkey, session_step, txtdata) {
  const session = global.hybrixd.xauth.session;
  const hexKey = session[session_hexkey];
  // used after xauth to communicate with client
  // decrypts the datagram sent to ychan
  // (mirrored for client in hybrixdcall.js )
  if (typeof hexKey.server_session_seckey !== 'undefined' && !hexKey.invalid) {
    let server_sign_pubkey = hexKey.server_session_pubsign;

    const foo = getSessionData(hexKey, session_step, nacl);

    // let client_session_pubkey = nacl.from_hex(hexKey.client_session_pubkey);
    // let server_session_seckey = nacl.from_hex(hexKey.server_session_seckey);
    // // calculate current session nonce from nonce1 + nonce2 + step
    // let nonce1_dec = new Decimal(hex2dec.toDec(hexKey.nonce1));
    // let nonce2_dec = new Decimal(hex2dec.toDec(hexKey.nonce2));
    // let step_dec = new Decimal(session_step);
    // // added using decimal-light plus function for looooong decimals
    let nonce_constr = foo.nonce1_dec.plus(foo.nonce2_dec).plus(foo.step_dec);

    // convert nonce_construct integer string back into hex
    let nonce_convert = hex2dec.toHex(nonce_constr.toFixed(0).toString()); // Agent725 bugfix: cutoff disabled to ensure working nonce
    let nonce_conhex = nonce_convert.substr(2, nonce_convert.length);
    // DEBUG: console.log('Server side xcrypt nonce: '+nonce_conhex+' Txt data: '+txtdata);
    let session_nonce = nacl.from_hex(nonce_conhex);
    let crypt_utf8 = nacl.encode_utf8(txtdata);
    // example encoding using crypto_box (needs to be double checked for correct keys used and place of parameters)
    let crypt_hex = nacl.to_hex(nacl.crypto_box(crypt_utf8, session_nonce, foo.client_session_pubkey, foo.server_session_seckey));
    // TODO: additional signing step against in-transport meddling acc. to nacl docs!!!
    return crypt_hex;
  } else {
    if (typeof hexKey !== 'undefined') { delete global.hybrixd.xauth.session[session_hexkey]; }
    return null;
  }
}

function getSessionData (hexKey, sessionStep, nacl) {
  const nonce1Dec = new Decimal(hex2dec.toDec(hexKey.nonce1));
  const nonce2Dec = new Decimal(hex2dec.toDec(hexKey.nonce2));
  const stepDec = new Decimal(sessionStep);

  return {
    clientSessionPubkey: nacl.from_hex(hexKey.client_session_pubkey),
    server_session_seckey: nacl.from_hex(hexKey.server_session_seckey),
    nonce1_dec: nonce1Dec,
    nonce2_dec: nonce2Dec,
    step_dec: stepDec,
    nonce_constr: nonce1Dec.plus(nonce2Dec).plus(stepDec)
  };
}

function xplain (sessionHexKey, sessionStep, encdata) {
  const session = global.hybrixd.xauth.session;
  const hexKey = session[sessionHexKey];
  // decrypts the datagram sent to ychan
  // (mirrored for client in hybrixdcall.js )
  if (!hexKey.invalid) {
    if (typeof hexKey.server_session_seckey !== 'undefined' && typeof encdata !== 'undefined' && encdata) {
      // get payload
      let crypt_bin = nacl.from_hex(functions.clean(encdata));

      // get keys and nonce
      let client_session_pubkey = nacl.from_hex(hexKey.client_session_pubkey);
      let server_session_seckey = nacl.from_hex(hexKey.server_session_seckey);
      // calculate current session nonce from nonce1 + nonce2 + step
      let nonce1_dec = new Decimal(hex2dec.toDec(hexKey.nonce1));
      let nonce2_dec = new Decimal(hex2dec.toDec(hexKey.nonce2));
      let step_dec = new Decimal(sessionStep);
      // added using decimal-light plus function for looooong decimals
      let nonce_constr = nonce1_dec.plus(nonce2_dec).plus(step_dec);

      // convert nonce_construct integer string back into hex
      let nonce_convert = hex2dec.toHex(nonce_constr.toFixed(0).toString()); // Agent725 bugfix: cutoff disabled to ensure working nonce
      // DEBUG: console.log('Server side xplain nonce: '+nonce_conhex+' Enc data: '+encdata);
      let session_nonce = nacl.from_hex(nonce_convert.substr(2, nonce_convert.length));
      // TODO: additional signing check against in-transport meddling acc. to nacl docs!!!
      // var crypt_msg = nacl.crypto_box_open(crypt_bin, nonceBin, senderPublicKeyBin, recipientSecretKeyBin);
      var payload = nacl.decode_utf8(nacl.crypto_box_open(crypt_bin, session_nonce, client_session_pubkey, server_session_seckey));
    } else {
      // dump session
      hexKey.invalid = 1;
      payload = null;
    }
    return payload;
  } else {
    if (typeof hexKey !== 'undefined') { delete global.hybrixd.xauth.session[sessionHexKey]; }
    return null;
  }
}
