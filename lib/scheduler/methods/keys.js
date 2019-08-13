/**
   * Create or reproduce cryptographic signing keys.
   * @category Cryptography
   * @param {String} secret - The secret key to recreate a public key from.
   * @example
   * keys                              // generate a public and secret key pair
   * keys node                         // reproduce keys that belong to the node
   * keys 'HEX_ENTROPY_OF_128_CHARS'   // recreate the public key from a secret key
   */
exports.keys = data => function (p, secret) {
  if (typeof secret === 'undefined') {
    const keys = nacl.crypto_sign_keypair();
    const publicKey = nacl.to_hex(keys.signPk);
    const secretKey = nacl.to_hex(keys.signSk);
    this.next(p, 0, {public: publicKey, secret: secretKey}); // create keypair
  } else if (secret === 'string' && secret === 'node') {
    this.next(p, 0, {public: global.hybrixd.node.publicKey, secret: global.hybrixd.node.secretKey}); // create keypair
  } else if (secret === 'string' && secret.length === 128) {
    secret = nacl.from_hex(secret);
    const keys = nacl.sign.keyPair.fromSecretKey(secret).publicKey;
    const publicKey = nacl.to_hex(keys.signPk);
    const secretKey = nacl.to_hex(keys.signSk);
    this.next(p, 0, {public: publicKey, secret: secretKey}); // public key from secret key
  } else {
    this.fail(p, 1, 'Keys error');
  }
};
