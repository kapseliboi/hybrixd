const {safeDecompress} = require('../../../common/crypto/urlbase64');

const DEFAULT_SALT = 'F4E5D5C0B3A4FC83F4E5D5C0B3A4AC83F4E5D000B9A4FC83'; // TODO define in conf?
exports.DEFAULT_SALT = DEFAULT_SALT;

function permitNodeKeys (p) {
  const sessionID = p.getSessionID();
  if (sessionID === 1) return true;
  let permissions = p.getRecipe().permissions;
  if (typeof permissions !== 'object' || permissions === null) return false;
  return permissions.nodeKeys === true;
}

/**
  * Decrypt serialized data using a public and private keypair.
  * @param {Object} [keys] - Provide keys to decrypt. For root this will default to the node keys, which are not available to non root users.
  * @param {String} keys.publicKey -
  * @param {String} keys.secretKey -
  * @param {String} [salt] -
  * @param {Integer} [onSuccess=1] -
  * @param {Integer} [onFail] -
  * @example
  * decr {publicKey:$publicKey,secretKey:$secretKey}             // decrypts the data stream into a string
  * decr {publicKey:$publicKey,secretKey:$secretKey} 1 2         // decrypts the data stream, jump 1 on success, 2 on failure
  * decr {publicKey:$publicKey,secretKey:$secretKey} 'SALT' 1 2  // decrypts the data stream using specified salt
  * decr                                                         // encrypts the data stream using node keys (requires root!)
  */
exports.decr = data => function (p, keys, saltOrJump, successOrFailJump, failJump) {
  if (typeof data !== 'string') return p.fail('decr: Expected input to be a string!');
  // NOTE: encryption using node's keys is always allowed, even when session is non-root
  //       decryption using node keys is only allowed with root access or with permissions.nodeKeys:true
  const useNodeKeys = permitNodeKeys(p) && !(isNaN(keys) && typeof keys !== 'undefined');

  if (!useNodeKeys) { // non root or root using specific keys
    if (typeof keys !== 'object' || keys === null) return p.fail('decr: Expecting publicKey and secretKey.');
  } else { // shift parameters for root because we're using the node keys
    failJump = successOrFailJump;
    successOrFailJump = saltOrJump;
    saltOrJump = keys;
    keys = {publicKey: global.hybrixd.node.publicKey, secretKey: global.hybrixd.node.secretKey};
  }

  const re = /^[A-Fa-f0-9]*$/;
  if (typeof keys.publicKey !== 'string' || typeof keys.secretKey !== 'string' || !re.test(keys.publicKey) || !re.test(keys.secretKey)) {
    return p.fail('decr: Expected publicKey and secretKey in hexadecimal format!');
  } else if (keys.publicKey.length % 2 || keys.secretKey.length % 2) return p.fail('decr: Expected publicKey and secretKey in hexadecimal of even length!');

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
    const crypt_hex = nacl.from_hex(safeDecompress(data));
    const crypt_bin = nacl.crypto_box_open(crypt_hex, nonce_salt, user_keys.boxPk, user_keys.boxSk); // use nacl to create a crypto box containing the data
    result = nacl.decode_utf8(crypt_bin);
    jumpTarget = onSuccess;
  } catch (e) {
    if (typeof onFail === 'undefined') return p.fail('decr: failed to decrypt data.'); // fail if no onFail is defined
    else {
      jumpTarget = onFail;
      result = data;
    }
  }
  return p.jump(jumpTarget, result);
};
