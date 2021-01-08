/**
   * Create or reproduce cryptographic signing keys.
   * @category Cryptography
   * @param {String} [secret] - The secret key to recreate a public key from.
   * @example
   * keys                              // generate a public and secret key pair
   * keys node                         // reproduce keys that belong to the node
   * keys '$secretKey'                 // reproduce public and secret keypair from $secretKey
   */
exports.keys = data => function (p, secretKey) {
  if (typeof secretKey === 'undefined') {
    const keys = nacl.crypto_sign_keypair();
    this.next(p, 0, {publicKey: nacl.to_hex(keys.signPk), secretKey: nacl.to_hex(keys.signSk)}); // create new key pair
  } else if (typeof secretKey === 'string' && secretKey.length === 128) {
    const re = /^[A-Fa-f0-9]*$/;
    if (re.test(secretKey)) {
      this.next(p, 0, {publicKey: secretKey.substr(64, 128), secretKey: secretKey}); // derive keypair from secret key (in NACL rather simple)
    } else {
      this.fail(p, 'Invalid secret key provided!');
    }
  } else if (p.getSessionID() === 1 && secretKey === 'node') { // ONLY ROOT MAY RETURN NODE KEYPAIR!
    this.next(p, 0, {publicKey: global.hybrixd.node.publicKey, secretKey: global.hybrixd.node.secretKey}); // return node keypair
  } else {
    this.fail(p, 'Could not return or generate key pair!');
  }
};
