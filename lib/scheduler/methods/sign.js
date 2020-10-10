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
   * sign publicKey 1 2       // open the message using the secret key and jump accordingly.
   * sign publicKey signature // verify the signature for the message and jump accordingly.
   */
exports.sign = message => function (p, key, signatureOrOnSuccess, onSuccessOrOnFail, onFail) {
  if (typeof message === 'string' && typeof key === 'string' && key.length === 64) {
    let publicKey = nacl.from_hex(key);
    message = nacl.from_hex(message);
    if (typeof signatureOrOnSuccess === 'string') {
      let verified = nacl.crypto_sign_verify_detached(message, signatureOrOnSuccess, publicKey);
      if (verified) return this.jump(p, onSuccessOrOnFail || 1, message); // jump onSuccess if message is verified for public key
      else if (typeof onFail === 'undefined') return p.fail('sign: unverified signature');
      else return this.jump(p, onFail, message); // jump onFail
    } else {
      let unpackedMessage = nacl.crypto_sign_open(message, publicKey);
      if (unpackedMessage === null) {
        message = nacl.to_hex(message);
        if (typeof onSuccessOrOnFail === 'undefined') return p.fail('sign: unverified signature');
        else return p.jump(onSuccessOrOnFail, message); // jump onFail
      } else {
        unpackedMessage = nacl.to_hex(unpackedMessage);
        unpackedMessage = baseCode.recode('hex', 'utf-8', unpackedMessage);
        return p.jump(signatureOrOnSuccess || 1, unpackedMessage); // jump onSuccess if message can be decoded by public key
      }
    }
  } else if (typeof message === 'string' && typeof key === 'string' && key.length === 128) {
    let secret = nacl.from_hex(key);
    message = baseCode.recode('utf-8', 'hex', message);
    message = nacl.from_hex(message);
    message = signatureOrOnSuccess
      ? nacl.crypto_sign_detached(message, secret)
      : message = nacl.crypto_sign(message, secret);

    message = nacl.to_hex(message);
    return p.next(message);
  } else return p.fail('sign: Sign error');
};
