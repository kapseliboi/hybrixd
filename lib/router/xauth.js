// xauth.js -> implements secure connect exchange /x
//
// (c)2016 metasync r&d - Amadeus de Koning
//
var route = require('../router');
var functions = require('../functions');
var modules = require('../modules');

var LZString = require('../../common/crypto/lz-string');
var UrlBase64 = require('../../common/crypto/urlbase64');
var hex2dec = require('../../common/crypto/hex2dec'); // convert long HEX to decimal
var Decimal = require('../../common/crypto/decimal-light.js');
Decimal.set({precision: 64}); // cryptocurrencies (like for example Ethereum) require extremely high precision!

// export every function
exports.processX = processX;
exports.processY = processY;
exports.processZ = processZ;

// functions start here
function processX (request, xpath) {
  if (xpath.length > 1) {
    var tmp = xauth(request, xpath);
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
      return UrlBase64.safeCompress(xcrypt(xpath[1], xpath[2], route.route(request, modules)));
    } catch (err) {
      console.log(' [!] y chan error.');
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
      return UrlBase64.safeCompress(xcrypt(xpath[1], xpath[2], LZString.compressToEncodedURIComponent(route.route(request, modules))));
    } catch (err) {
      console.log(' [!] z chan error.');
      return ''; // Silent Error
    }
  } else {
    return ''; // Silent Error
  }
}

