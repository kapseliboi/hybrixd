fromInt = function (input, factor) {
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.times((f > 1 ? '0.' + new Array(f).join('0') : '') + '1');
};

toInt = function (input, factor) {
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.times('1' + (f > 1 ? new Array(f + 1).join('0') : ''));
};

/* TO BE DEPRECATED */
formatFloat = function (n) {
  return String(Number(n));
};

isToken = function (symbol) {
  return (symbol.indexOf('.') !== -1 ? 1 : 0);
};

progressbar = function (size) { return '<div class="progress-radial" proc-data=""' + (size > 0 ? ' style="font-size: ' + size + 'em;" size="' + size + '"' : '') + '><div class="dot" style="' + (size > 0 ? 'width:' + size + 'px;height:' + size + 'px;"' : 'width:1em;height:1em;overflow:visible;"') + '"></div><svg style="margin-left:-' + (size > 0 ? size + 'px' : '1em') + ';" viewbox="0 0 80 80" height="120" width="120"><circle cx="40" cy="40" r="35" fill="rgba(255,255,255,0.0)" stroke="#BBB" stroke-width="10" stroke-dasharray="239" stroke-dashoffset="239" /></svg></div>'; };

// creates a unique user storage key for storing information and settings
userStorageKey = function (key) {
  return nacl.to_hex(sha256(GL.usercrypto.user_keys.boxPk)) + '-' + String(key);
};

userEncode = function (data) {
  var nonce_salt = nacl.from_hex('F4E5D5C0B3A4FC83F4E5D5C0B3A4AC83F4E5D000B9A4FC83');
  var crypt_utf8 = nacl.encode_utf8(JSON.stringify(data));
  var crypt_bin = nacl.crypto_box(crypt_utf8, nonce_salt, GL.usercrypto.user_keys.boxPk, GL.usercrypto.user_keys.boxSk);
  return UrlBase64.safeCompress(nacl.to_hex(crypt_bin));
};

userDecode = function (data) {
  var object = null;
  if (data != null) {
    var nonce_salt = nacl.from_hex('F4E5D5C0B3A4FC83F4E5D5C0B3A4AC83F4E5D000B9A4FC83');
    var crypt_hex = nacl.from_hex(UrlBase64.safeDecompress(data));
    // use nacl to create a crypto box containing the data
    var crypt_bin = nacl.crypto_box_open(crypt_hex, nonce_salt, GL.usercrypto.user_keys.boxPk, GL.usercrypto.user_keys.boxSk);
    try {
      object = JSON.parse(nacl.decode_utf8(crypt_bin));
    } catch (err) {
      object = null;
    }
  }
  return object;
};

mapReplaceEntries = function (map) {
  var keys = Object.keys(map);
  var newMap = keys.map(function (key) {
    return key.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
  });

  return function (str) {
    return str.replace(new RegExp(newMap.join('|'), 'g'), function (s) {
      return map(s);
    });
  };
};
