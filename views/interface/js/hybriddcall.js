var U = utils;

var TIMEOUT = 30000;

// ychan encrypts an API query before sending it to the router
ychan = function(usercrypto,step,txtdata) {
  // decodes only from UrlBase64 for now, must be real usercrypto!
  var encdata = ychan_encode(usercrypto,step,txtdata)
  return 'y/'+encdata;
}

ychan_obj = function(usercrypto,step,encdata) {
  return JSON.parse(ychan_decode(usercrypto,step,encdata));
}

ychan_encode = function(usercrypto, step, txtdata) {
  var sessionData = $('#session_data').text();
  // fetch relevant info from #session_data
  var session_object = readSession(usercrypto.user_keys, usercrypto.nonce, sessionData, couldNotRetrieveSessionDataAlert);
  var sessionid = session_object.session_pubsign;
  // alert('Session object: '+JSON.stringify(session_object)); // works!
  var server_session_pubkey = nacl.from_hex(session_object.server_pubkey);
  var client_session_seckey = nacl.from_hex(session_object.session_seckey);
  // calculate current session nonce from nonce1 + nonce2 + step
  var nonce1_dec = new Decimal(hex2dec.toDec(session_object.nonce1));
  var nonce2_dec = new Decimal(hex2dec.toDec(session_object.nonce2));
  var step_dec = new Decimal(step);
  // added using decimal-light plus function for looooong decimals
  var nonce_constr = nonce1_dec.plus(nonce2_dec).plus(step_dec).toDecimalPlaces(64);
  // convert nonce_construct integer string back into hex
  var nonce_convert = hex2dec.toHex(nonce_constr.toFixed(0).toString());
  var nonce_conhex = nonce_convert.substr(2,nonce_convert.length);
  // DEBUG: alert('Nonce conhex: '+nonce_conhex+' Text data: '+txtdata);
  var session_nonce = nacl.from_hex( nonce_conhex );
  var crypt_utf8 = nacl.encode_utf8(txtdata);
  // use nacl to create a crypto box containing the data
  var crypt_bin = nacl.crypto_box(crypt_utf8, session_nonce, server_session_pubkey, client_session_seckey);
  var encdata = nacl.to_hex(crypt_bin);
  // DEBUG: console.log(sessionid+'/'+step+'/'+encdata); // this seems to work properly
  return sessionid+'/'+step+'/'+UrlBase64.safeCompress(encdata);
}

ychan_decode = function(usercrypto,step,encdata) {
  var sessionData = $('#session_data').text();
  if(encdata==null) {
    txtdata=null;
  } else {
    // decompress the data into a hex string
    encdata = UrlBase64.safeDecompress(encdata);
    // fetch relevant info from #session_data
    var session_object = readSession(usercrypto.user_keys, usercrypto.nonce, sessionData, couldNotRetrieveSessionDataAlert);
    // TODO: check server public signing of incoming object
    // DEBUG: alert('Incoming object: '+JSON.stringify(session_object)); // works!
    var server_session_pubkey = nacl.from_hex(session_object.server_pubkey);
    var client_session_seckey = nacl.from_hex(session_object.session_seckey);
    // calculate current session nonce from nonce1 + nonce2 + step
    var nonce1_dec = new Decimal(hex2dec.toDec(session_object.nonce1));
    var nonce2_dec = new Decimal(hex2dec.toDec(session_object.nonce2));
    var step_dec = new Decimal(step);
    // added using decimal-light plus function for looooong decimals
    var nonce_constr = nonce1_dec.plus(nonce2_dec).plus(step_dec).toDecimalPlaces(64);
    // convert nonce_construct integer string back into hex
    var nonce_convert = hex2dec.toHex(nonce_constr.toFixed(0).toString());
    var nonce_conhex = nonce_convert.substr(2,nonce_convert.length);
    var session_nonce = nacl.from_hex(nonce_conhex);
    //DEBUG: alert('Ychan decode enc data: '+JSON.stringify(encdata));
    // TODO: add check for encdata.error:0?
    var hexdata = encdata;
    // DEBUG: alert('Ychan decode nonce conhex: '+nonce_conhex+' Hex data: '+hexdata);
    if(hexdata!=null) {
      var crypt_hex = nacl.from_hex(hexdata);
      // use nacl to create a crypto box containing the data
      var crypt_bin = nacl.crypto_box_open(crypt_hex, session_nonce, server_session_pubkey, client_session_seckey);
      var txtdata = nacl.decode_utf8(crypt_bin);
    } else { txtdata = null; }
  }
  return txtdata;
}

