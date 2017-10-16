//
// hybridd - main.js
//

// exports
exports.main = main;

// required standard libraries
var http = require('http');
var fs = require('fs');
var path = require('path');

// required global configuration (TODO: encrypted storage option!)
var recipesdirectory = path.normalize(process.cwd()+'/../recipes/');
fs.readdir(recipesdirectory, function(err1, files){
  if(err1){
    console.log(' [!] warning: error when reading ' + err1);
  } else {
    // scan modules
    console.log(' [.] scanning recipes in '+recipesdirectory);
    files.sort().forEach( function(filename) {
      if( fs.existsSync( path.join(recipesdirectory+filename) ) ){
        entry = JSON.parse(fs.readFileSync( path.join(recipesdirectory+filename) , 'utf8'));
        if( typeof entry.symbol!='undefined' ) {
          global.hybridd.asset[ entry.symbol.toLowerCase() ] = entry;
          console.log(' [i] found recipe ' + filename);
        }
      } else {
        console.log(' [!] cannot load recipe ' + filename + '!');
      }
    });
  }
});

var ini = require('./ini');
Object.assign( global.hybridd, ini.parse(fs.readFileSync('../hybridd.conf', 'utf-8')) ); // merge object

// static configuration recipe's for essential functionality
//global.hybridd.asset['*']={module:'meta'};


// router globals
last_xpath = '';

// required hybridd components
modules = require('./modules');
scheduler = require('./scheduler');

function main(route) {
	// scan and load modules
	modules.init();
	
	// create local server
	function onRequest(request,response) {
    request.sessionID = 1;  // root access
		response.writeHead(200, {'Content-Type':'application/json'});
		response.write(route(request,modules));
		response.end();
	}
	
	http.createServer(onRequest).listen(global.hybridd.restport,global.hybridd.restbind);
	console.log(' [i] REST API running on: http://'+global.hybridd.restbind+':'+global.hybridd.restport);
	
	// start the scheduler
  setTimeout( function() { scheduler.initialize(); }, 1000);
  
	// create public server
  if(typeof global.hybridd.userport != 'undefined') {
    // create server
    function onUIRequest(request,response) {
      // deliver minimal ajax loader view by default
      if(request.url.indexOf('/api',0,4)==-1) {
        var index_html = fs.readFileSync('../views/index.html', 'utf8');
        response.writeHead(200, {'Content-Type':'text/html'});
        response.write(index_html);
        response.end();
      } else {
        request.sessionID = 0;  // public access
        request.url = request.url.substring(4);
        response.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
        response.write(route(request,modules));
        response.end();				
      }
    }
    var userport = (typeof global.hybridd.userport != 'undefined'?global.hybridd.userport:8080);
    http.createServer(onUIRequest).listen(userport,global.hybridd.userbind);
    console.log(' [i] user interface running on: http://'+global.hybridd.userbind+':'+global.hybridd.userport);
  }
  
  // periodically clean the request cache
  setInterval( function() {
    var maxentries = (typeof global.hybridd.cacheidx!='undefined' && global.hybridd.cacheidx>0 ? global.hybridd.cacheidx:100);
    var cachedarray = Object.keys(cached);
    if(cachedarray.length > maxentries) {
      for(var i=0;i<(cachedarray.length-maxentries);i++) {
        delete cached[ cachedarray[i] ];
      }
    }
  }, 1000);
}

