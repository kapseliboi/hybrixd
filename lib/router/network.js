// hy_network.js -> implements functions to discover the hybrix network
//
// (c)2016 metasync r&d - Amadeus de Koning
//

// export every function
exports.process = process;

var fs = require("fs");

// functions start here

function process(request,xpath){
  if (xpath.length > 1) {
    // TODO: decision logic must be put inside its own network.js!
    if ( xpath[1] === "peers" ) {
      return network.getPeers();
    }
  }
  return {error:1, info:"Your request was not understood!"};
}


function getPeers() {
        // returns the current trusted peer list from ./network/peers.json


        var hy_response = JSON.parse(fs.readFileSync("../network/peers.json"));
        console.log(hy_response);

        return JSON.stringify(hy_response);
}