//zchan
// zchan compresses an API query before sending it to the router
// usercryptography is handled by ychan, and keys are passed
zchan = function(usercrypto,step,txtdata) {
  var encdata = ychan_encode(usercrypto, step, zchan_encode(usercrypto, step, txtdata));
  return 'z/'+encdata;
}
zchan_obj = function(usercrypto,step,encdata) {
  try {
    return JSON.parse(zchan_decode(usercrypto,step,encdata));
  } catch(err) {
    return false;
  }
}
zchan_encode = function(usercrypto,step,txtdata) {
  return LZString.compressToEncodedURIComponent(txtdata);
}
zchan_decode = function(usercrypto,step,encdata) {
  return LZString.decompressFromEncodedURIComponent(ychan_decode(usercrypto,step,encdata));
}

fromInt = function(input,factor) {
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.times((f>1?'0.'+new Array(f).join('0'):'')+'1');
}

toInt = function(input,factor) {
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.times('1'+(f>1?new Array(f+1).join('0'):''));
}

/* TO BE DEPRECATED */
formatFloat = function(n) {
  return String(Number(n));
}

isToken = function(symbol) {
  return (symbol.indexOf('.')!==-1?1:0);
}

// activate (deterministic) code from a string
activate = function(code) {
  if(typeof code == 'string') {
    eval('var deterministic = (function(){})(); '+code);	// interpret deterministic library into an object
    return deterministic;
  } else {
    console.log('Cannot activate deterministic code!')
    return function(){};
  }
}

function mkAssetDetailsStream (init, deterministic, submode, entry, fullmode) {
  var url = 'a/' + entry + '/details/';
  var seed = deterministicSeedGenerator(entry);
  var keys = deterministic.keys( {symbol: entry, seed, mode:submode});
  var addr = deterministic.address( Object.assign(keys, {mode: submode}));
  var mode = R.prop(entry, assets.mode);

  // TODO: RM globals
  assets.mode[entry] = fullmode;
  assets.seed[entry] = seed;
  assets.keys[entry] = keys;
  assets.addr[entry] = addr;

  var assetDetailsStream = Rx.Observable
      .fromPromise(hybriddcall({r: url, z: 0}))
      .filter(R.propEq('error', 0))
      .map(R.merge({r: '/s/deterministic/hashes', z: true}));

  var assetDetailsResponseStream = assetDetailsStream
      .flatMap(function (properties) {
        return Rx.Observable
          .fromPromise(hybriddReturnProcess(properties));
      });

  // TODO: Return Observable back to interface.js
  return assetDetailsResponseStream
    .map(updateGlobalAssets(init, entry, seed, keys, addr, mode));
}

function updateGlobalAssets (init, entry, seed, keys, addr, mode) {
  return function (assetDetailsResponse) {
    var assetDetails = R.mergeAll([
      init,
      R.prop('data', assetDetailsResponse),
      {
        mode,
        seed,
        keys,
        address: addr
      }
    ]);
    return assetDetails
  };
}

initAsset = function (entry, fullmode, init) {
  var mode = fullmode.split('.')[0];
  var submode = fullmode.split('.')[1];
  // if the deterministic code is already cached client-side
  if (typeof assets.modehashes[mode] !== 'undefined') {
    var modeHashStream = storage.Get_(assets.modehashes[mode] + '-LOCAL');
    return modeHashStream
      .flatMap(getDeterministicStuff(entry, mode, submode, fullmode, init));
  }
};

function initializeDetermisticAndMkDetailsStream (dcode, submode, entry, fullmode, init) {
  var deterministic = deterministic = activate(LZString.decompressFromEncodedURIComponent(dcode));
  return mkAssetDetailsStream(init, deterministic, submode, entry, fullmode);
}

// Currently breaking!
function resetModes (init, mode, submode, entry, fullmode) {
  // TODO: STREAMIFY!!!
  hybriddcall({r: 's/deterministic/code/' + mode, z: 0}, function (object) {
    if(typeof object.error !== 'undefined' && object.error === 0) {
      // decompress and make able to run the deterministic routine
      storage.Set(assets.modehashes[mode]+'-LOCAL', object.data);
      mkAssetDetailsStream(init, object.data, submode, entry, fullmode);
    }
  });
  return true;
}

function getDeterministicStuff (entry, mode, submode, fullmode, init) {
  return function (dcode) {
    return R.not(R.isNil(dcode))
      ? initializeDetermisticAndMkDetailsStream(dcode, submode, entry, fullmode, init)
      : function () {
        storage.Del(assets.modehashes[mode]+'-LOCAL');
        return resetModes(init, mode);
      }
  }
}

// creates a unique user storage key for storing information and settings
userStorageKey = function (key) {
  return nacl.to_hex( sha256(GL.usercrypto.user_keys.boxPk) )+'-'+String(key);
}

