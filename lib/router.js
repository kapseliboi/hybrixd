// (c)2015-2016 Internet of Coins / Metasync / Joachim de Koning
// hybridd - router.js
// Routes incoming path array xpath to asynchronous processes.

// required libraries in this context
// _ = require('./underscore');
functions = require("./functions");
LZString = require("./crypto/lz-string");
UrlBase64 = require("./crypto/urlbase64");

// routing submodules (keep in alphabetical order)
asset = require("./asset");
list = require("./list");
//network = require("./network");
proc = require("./proc");
source = require("./source");
view = require("./view");
xauth = require("./xauth");

url = require("url");

// exports
exports.route = route;

// routing handler 
// reserved letters: a asset, f function, n network info, p proc, s source, v views, x xauth

function route(request) {
	// parse path array (added by AmmO for global xpath array, do not remove)
	if(typeof request.url == "string") {
		var xpath = request.url.split("/"); // create xpath array
		for (var i = 0; i < xpath.length; i++) { 	
			if (xpath[i] == "") { xpath.splice(i,1); i--; } else { xpath[i] = decodeURIComponent(xpath[i]); } // prune empty values and clean vars
		}

		// default error message
		var result = {error:1, info:"Your request was not understood!"};		// route path handling (console.log only feedbacks same route once)
		if (JSON.stringify(xpath) != JSON.stringify(last_xpath) && xpath[0] != "y" && xpath[0] != "z") { 
			console.log(" [.] routing request "+JSON.stringify(xpath));
		}
		last_xpath = xpath;

		// routing logic starts here
		if (xpath.length == 0) {
			result = {info:" *** Welcome to the hybridd JSON REST-API. Please enter a path. For example: /asset/btc/command/help *** ", error:0, id:null};
		} else {
			// PLEASE KEEP IN ALPHABETICAL ORDER FOR EASY REFERENCE!!!
			// routing assets
			if(xpath[0] == "a" || xpath[0] == "asset") {
				result = asset.process(request,xpath);
			}
      // instant lists
			if(xpath[0] == "l" || xpath[0] == "list") {
				result = list.process(request,xpath);
			}
			// routing network info
			if (xpath[0] == "n" || xpath[0] == "net" || xpath[0] == "network") {
				if (xpath.length > 1) {
					// TODO: decision logic must be put inside its own network.js!
					if ( xpath[1] == "peers" ) {
						result = network.getPeers();
					}
				}
			}
			// routing processes
			if (xpath[0] == "p" || xpath[0] == "proc") { 
				result = proc.process(request,xpath);
			}
			// routing sources
			if (xpath[0] == "s" || xpath[0] == "source") {
				result = source.process(request,xpath);
			}
			// routing views
			if (xpath[0] == "v" || xpath[0] == "view") {
				result = view.serve(request,xpath);
			}
			// routing xauth
			if (xpath[0] == "x" || xpath[0] == "xauth") {
				if(xpath.length > 1) {
					result = xauth.xauth(request,xpath);
				}
			}
			// routing y crypt channel
			if (xpath[0] == "y" || xpath[0] == "ychan") {
				if(xpath.length > 3) { // GET must carry payload, or '0' for POST
					try {
						request.url = xauth.xplain(xpath[1],xpath[2], UrlBase64.safeDecompress(xpath[3]) );						
						// do a nested route on the decoded GET/POST to return plaintext result (encrypt the result, and put in a JSON object)
            request.sessionID = xpath[1];
            request.nonce = xpath[2];
						result = UrlBase64.safeCompress( xauth.xcrypt(xpath[1],xpath[2], route(request,modules) ) );
					} catch (err) {
						result = "";
					}
				}
			}
			// routing z compression channel
			if (xpath[0] == "z" || xpath[0] == "zchan") {
				if(xpath.length >= 3) { // GET must carry payload, or '0' for POST
					try {
						// decompress incoming request
						request.url = LZString.decompressFromEncodedURIComponent( xauth.xplain(xpath[1],xpath[2], UrlBase64.safeDecompress(xpath[3])) );
						// do a nested route on the decoded GET/POST, compress result, encrypt it
            request.sessionID = xpath[1];
            request.nonce = xpath[2];
						result = UrlBase64.safeCompress( xauth.xcrypt(xpath[1],xpath[2], LZString.compressToEncodedURIComponent(route(request,modules)) ) );
					} catch (err) {
						result = "";
					}
				}
			}		
			// when shorthand is used, cull output data by removing result.info
			if(typeof xpath[0] == "undefined" || xpath[0].length<=1) {
				result.info = undefined;
			}
		}
		// return stringified data object
		return JSON.stringify(result);
	} 
		return "";
	
}

