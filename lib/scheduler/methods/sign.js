const baseCode = require('../../../common/basecode');

/**
   * Sign a message with a secret key or verify the signature for a public key.
   * @category Cryptography
   * @param {String} key - The secret key ot sign with of the public key to verify
   * @param {Boolean|String} [signature] - Indication to create a detached signature or a detached signature to verify.
   * @param {Boolean|String} [onSuccess] - Amount of instructions lines to jump on success.
   * @param {Boolean|String} [onFail] - Amount of instructions lines to jump on success.
   * @example
   * sign secretKey           // sign the message using the secret key
   * sign secretKey true      // create a signature for the message
   * sign publicKey 1 2          // open the message using the secret key and jump accordingly.
   * sign publicKey signature // verify the signature for the message and jump accordingly.
   */
exports.sign = message => function (p, key, signatureOrOnSuccess, onSuccessOrOnFail, onFail) {
  if (typeof message === 'string' && typeof key === 'string' && key.length === 64) {
    let publicKey = nacl.from_hex(key);
    message = nacl.from_hex(message);
    if (typeof signatureOrOnSuccess === 'string') {
      let verified = nacl.crypto_sign_verify_detached(message, signatureOrOnSuccess, publicKey);
      if (verified) {
        this.jump(p, onSuccessOrOnFail || 1, message); // jump onSuccess if message is verified for public key
      } else {
        this.jump(p, onFail || 1, message); // jump onFail
      }
    } else {
      let unpackedMessage = nacl.crypto_sign_open(message, publicKey);
      if (unpackedMessage === null) {
        message = nacl.to_hex(message);
        this.jump(p, onSuccessOrOnFail || 1, message); // jump onFail
      } else {
        unpackedMessage = nacl.to_hex(unpackedMessage);
        unpackedMessage = baseCode.recode('hex', 'utf-8', unpackedMessage);
        this.jump(p, signatureOrOnSuccess || 1, unpackedMessage); // jump onSuccess if message can be decoded by puclic key
      }
    }
  } else if (typeof message === 'string' && typeof key === 'string' && key.length === 128) {
    let secret = nacl.from_hex(key);
    message = baseCode.recode('utf-8', 'hex', message);
    message = nacl.from_hex(message);
    if (signatureOrOnSuccess) {
      message = nacl.crypto_sign_detached(message, secret);
    } else {
      message = nacl.crypto_sign(message, secret);
    }
    message = nacl.to_hex(message);
    this.next(p, 0, message);
  } else {
    this.fail(p, 1, 'Sign error');
  }
};