function xauth (http_req, xpath) {
  var xresponse = {error: 1};
  var session_step = parseInt(xpath[2]);
  if (session_step < 2) {
    // authenticate and secure session communications
    try {
      var session_hexkey = String(functions.clean(xpath[1]));
      // step 1. give nonce1 to user
      if (typeof global.hybridd.xauth.session[session_hexkey] === 'undefined' && session_step === 0 && session_hexkey.length === 64) { // no session defined
      // perform char lowering of the nonce1 (for sum purposes)
        var nonce1 = nacl.to_hex(nacl.crypto_box_random_nonce()).replace(/^[8-9a-f]/, function (match) { var range = ['8', '9', 'a', 'b', 'c', 'd', 'e', 'f']; return range.indexOf(match); });
        global.hybridd.xauth.session[session_hexkey] = {
          nonce1: nonce1
        };
        xresponse = {error: 0, nonce1: global.hybridd.xauth.session[session_hexkey].nonce1};
      } else if (typeof global.hybridd.xauth.session[session_hexkey].nonce1 !== 'undefined' && session_step === 1) {
      // 3rd argument contains crypt_hex
        var crypt_bin = nacl.from_hex(functions.clean(xpath[3]));
        // determine authenticity of pubkey by opening signed package
        var session_binkey = nacl.from_hex(session_hexkey);
        var crypt_msg = nacl.crypto_sign_open(crypt_bin, session_binkey);
        // if returned signed nonce1 is authentic, create session keypair and store server_session_seckey in global
        if (crypt_msg) {
          var secrets_json = JSON.parse(nacl.decode_utf8(crypt_msg));
          if (DEBUG) { console.log(JSON.stringify(secrets_json)); }

          // check nonce1 returned with nonce1 stored in step 0 (are we speaking to same person?)
          if (secrets_json.nonce1 === global.hybridd.xauth.session[session_hexkey].nonce1) {
          // store nonce2 provided by the client
            global.hybridd.xauth.session[session_hexkey].nonce2 = functions.clean(secrets_json.nonce2);
            // create a server session keypair (we know now the client is not a simple troll)
            var server_session_seed = nacl.random_bytes(4096);
            var server_session_keypair = nacl.crypto_box_keypair_from_seed(server_session_seed);
            global.hybridd.xauth.session[session_hexkey].server_session_seckey = nacl.to_hex(server_session_keypair.boxSk);
            var server_session_pubkey = nacl.to_hex(server_session_keypair.boxPk);
            global.hybridd.xauth.session[session_hexkey].client_session_pubkey = secrets_json.client_session_pubkey;
            // create a server signing key
            var server_session_signpair = nacl.crypto_sign_keypair_from_seed(nacl.crypto_hash_sha256(server_session_seed));
            global.hybridd.xauth.session[session_hexkey].server_sign_seckey = nacl.to_hex(server_session_signpair.signSk);
            var server_sign_pubkey = nacl.to_hex(server_session_signpair.signPk);
            // calculate current session nonce from nonce1 + nonce2 + step
            var nonce1_dec = new Decimal(hex2dec.toDec(global.hybridd.xauth.session[session_hexkey].nonce1));
            var nonce2_dec = new Decimal(hex2dec.toDec(global.hybridd.xauth.session[session_hexkey].nonce2));
            var step_dec = new Decimal(session_step);
            // added using decimal-light plus function for looooong decimals
            var nonce_constr = nonce1_dec.plus(nonce2_dec).plus(step_dec);
            // convert nonce_construct integer string back into hex
            var nonce_convert = hex2dec.toHex(nonce_constr.toFixed(0).toString()); // Agent725 bugfix: cutoff disabled to ensure working nonce
            var nonce_conhex = nonce_convert.substr(2, nonce_convert.length);
            var current_nonce = nacl.from_hex(nonce_conhex);
            // prepare crypto packet variables (include server_sign_pubkey inside signed package for double check)
            var session_secrets = {server_sign_pubkey: server_sign_pubkey, server_session_pubkey: server_session_pubkey, current_nonce: nonce_conhex};
            if (DEBUG) { console.log('Server side xcrypt nonce: ' + nonce_conhex + ' CryptPacket data: ' + JSON.stringify(session_secrets)); }

            // using signing method
            var crypt_bin = nacl.encode_utf8(JSON.stringify(session_secrets));
            if (DEBUG) { console.log('Server side utf-8' + crypt_bin); }
            var sign_hex = nacl.to_hex(nacl.crypto_sign(crypt_bin, server_session_signpair.signSk));
            if (DEBUG) { console.log('Server side sign_hex' + sign_hex); }
            var client_session_pubkey = global.hybridd.xauth.session[session_hexkey].client_session_pubkey;
            var server_session_seckey = global.hybridd.xauth.session[session_hexkey].server_session_seckey;
            // this is where it seems to botch up
            // check crypto_box function for arguments and their formats
            // need to convert sign_hex and current_nonce using nacl.from_hex ???
            var sign_bin = nacl.from_hex(sign_hex);
            var client_session_pubkey_bin = nacl.from_hex(client_session_pubkey);
            var server_session_seckey_bin = nacl.from_hex(server_session_seckey);
            var crypt_hex = nacl.to_hex(nacl.crypto_box(sign_bin, current_nonce, client_session_pubkey_bin, server_session_seckey_bin));
            if (DEBUG) { console.log('Server side crypt_hex' + crypt_hex); }
            // send server_session_pubhex *encrypted with client_session_pubkey*
            xresponse = {error: 0, server_sign_pubkey: server_sign_pubkey, server_session_pubkey: server_session_pubkey, current_nonce: nonce_conhex, crhex: crypt_hex};
            if (DEBUG) { console.log('xresponse:' + JSON.stringify(xresponse)); }
          }
        }
      } else {
        if (typeof global.hybridd.xauth.session[session_hexkey] !== 'undefined') { delete global.hybridd.xauth.session[session_hexkey]; }
      }
    } catch (err) {
      console.log(' [!] x chan error.');
    }
  }

  // return object to router for delivery
  return xresponse;
}

