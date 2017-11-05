// hy_network.js -> implements functions to discover the hybrid network
//
// (c)2016 metasync r&d - Amadeus de Koning
//

// export every function
exports.getPeers = getPeers;

fs = require("fs");

// functions start here

function getPeers() {
	// returns the current trusted peer list from ./network/peers.json
	

	var hy_response = JSON.parse(fs.readFileSync("../network/peers.json"));
	console.log(hy_response);

	return JSON.stringify(hy_response);
}


