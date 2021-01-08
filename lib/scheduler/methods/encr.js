const {safeCompress} = require('../../../common/crypto/urlbase64');
const {DEFAULT_SALT} = require('./decr');

/**
  * Encrypt and serialize data into an URL-safe format using a static key.
  * @param {Object} [keys] - Provide keys to encrypt. This will default to the node keys.
  * @param {String} keys.publicKey -
  * @param {String} keys.secretKey -
  * @param {String} [salt] -
  * @param {Integer} [onSuccess=1] -
  * @param {Integer} [onFail=1] -  * @example
  * encr {publicKey:$publicKey,secretKey:$secretKey}             // encrypts the data stream into an URL-safe format
  * encr {publicKey:$publicKey,secretKey:$secretKey} 1 2         // encrypts the data stream, jump 1 on success, 2 on failure
  * encr {publicKey:$publicKey,secretKey:$secretKey} 'SALT' 1 2  // encrypts the data stream using specified salt
  * encr                                                         // encrypts the data stream using node keys (requires root!)
  */
exports.encr = data => function (p, keys, saltOrJump, successOrFailJump, failJump) {
  // NOTE: encryption using node's keys is always allowed, even when session is non-root - decryption using node keys is only allowed with root access!
  if (typeof data !== 'string') return this.fail(p, 'decr: Expected input to be a string!');

  if (isNaN(keys) && typeof keys !== 'undefined') {
    if (typeof keys !== 'object' || keys === null) {
      return this.fail(p, 'encr: Expecting publicKey and secretKey.');
    }
  } else { // shift parameters for root as keys are not needed
    failJump = successOrFailJump;
    successOrFailJump = saltOrJump;
    saltOrJump = keys;
    keys = {publicKey: global.hybrixd.node.publicKey, secretKey: global.hybrixd.node.secretKey};
  }

  const re = /^[A-Fa-f0-9]*$/;
  if (typeof keys.publicKey !== 'string' || typeof keys.secretKey !== 'string' || !re.test(keys.publicKey) || !re.test(keys.secretKey)) {
    return this.fail(p, 'encr: Expected publicKey and secretKey in hexadecimal format!');
  } else if (keys.publicKey.length % 2 || (keys.secretKey.length % 2 && keys.secretKey.length < 64)) return this.fail(p, 'encr: Expected publicKey and secretKey in hexadecimal of even length!');

  let salt, onSuccess, onFail;
  if (isNaN(saltOrJump)) {
    salt = typeof saltOrJump === 'undefined' ? DEFAULT_SALT : saltOrJump;
    onSuccess = typeof successOrFailJump === 'undefined' ? 1 : successOrFailJump;
    onFail = failJump;
  } else {
    salt = DEFAULT_SALT;
    onSuccess = typeof saltOrJump === 'undefined' ? 1 : saltOrJump;
    onFail = successOrFailJump;
  }

  let result;
  let jumpTarget;
  try {
    const user_keys = {boxPk: nacl.from_hex(keys.publicKey), boxSk: nacl.from_hex(keys.secretKey.substr(0, 64))}; // cut off pubkey for boxSk!
    const nonce_salt = nacl.from_hex(salt);
    const crypt_utf8 = nacl.encode_utf8(data);
    const crypt_bin = nacl.crypto_box(crypt_utf8, nonce_salt, user_keys.boxPk, user_keys.boxSk);
    result = safeCompress(nacl.to_hex(crypt_bin));
    jumpTarget = onSuccess;
  } catch (e) {
    if (typeof onFail === 'undefined') {
      return p.fail('encr: failed to encrypt data.'); // fail if no onFail is defined
    } else {
      jumpTarget = onFail;
      result = data;
    }
  }
  return p.jump(jumpTarget, result);
};
