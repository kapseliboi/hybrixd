// xauth.js -> implements secure connect exchange /x
//
// (c)2016 metasync r&d - Amadeus de Koning
//

// functions = require('./functions');
fs = require('fs');

// export every function
exports.serve = serve;

// functions start here

function serve (request, xpath) {
  var vresponse = {error: 0, info: 'No view to see here. Please move on.'};

  // add all allowed base paths here!
  allowed_views = ['login', 'interface', 'interface.dashboard', 'interface.assets'];

  if (xpath.length === 1) {
    return {info: 'Available views', count: allowed_views.length, data: allowed_views, error: 0, id: 'view'};
  } else if (xpath.length > 1) { // serve views
    // we test if xpath[1] is in the array of allowed_views
    // and with an exact match, send the string to readFileSync
    if (allowed_views.indexOf(xpath[1]) > -1) { // PRODUCTION MODE
      // if ( 1 || allowed_views.indexOf(xpath[1])>-1 ) {       // TEST MODE
      hy_json = fs.readFileSync('../modules/web-wallet/files/' + xpath[1] + '.json');
      vresponse = JSON.parse(hy_json);
      hy_json.type = 'application/json';
      // DEBUG
      console.log(' [i] returning view on request ' + JSON.stringify(xpath));
    }
  }
  return vresponse;
}
