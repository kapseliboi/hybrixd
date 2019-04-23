// nacl.js -> handles nacl
//
// (c)2018 internet of coins project - Rouke Pouw
//
const sequential = require('./sequential');

// export every function
exports.init = init;

function init (callbackArray) {
  const nacl_factory = require('../../common/crypto/nacl.js');
  nacl_factory.instantiate(function (naclinstance) {
    nacl = naclinstance; // nacl is a global that is initialized here.
    sequential.next(this.callbackArray);
  }.bind({callbackArray: callbackArray})
  );
}
