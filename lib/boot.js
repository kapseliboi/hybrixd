// boot.js -> handles boot
//
// (c)2018 internet of coins project - Rouke Pouw
//

const router = require('./router/router');
const sequential = require('./util/sequential');
const fs = require('fs');

// export every function
exports.init = init;

function init (callbackArray) {
  if (fs.existsSync('../boot.json')) {
    global.hybrixd.logger(['info', 'boot'], 'Executing bootscript');
    router.route({url: 'command/exec/boot.json', sessionID: 1});
  } else {
    global.hybrixd.logger(['error', 'boot'], 'No bootscript found!');
  }

  sequential.next(callbackArray);
  initNodeKeypair();
}

// create/save or load node keypair
function initNodeKeypair () {
  let keysFile = '../hybrixd.keys';
  if (global.hybrixd.keysFile) {
    keysFile = '../' + global.hybrixd.keysFile;
    global.hybrixd.logger(['info', 'boot'], 'Using alternative keys file ' + global.hybrixd.keysFile);
  }
  if (fs.existsSync(keysFile)) {
    try {
      const keys = JSON.parse(fs.readFileSync(keysFile));
      // make available
      global.hybrixd.node.publicKey = keys.publicKey;
      global.hybrixd.node.secretKey = keys.secretKey;
      global.hybrixd.logger(['info', 'boot'], 'Initialized node keypair');
    } catch (e) {
      global.hybrixd.logger(['error', 'boot'], 'Failed to load node keypair from file!');
    }
  }
  if (!global.hybrixd.node.publicKey || !global.hybrixd.node.secretKey) {
    const keys = nacl.crypto_sign_keypair();
    global.hybrixd.node.publicKey = nacl.to_hex(keys.signPk);
    global.hybrixd.node.secretKey = nacl.to_hex(keys.signSk);
    fs.writeFileSync(keysFile, JSON.stringify({publicKey: global.hybrixd.node.publicKey, secretKey: global.hybrixd.node.secretKey}));
    global.hybrixd.logger(['info', 'boot'], 'Created new node keypair');
  }
}
