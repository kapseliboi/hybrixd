// boot.js -> handles boot
//
// (c)2018 internet of coins project - Rouke Pouw
//

let router = require('./router');
let functions = require('./functions');
let fs = require('fs');

// export every function
exports.init = init;

function init (callbackArray) {
  if (fs.existsSync('../boot.json')) {
    console.log(' [i] boot sequence: executing bootscript');
    router.route({url: 'command/exec/boot.json', sessionID: 1});
  } else {
    console.log(' [!] boot sequence: no bootscript found!');
  }

  functions.sequential(callbackArray);
  initNodeKeypair();
}

// create/save or load node keypair
function initNodeKeypair () {
  let keysFile = '../hybrixd.keys';
  if (global.hybrixd.keysFile) {
    keysFile = '../' + global.hybrixd.keysFile;
    console.log(' [i] boot sequence: using alternative keys file ' + global.hybrixd.keysFile);
  }
  if (fs.existsSync(keysFile)) {
    try {
      const keys = JSON.parse(fs.readFileSync(keysFile));
      // test keys -> TODO: encode/recode to test if everything works!
      nacl.from_hex(keys.publicKey);
      nacl.from_hex(keys.secretKey);
      // make available
      global.hybrixd.node.publicKey = keys.publicKey;
      global.hybrixd.node.secretKey = keys.secretKey;
      console.log(' [i] boot sequence: initialized node keypair');
    } catch (e) {
      console.log(' [!] boot sequence: could not load node keypair from file!');
    }
  }
  if (!global.hybrixd.node.publicKey || !global.hybrixd.node.secretKey) {
    const keys = nacl.crypto_sign_keypair();
    global.hybrixd.node.publicKey = nacl.to_hex(keys.signPk);
    global.hybrixd.node.secretKey = nacl.to_hex(keys.signSk);
    fs.writeFileSync(keysFile, JSON.stringify({publicKey: global.hybrixd.node.publicKey, secretKey: global.hybrixd.node.secretKey}));
    console.log(' [i] boot sequence: created new node keypair');
  }
}
