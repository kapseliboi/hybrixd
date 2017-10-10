// xauth.js -> implements secure connect exchange /x
//
// (c)2016 metasync r&d - Amadeus de Koning
//

//functions = require('./functions');
fs = require('fs');

// export every function
exports.serve = serve;

// functions start here

function serve(request) {
	var vresponse = {error:0, info:'No view to see here. Please move on.'};
	// serve views
	if (xpath.length > 1) {
		// add all allowed base paths here!
		allowed_views = ['login','interface','interface.dashboard','interface.assets'];
		// we test if xpath[1] is in the array of allowed_views
		// and with an exact match, send the string to readFileSync
		if (allowed_views.indexOf(xpath[1])>-1 ) { 		// PRODUCTION MODE
		//if ( 1 || allowed_views.indexOf(xpath[1])>-1 ) { 	// TEST MODE
			hy_json = fs.readFileSync('../views/'+xpath[1]+'.json');
			vresponse = JSON.parse(hy_json);
      // DEBUG
  		console.log(' [i] returning view on request '+JSON.stringify(xpath));
		}
		
	}
	return vresponse;
}



