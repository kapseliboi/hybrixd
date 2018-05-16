// ychan encrypts an API query before sending it to the router
ychan = function (usercrypto, step, txtdata) {
  // decodes only from UrlBase64 for now, must be real usercrypto!
  var encdata = ychan_encode(usercrypto, step, txtdata);
  return 'y/' + encdata;
};

ychan_obj = function (usercrypto, step, encdata) {
  return JSON.parse(ychan_decode(usercrypto, step, encdata));
};

ychan_encode = function (usercrypto, step, txtdata) {
  var sessionData = document.querySelector('#session_data').textContent; // fetch relevant info from #session_data
  var sessionSecData = getGeneralSessionData(usercrypto, step, sessionData);

  var cryptUtf8 = nacl.encode_utf8(txtdata);
  // use nacl to create a crypto box containing the data
  var cryptBin = nacl.crypto_box(
    cryptUtf8,
    sessionSecData.sessionNonce,
    sessionSecData.serverSessionPubKey,
    sessionSecData.clientSessionSecKey
  );
  var encdata = nacl.to_hex(cryptBin);
  // DEBUG: console.log(sessionid+'/'+step+'/'+encdata); // this seems to work properly
  return sessionSecData.sessionID + '/' + step + '/' + UrlBase64.safeCompress(encdata);
};

ychan_decode = function (usercrypto, step, encdata) {
  var sessionData = document.querySelector('#session_data').textContent;
  if (encdata == null) {
    txtdata = null;
  } else {
    // decompress the data into a hex string
    encdata = UrlBase64.safeDecompress(encdata);
    var sessionSecData = getGeneralSessionData(usercrypto, step, sessionData);
    // TODO: add check for encdata.error:0?
    var hexdata = encdata;
    // DEBUG: alert('Ychan decode nonce conhex: '+nonce_conhex+' Hex data: '+hexdata);
    if (hexdata != null) {
      var cryptHex = nacl.from_hex(hexdata);
      // use nacl to create a crypto box containing the data
      var cryptBin = nacl.crypto_box_open(
        cryptHex,
        sessionSecData.sessionNonce,
        sessionSecData.serverSessionPubKey,
        sessionSecData.clientSessionSecKey
      );
      var txtdata = nacl.decode_utf8(cryptBin);
    } else { txtdata = null; }
  }
  return txtdata;
};

function getGeneralSessionData (usercrypto, step, sessionData) {
  var sessionObject = readSession(
    usercrypto.user_keys,
    usercrypto.nonce,
    sessionData,
    couldNotRetrieveSessionDataAlert
  );
  var sessionID = sessionObject.session_pubsign;
  // TODO: check server public signing of incoming object
  // DEBUG: alert('Incoming object: '+JSON.stringify(session_object)); // works!
  var serverSessionPubKey = nacl.from_hex(sessionObject.server_pubkey);
  var clientSessionSecKey = nacl.from_hex(sessionObject.session_seckey);
  // calculate current session nonce from nonce1 + nonce2 + step
  var nonce1Dec = new Decimal(hex2dec.toDec(sessionObject.nonce1));
  var nonce2Dec = new Decimal(hex2dec.toDec(sessionObject.nonce2));
  var stepDec = new Decimal(step);
  // added using decimal-light plus function for looooong decimals
  var nonceConstr = nonce1Dec.plus(nonce2Dec).plus(stepDec).toDecimalPlaces(64);
  // convert nonce_construct integer string back into hex
  var nonceConvert = hex2dec.toHex(nonceConstr.toFixed(0).toString());
  var nonceConhex = nonceConvert.substr(2, nonceConvert.length);
  var sessionNonce = nacl.from_hex(nonceConhex);

  return {
    sessionID,
    clientSessionSecKey,
    serverSessionPubKey,
    sessionNonce
  };
}

function couldNotRetrieveSessionDataAlert () {
  console.log('Error: Could not retrieve session data.');
}
