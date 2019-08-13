/**
   * Return information about the hybrix node
   * @category Cryptography
   * @param {String} request - The information you want to request
   * @example
   * node                    // returns the public key / node ID
   * node peers              // NOT YET SUPPORTED: returns public keys and node IDs of connected peers
   */
exports.node = () => function (p, request) {
  let info;
  switch (request) {
    case 'peers':
      info = 'NOT YET SUPPORTED!';
      break;
    default:
      info = global.hybrixd.node.publicKey;
      break;
  }
  this.next(p, 0, info);
};
