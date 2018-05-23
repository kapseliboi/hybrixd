// creates a unique seed for deterministic asset code
deterministic_ = {
  seedGenerator: function (asset) {
    // this salt need not be too long (if changed: adjust slice according to tests)
    var salt = '1nT3rN3t0Fc01NsB1nD5tH3cRyPt05Ph3R3t093Th3Rf0Rp30Pl3L1k3M34nDy0U';
    // slightly increases entropy by XOR obfuscating and mixing data with a key
    function xorEntropyMix (key, str) {
      var c = '';
      var k = 0;
      for (i = 0; i < str.length; i++) {
        c += String.fromCharCode(str[i].charCodeAt(0).toString(10) ^ key[k].charCodeAt(0).toString(10)); // XORing with key
        k++;
        if (k >= key.length) { k = 0; }
      }
      return c;
    }
    // return deterministic seed
    return UrlBase64.Encode(xorEntropyMix(nacl.to_hex(GL.usercrypto.user_keys.boxPk), xorEntropyMix(asset.split('.')[0], xorEntropyMix(salt, nacl.to_hex(GL.usercrypto.user_keys.boxSk))))).slice(0, -2);
  }
}