userEncode = function(data) {
  var nonce_salt = nacl.from_hex('F4E5D5C0B3A4FC83F4E5D5C0B3A4AC83F4E5D000B9A4FC83');
  var crypt_utf8 = nacl.encode_utf8( JSON.stringify(data) );
  var crypt_bin = nacl.crypto_box(crypt_utf8, nonce_salt, GL.usercrypto.user_keys.boxPk, GL.usercrypto.user_keys.boxSk);
  return UrlBase64.safeCompress( nacl.to_hex(crypt_bin) );
}

userDecode = function(data) {
  var object = null;
  if(data!=null) {
    var nonce_salt = nacl.from_hex('F4E5D5C0B3A4FC83F4E5D5C0B3A4AC83F4E5D000B9A4FC83');
    var crypt_hex = nacl.from_hex( UrlBase64.safeDecompress(data) );
    // use nacl to create a crypto box containing the data
    var crypt_bin = nacl.crypto_box_open(crypt_hex, nonce_salt, GL.usercrypto.user_keys.boxPk, GL.usercrypto.user_keys.boxSk);
    try {
      object = JSON.parse( nacl.decode_utf8(crypt_bin) );
    } catch(err) {
      object = null;
    }
  }
  return object;
}

// creates a unique seed for deterministic asset code
function deterministicSeedGenerator(asset) {
  // this salt need not be too long (if changed: adjust slice according to tests)
  var salt = '1nT3rN3t0Fc01NsB1nD5tH3cRyPt05Ph3R3t093Th3Rf0Rp30Pl3L1k3M34nDy0U';
  // slightly increases entropy by XOR obfuscating and mixing data with a key
  function xorEntropyMix(key, str) {
    var c = '';
    var k = 0;
    for(i=0; i<str.length; i++) {
      c += String.fromCharCode(str[i].charCodeAt(0).toString(10) ^ key[k].charCodeAt(0).toString(10)); // XORing with key
      k++;
      if(k>=key.length) {k=0;}
    }
    return c;
  }
  // return deterministic seed
  return UrlBase64.Encode( xorEntropyMix( nacl.to_hex(GL.usercrypto.user_keys.boxPk), xorEntropyMix(asset.split('.')[0], xorEntropyMix(salt,nacl.to_hex(GL.usercrypto.user_keys.boxSk)) ) ) ).slice(0, -2);
}


// hybriddcall makes direct calls to hybridd, waits for the process,
// and returns the data to your specified element in the DOM
// 		- properties should be passed containing: URL, crypto-object, request method ychan or zchan (optional)
// 		- passing the browser element to update is optional, or can be passed a 0, which is no element
// 		- the function postfunction runs after a successful call to hybridd, while waitfunction runs regularly while the hybridd process is completing
progressbar = function(size) { return '<div class="progress-radial" proc-data=""'+(size>0?' style="font-size: '+size+'em;" size="'+size+'"':'')+'><div class="dot" style="'+(size>0?'width:'+size+'px;height:'+size+'px;"':'width:1em;height:1em;overflow:visible;"')+'"></div><svg style="margin-left:-'+(size>0?size+'px':'1em')+';" viewbox="0 0 80 80" height="120" width="120"><circle cx="40" cy="40" r="35" fill="rgba(255,255,255,0.0)" stroke="#BBB" stroke-width="10" stroke-dasharray="239" stroke-dashoffset="239" /></svg></div>'; }

hybriddcall = function (properties) {
  var urltarget = properties.r;
  var usercrypto = GL.usercrypto;
  var step = nextStep();
  var reqmethod = typeof properties.z === 'undefined' && properties.z;
  var urlrequest = path + zchanOrYchanEncryptionStr(reqmethod, usercrypto)(step)(urltarget);

  return fetch(urlrequest)
    .then(r => r.json()
          .then(encodedResult => zchanOrYchanEncryptionObj(reqmethod, usercrypto)(step)(encodedResult)) // TODO: Factor out decoding!!!
          .catch(e => console.log('Error hybriddCall', e)))
    .catch(e => console.log('Error hybriddCall', e));
}

// proc request helper function
hybriddReturnProcess = function (properties) {
  var processStep = nextStep();
  var reqmethod = typeof properties.z === 'undefined' && properties.z;
  var urlrequest = path + zchanOrYchanEncryptionStr(reqmethod, GL.usercrypto)(processStep)('p/' + properties.data);

  return fetch(urlrequest)
    .then(r => r.json()
          .then(r => zchanOrYchanEncryptionObj(reqmethod, GL.usercrypto)(processStep)(r)) // TODO: Factor out decoding!!!
          .catch(e => console.log('Error hybriddCall', e)))
    .catch(e => console.log('Error hybriddCall', e));
}

hybridd = {
  mkHybriddCallStream: function (url) {
    var hybriddCallStream = Rx.Observable
        .fromPromise(hybriddcall({r: url, z: true}))
        .filter(R.propEq('error', 0))
        .map(R.merge({r: url, z: true}));

    var hybriddCallResponseStream = hybriddCallStream
        .flatMap(function (properties) {
          return Rx.Observable
            .fromPromise(hybriddReturnProcess(properties));
      });

    return hybriddCallResponseStream;
  }
}

