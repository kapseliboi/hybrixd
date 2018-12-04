// servers.js -> implements functions to init servers
//
// (c)2018 internet of coins project - Rouke Pouw


// https://stackoverflow.com/questions/12006417/node-js-server-that-accepts-post-requests

var http = require("http");
var router = require("./router");
var functions = require('./functions');

function createResponse(request, response){

  // help ->       content as flat html   type:'text/html'
  // storage ->    file as data           type:'file:data'
  // det. blob ->  file as data           type:'file:data'
  // web_walet ->  file as flat html      type:'file:text/html' //TODO dependant on file extensions
  // views ->      file as flat json      type:'application/json' //TODO 'file:application/json'

  var result = router.route(request);  //&& typeof result['type'] === 'undefined' || result['type'] === 'application/json' || result['type'] === 'text/plain'
  if(typeof result.type === 'undefined' || result.type === 'data'){

    response.writeHead(200, {
      "Content-Type": 'application/json',
      "Access-Control-Allow-Origin": "*"
    });
    delete(result.recipe);
    response.write(JSON.stringify(result));

  } else {

    response.writeHead(200, {
      "Content-Type": result['type'],
      "Access-Control-Allow-Origin": "*"
    });
    response.write(result.data);

  }

  response.end();
}

function onLocalRequest (request, response, sessionID) {
   if (request.url.startsWith('/api/')) {
    request.url = request.url.substring(5);
  }else if (request.url === '/api') {
    request.url = '';
  }

  request.sessionID = sessionID === 1?1:0;
  if (request.method === 'POST') {
    let data = '';
    request.on('data', chunk => {
      data += chunk.toString(); // convert Buffer to string
    });
    request.on('end', () => {
      request.data = data;
      createResponse(request, response);
    });
  } else if (request.method === 'GET') {
    var url_getdata = request.url.split('/POST=');//TODO seperator kiezen
    if(url_getdata.length>1){
      request.data = url_getdata[1];
    }else{
      request.data = null;
    }
    createResponse(request, response);
  }
}

var local = {
  init : function(callbackArray){
    var restinterface = typeof global.hybrixd.restinterface !== "undefined" ? global.hybrixd.restinterface : "enabled";
    if(restinterface==="enabled" && !global.hybrixd.restServer){

      // When the server is listening provide a callback to continue next callback sequentially
      global.hybrixd.restServer = http.createServer(function(request, response){ onLocalRequest(request, response, 1); });

      global.hybrixd.restServer.listen(global.hybrixd.restport, global.hybrixd.restbind,undefined, function(){
        console.log(` [i] local rest interface running on: http://${global.hybrixd.restbind}:${global.hybrixd.restport}`);
        functions.sequential(callbackArray);
      }.bind({callbackArray}));
    } else { // No server to be initialized, callback directly
      functions.sequential(callbackArray);
    }
  },

  close : function(callbackArray){
    var restinterface = typeof global.hybrixd.restinterface !== "undefined" ? global.hybrixd.restinterface : "enabled";
    if(restinterface==="enabled" && global.hybrixd.restServer && global.hybrixd.restServer.listening){
      global.hybrixd.restServer.close(function(){
        console.log("[i] rest interface has been closed.");
        functions.sequential(callbackArray);
      });
    } else { // No server to be initialized, callback directly
      functions.sequential(callbackArray);
    }
  },
  listen :  function(callbackArray){
    global.hybrixd.restServer.listen(global.hybrixd.restport, global.hybrixd.restbind,undefined, function(){
      console.log(` [i] local rest interface running on: http://${global.hybrixd.restbind}:${global.hybrixd.restport}`);
      functions.sequential(callbackArray);
    }.bind({callbackArray}));
  }
}

function onPublicRequest (request, response) {
  if (request.url.startsWith('/api/')) {
    request.url = request.url.substring(5);
  } else if (request.url === '/api') {
    request.url = '';
  } else {
    request.url = 'source/web-wallet/'+request.url;
  }
  onLocalRequest(request, response, 0);
}

var public = {

  init: function(callbackArray){
    if (typeof global.hybrixd.userport !== "undefined") {

      // create server
      var userinterface = typeof global.hybrixd.userinterface !== "undefined" ? global.hybrixd.userinterface : "enabled";
      if (userinterface === "enabled") {
        var userport = typeof global.hybrixd.userport !== "undefined" ? global.hybrixd.userport : 8080;
        // When the server is listening provide a callback to continue next callback sequentially
        global.hybrixd.uiServer = http.createServer(onPublicRequest);
        global.hybrixd.uiServer.listen(userport, global.hybrixd.userbind,undefined, function(){
          console.log(` [i] public user interface running on: http://${global.hybrixd.userbind}:${global.hybrixd.userport}`);
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
    var userinterface = typeof global.hybrixd.userinterface !== "undefined" ? global.hybrixd.userinterface : "enabled";
    if(userinterface==="enabled" && global.hybrixd.uiServer && global.hybrixd.uiServer.listening){
      global.hybrixd.uiServer.close(function(){
        console.log("[i] user interface has been closed.");
        functions.sequential(callbackArray);
      });
    }else{ // No server to be initialized, callback directly
      functions.sequential(callbackArray);
    }
  },
  
  listen :  function(callbackArray){
    var userport = typeof global.hybrixd.userport !== "undefined" ? global.hybrixd.userport : 8080;
    global.hybrixd.uiServer.listen(userport, global.hybrixd.userbind,undefined, function(){
      console.log(` [i] public user interface running on: http://${global.hybrixd.userbind}:${global.hybrixd.userport}`);
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
