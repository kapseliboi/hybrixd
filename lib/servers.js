// servers.js -> implements functions to init servers
//
// (c)2018 internet of coins project - Rouke Pouw
//

var http = require("http");
var router = require("./router");

function onRequest (request, response) {

  request.sessionID = 1; // root access
  var res_data = router.route(request, modules);
  var P;
  try{
    P = JSON.parse(res_data);
  }catch(e){
    console.log(' [!] encountered illegal json: ['+res_data+']');
    response.writeHead(500);
    response.end();
    return;
  }
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

var local = {
  init : function(callbackArray){
    var restinterface = typeof global.hybridd.restinterface !== "undefined" ? global.hybridd.restinterface : "enabled";
    if(restinterface==="enabled" && !global.hybridd.restServer){

      // When the server is listening provide a callback to continue next callback sequentially
      global.hybridd.restServer = http.createServer(onRequest);

      global.hybridd.restServer.listen(global.hybridd.restport, global.hybridd.restbind,undefined, function(){
        console.log(` [i] local rest interface running on: http://${global.hybridd.restbind}:${global.hybridd.restport}`);
        functions.sequential(callbackArray);
      }.bind({callbackArray}));
    }else{ // No server to be initialized, callback directly
      functions.sequential(callbackArray);
    }
  },

  close : function(callbackArray){
    var restinterface = typeof global.hybridd.restinterface !== "undefined" ? global.hybridd.restinterface : "enabled";
    if(restinterface==="enabled" && global.hybridd.restServer && global.hybridd.restServer.listening){
      global.hybridd.restServer.close(function(){
        console.log("[i] rest interface has been closed.");
        functions.sequential(callbackArray);
      });
    }else{ // No server to be initialized, callback directly
      functions.sequential(callbackArray);
    }
  },
  listen :  function(callbackArray){
    global.hybridd.restServer.listen(global.hybridd.restport, global.hybridd.restbind,undefined, function(){
      console.log(` [i] local rest interface running on: http://${global.hybridd.restbind}:${global.hybridd.restport}`);
      functions.sequential(callbackArray);
    }.bind({callbackArray}));
  }
}

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
    var res_data = router.route(request, modules);
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    response.write(res_data);
    response.end();
  }

}

var public = {

  init: function(callbackArray){
    if (typeof global.hybridd.userport !== "undefined") {

      // create server
      var userinterface = typeof global.hybridd.userinterface !== "undefined" ? global.hybridd.userinterface : "enabled";
      if (userinterface === "enabled") {
        var userport = typeof global.hybridd.userport !== "undefined" ? global.hybridd.userport : 8080;
        // When the server is listening provide a callback to continue next callback sequentially
        global.hybridd.uiServer = http.createServer(onUIRequest);
        global.hybridd.uiServer.listen(userport, global.hybridd.userbind,undefined, function(){
          console.log(` [i] public user interface running on: http://${global.hybridd.userbind}:${global.hybridd.userport}`);
          functions.sequential(callbackArray);
        }.bind({callbackArray}));
      }else{ // Userinterface disabled, callback directly
        functions.sequential(callbackArray);
      }
    }else{ // No server to be initialized, callback directly
      functions.sequential(callbackArray);
    }
  },

  close : function(callbackArray){
    var userinterface = typeof global.hybridd.userinterface !== "undefined" ? global.hybridd.userinterface : "enabled";
    if(userinterface==="enabled" && global.hybridd.uiServer && global.hybridd.uiServer.listening){
      global.hybridd.uiServer.close(function(){
        console.log("[i] user interface has been closed.");
        functions.sequential(callbackArray);
      });
    }else{ // No server to be initialized, callback directly
      functions.sequential(callbackArray);
    }
  },
  listen :  function(callbackArray){
    var userport = typeof global.hybridd.userport !== "undefined" ? global.hybridd.userport : 8080;
    global.hybridd.uiServer.listen(userport, global.hybridd.userbind,undefined, function(){
      console.log(` [i] public user interface running on: http://${global.hybridd.userbind}:${global.hybridd.userport}`);
      functions.sequential(callbackArray);
    }.bind({callbackArray}));
  }


}


// export every function
exports.local = {}
exports.public = {}
exports.local.init = local.init;
exports.local.close = local.close;
exports.local.listen = local.listen;
exports.public.init = public.init;
exports.public.close = public.close;
exports.public.listen = public.listen;