function errorHybriddCall (success, properties) {
  return function (object) {
    maybeRunFunctionWithArgs(success, { properties }, object, '[read error]');
  }
}

function successHybriddCall (properties, urltarget, reqmethod, usercrypto, step, success, waitfunction) {
  return function (encodedResult) {
    var decodedResultObj = zchanOrYchanEncryptionObj(reqmethod, usercrypto)(step)(encodedResult);
    var objectWithProperties = Object.assign(properties, decodedResultObj);
    hybriddproc(urltarget, usercrypto, reqmethod, objectWithProperties, success, waitfunction, 0);
  }
}

function hybriddProcError (callback, properties) {
  return function (object) {
    maybeRunFunctionWithArgs(callback, properties, object, '?');
  }
}

function successHybriddProc (urltarget, usercrypto, reqmethod, properties, callback, waitfunction, processStep, cnt) {
  return function (result) {
    var objectContainingRequestedData = zchanOrYchanEncryptionObj(reqmethod, usercrypto)(processStep)(result);
    function retryHybriddProcess () {
      hybriddproc(urltarget, usercrypto, reqmethod, properties, callback, waitfunction, cnt);
    }
    maybeSuccessfulDataRequestRender(properties, callback, waitfunction, cnt, retryHybriddProcess, objectContainingRequestedData);
  }
}

function couldNotRetrieveSessionDataAlert () {
  console.log('Error: Could not retrieve session data.');
}

function zchanOrYchanEncryptionStr (requestMethod, userCrypto) {
  return function (step) {
    return function (str) {
      var encryptionMethod = requestMethod ? zchan : ychan;
      return encryptionMethod(userCrypto, step, str);
    }
  }
}

function zchanOrYchanEncryptionObj (requestMethod, userCrypto) {
  return function (step) {
    return function (obj) {
      var encryptionMethod = requestMethod ? zchan_obj : ychan_obj;
      return encryptionMethod(userCrypto, step, obj);
    }
  }
}

function maybeSuccessfulDataRequestRender (properties, postfunction, waitfunction, cnt, retryHybriddProcess, objectContainingRequestedData) {
  var hasCorrectProgressStatus = objectContainingRequestedData.progress < 1 && objectContainingRequestedData.stopped == null;
  var continuation = hasCorrectProgressStatus ? waitfunction : postfunction;

  if (hasCorrectProgressStatus) setTimeout(retryHybriddProcess, (cnt * 3000));
  maybeRunFunctionWithArgs(continuation, properties, objectContainingRequestedData);
}

renderDataInDom = function (element, maxLengthSignificantDigits, data) {
  var formattedBalanceStr = formatFloatInHtmlStr(data, maxLengthSignificantDigits);

  if ($(element).html() === '?') {
    $(element + ' .progress-radial').fadeOut('slow', function () {
      renderElementInDom(element, formattedBalanceStr);
    });
  } else {
    renderElementInDom(element, formattedBalanceStr);
  }
}

function renderElementInDom (query, data) {
  $(query).html(data);
}

function maybeRunFunctionWithArgs (fn, props, dataFromServer) {
  if (typeof fn === 'function') {
    var pass = typeof props.pass !== 'undefined' ? props.pass : null;
    fn(dataFromServer, pass);
  }
}

function formatFloatInHtmlStr (amount, maxLengthSignificantDigits) {
  function regularOrZeroedBalance (balanceStr, maxLen) {
    var decimalNumberString = balanceStr.substring(2).split('');
    var zeros = '0.' + R.takeWhile((n) => n === '0', decimalNumberString).reduce((baseStr, n) => baseStr + n, ''); // use R.takeWhile later!
    var numbers = balanceStr.replace(zeros, '');
    var defaultOrFormattedBalanceStr = balanceStr.includes('0.') ? mkAssetBalanceHtmlStr(zeros, numbers, maxLen) : balanceStr;

    return defaultOrFormattedBalanceStr;
  }

  function mkAssetBalanceHtmlStr (zeros_, numbers_, maxLen) {
    var emptyOrBalanceEndHtmlStr = numbers_.length <= maxLen ? '' : '<span class="balance-end mini-balance">&hellip;</span>';
    var numbersFormatted = numbers_.slice(0, maxLen);
    return '<span class="mini-balance">' + zeros_ + '</span>' + numbersFormatted + emptyOrBalanceEndHtmlStr;
  }

  if (isNaN(amount)) {
    return '?';
  } else {
    var balance = String(Number(amount));
    return balance === '0' ? '0' : regularOrZeroedBalance(balance, maxLengthSignificantDigits);
  }
}
