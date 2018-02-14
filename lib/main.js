//
// hybridd - main.js
//

// exports
exports.main = main;

// required standard libraries
var http = require("http");
var fs = require("fs");
var path = require("path");

recipes = require("./recipes");

recipes.init();


var ini = require("./ini");
Object.assign(global.hybridd, ini.parse(fs.readFileSync("../hybridd.conf", "utf-8"))); // merge object
if (fs.existsSync("../hybridd.local.conf")) { //  load local conf if available
  Object.assign(global.hybridd, ini.parse(fs.readFileSync("../hybridd.local.conf", "utf-8"))); // merge object
}

// ignore TLS certificate errors?
if(typeof global.hybridd.ignoreTLSerror !== 'undefined' && global.hybridd.ignoreTLSerror) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// router globals
last_xpath = "";

// required hybridd components
modules = require("./modules");
scheduler = require("./scheduler");
APIqueue = require("./APIqueue");

function main (route) {

  // scan and load modules
  modules.init();

  // create local server
  function onRequest (request, response) {

    request.sessionID = 1; // root access
    var res_data = route(request, modules);
    var P = JSON.parse(res_data);
    if (P['content'] === "html") { // Return data as html
      response.writeHead(200, {
        "Content-Type": "text/html",
        "Access-Control-Allow-Origin": "*"
      });
      response.write((P['data']));
    } else { // Default to raw json
      response.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      response.write(res_data);
    }
    response.end();
  }

  http.createServer(onRequest).listen(global.hybridd.restport, global.hybridd.restbind);

  // start the scheduler and API queue
  setTimeout(function () {

    scheduler.initialize();
    APIqueue.initialize();

  }, 1000);

  // create public server
  if (typeof global.hybridd.userport !== "undefined") {

    // create server
    function onUIRequest (request, response) {

      // deliver minimal ajax loader view by default
      if (request.url.indexOf("/api", 0, 4) === -1) {
        if (request.url.indexOf("/favicon.ico", 0, 12) !== -1) {
          var index_html = fs.readFileSync("../views/favicon.ico");
        } else if (request.url.indexOf("/files/", 0, 7) !== -1) {
          var filename = '../views/files/'+request.url.substr(7).replace('..','');
          if(fs.existsSync(filename)) {
            var index_html = fs.readFileSync(filename, "utf8");
          } else { var index_html = ''; }
        } else {
          var index_html = fs.readFileSync("../views/index.html", "utf8");
        }
        response.writeHead(200, {"Content-Type": "text/html"});
        response.write(index_html);
        response.end();
      } else {
        request.sessionID = 0; // public access
        request.url = request.url.substring(4);
        var res_data = route(request, modules);
        response.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        response.write(res_data);
        response.end();
      }

    }
    var userinterface = typeof global.hybridd.userinterface !== "undefined" ? global.hybridd.userinterface : "enabled";
    if (userinterface === "enabled") {
      var userport = typeof global.hybridd.userport !== "undefined" ? global.hybridd.userport : 8080;
      global.hybridd.uiServer = http.createServer(onUIRequest).listen(userport, global.hybridd.userbind);
      console.log(` [i] user interface running on: http://${global.hybridd.userbind}:${global.hybridd.userport}`);
    }
  }

  // periodically clean the request cache
  setInterval(function() {

    var maxentries = typeof global.hybridd.cacheidx !== "undefined" && global.hybridd.cacheidx > 0 ? global.hybridd.cacheidx : 100;
    var cachedarray = Object.keys(cached);
    if (cachedarray.length > maxentries) {

      for (var i = 0; i < cachedarray.length - maxentries; i++) {

        delete cached[cachedarray[i]];

      }

    }

  }, 1000);

}