function xcrypt (session_hexkey, session_step, txtdata) {
  // used after xauth to communicate with client
  // decrypts the datagram sent to ychan
  // (mirrored for client in hybriddcall.js )
  if (typeof global.hybridd.xauth.session[session_hexkey].server_session_seckey !== 'undefined' && !global.hybridd.xauth.session[session_hexkey].invalid) {
    var server_sign_pubkey = global.hybridd.xauth.session[session_hexkey].server_session_pubsign;
    var client_session_pubkey = nacl.from_hex(global.hybridd.xauth.session[session_hexkey].client_session_pubkey);
    var server_session_seckey = nacl.from_hex(global.hybridd.xauth.session[session_hexkey].server_session_seckey);
    // calculate current session nonce from nonce1 + nonce2 + step
    var nonce1_dec = new Decimal(hex2dec.toDec(global.hybridd.xauth.session[session_hexkey].nonce1));
    var nonce2_dec = new Decimal(hex2dec.toDec(global.hybridd.xauth.session[session_hexkey].nonce2));
    var step_dec = new Decimal(session_step);
    // added using decimal-light plus function for looooong decimals
    var nonce_constr = nonce1_dec.plus(nonce2_dec).plus(step_dec);
    // convert nonce_construct integer string back into hex
    var nonce_convert = hex2dec.toHex(nonce_constr.toFixed(0).toString()); // Agent725 bugfix: cutoff disabled to ensure working nonce
    var nonce_conhex = nonce_convert.substr(2, nonce_convert.length);
    // DEBUG: console.log('Server side xcrypt nonce: '+nonce_conhex+' Txt data: '+txtdata);
    var session_nonce = nacl.from_hex(nonce_conhex);
    var crypt_utf8 = nacl.encode_utf8(txtdata);
    // example encoding using crypto_box (needs to be double checked for correct keys used and place of parameters)
    var crypt_hex = nacl.to_hex(nacl.crypto_box(crypt_utf8, session_nonce, client_session_pubkey, server_session_seckey));
    // TODO: additional signing step against in-transport meddling acc. to nacl docs!!!
    return crypt_hex;
  } else {
    if (typeof global.hybridd.xauth.session[session_hexkey] !== 'undefined') { delete global.hybridd.xauth.session[session_hexkey]; }
    return null;
  }
}

function xplain (session_hexkey, session_step, encdata) {
  // decrypts the datagram sent to ychan
  // (mirrored for client in hybriddcall.js )
  if (!global.hybridd.xauth.session[session_hexkey].invalid) {
    if (typeof global.hybridd.xauth.session[session_hexkey].server_session_seckey !== 'undefined' && typeof encdata !== 'undefined' && encdata) {
      // get payload
      var crypt_bin = nacl.from_hex(functions.clean(encdata));
      // get keys and nonce
      var client_session_pubkey = nacl.from_hex(global.hybridd.xauth.session[session_hexkey].client_session_pubkey);
      var server_session_seckey = nacl.from_hex(global.hybridd.xauth.session[session_hexkey].server_session_seckey);
      // calculate current session nonce from nonce1 + nonce2 + step
      var nonce1_dec = new Decimal(hex2dec.toDec(global.hybridd.xauth.session[session_hexkey].nonce1));
      var nonce2_dec = new Decimal(hex2dec.toDec(global.hybridd.xauth.session[session_hexkey].nonce2));
      var step_dec = new Decimal(session_step);
      // added using decimal-light plus function for looooong decimals
      var nonce_constr = nonce1_dec.plus(nonce2_dec).plus(step_dec);
      // convert nonce_construct integer string back into hex
      var nonce_convert = hex2dec.toHex(nonce_constr.toFixed(0).toString()); // Agent725 bugfix: cutoff disabled to ensure working nonce
      // DEBUG: console.log('Server side xplain nonce: '+nonce_conhex+' Enc data: '+encdata);
      var session_nonce = nacl.from_hex(nonce_convert.substr(2, nonce_convert.length));
      // TODO: additional signing check against in-transport meddling acc. to nacl docs!!!
      // var crypt_msg = nacl.crypto_box_open(crypt_bin, nonceBin, senderPublicKeyBin, recipientSecretKeyBin);
      var payload = nacl.decode_utf8(nacl.crypto_box_open(crypt_bin, session_nonce, client_session_pubkey, server_session_seckey));
    } else {
      // dump session
      global.hybridd.xauth.session[session_hexkey].invalid = 1;
      payload = null;
    }
    return payload;
  } else {
    if (typeof global.hybridd.xauth.session[session_hexkey] !== 'undefined') { delete global.hybridd.xauth.session[session_hexkey]; }
    return null;
  }
}
