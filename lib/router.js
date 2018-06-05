// (c)2015-2016 Internet of Coins / Metasync / Joachim de Koning
// hybridd - router.js
// Routes incoming path array xpath to asynchronous processes.

// required libraries in this context
var functions = require("./functions");
var LZString = require("./crypto/lz-string");
var UrlBase64 = require("./crypto/urlbase64");

// routing submodules (keep in alphabetical order)
var asset = require("./router/asset");
var command = require("./router/command");
var list = require("./router/list");
var help = require("./router/help");
//var network = require("./router/network");
var proc = require("./router/proc");
var source = require("./router/source");
var engine = require("./router/engine");
var view = require("./router/view");
var xauth = require("./router/xauth");

var url = require("url");

// exports
exports.route = route;

// Please keep in alphabetical order and keep alias letter reserved
var routeRootMap = {
  asset : asset.process,
  command : command.process,
  engine : engine.process,
  list : list.process,
  help : help.serve,
//  network : network.proces,
  proc : proc.process,
  source : source.process,
  view : view.serve,
  xauth : xauth.processX,
  ychan : xauth.processY,
  zchan : xauth.processZ
};

// routing handler
function route(request,modules) {
  // parse path array (added by AmmO for global xpath array, do not remove)
  if(typeof request.url === "string") {
    var xpath = request.url.split("/"); // create xpath array
    for (var i = 0; i < xpath.length; i++) {
      if (xpath[i] === "") { xpath.splice(i,1); i--; } else {
        try{
          xpath[i] = decodeURIComponent(xpath[i]); // prune empty values and clean vars
        }catch(e){
          console.log(' [!] illegal routing url: '+request.url);
          return '{"error":1, "info":"Your request was ill formatted!"}';
        }
      }
    }

    // default error message
    var result = {error:1, info:"Your request was not understood!"};
    // route path handling (console.log only feedbacks same route once and stay silent for y and z calls )
    if (JSON.stringify(xpath) !== JSON.stringify(global.hybridd.last_routed_xpath) && xpath[0] !== "y" && xpath[0] !== "z" ) {
      console.log(" [i] routing request "+JSON.stringify(xpath));
    }
    global.hybridd.last_routed_xpath = xpath; // used to prevent double console.log on repeated calls

    // routing logic starts here
    if (xpath.length === 0) {
      result = {info:" *** Welcome to the hybridd JSON REST-API. Please enter a path. For example: /asset/btc/command/help *** ", error:0, id:null};
    } else {

      /*  TODO enable when fully implemented. Will return help messages for errors.
      var v = help.valid(xpath,request.sessionID);
      if(!v.valid){return JSON.stringify({info:help.help(xpath,v),error:1,id:null});}
      */

      var node;
      if(routeRootMap.hasOwnProperty(xpath[0])){ // Check if node is directly defined in routeMap
        node = xpath[0];
      }else if(global.hybridd.routetree.hasOwnProperty(xpath[0]) &&
               global.hybridd.routetree[xpath[0]].hasOwnProperty("_alias") &&   // Check for alias in routeTree
               routeRootMap.hasOwnProperty(global.hybridd.routetree[xpath[0]]["_alias"])  // Check if node alias is defined in routeMap
              ){
        node = global.hybridd.routetree[xpath[0]]["_alias"];
      }
      if(node){
        result = routeRootMap[node](request,xpath);
      }

      // when shorthand is used, cull output data by removing result.info
      if(typeof xpath[0] === "undefined" || xpath[0].length<=1) {
        result.info = undefined;
      }
    }
    // return stringified data object
    return JSON.stringify(result);
  }
  return '{"error":1, "info":"Your request was ill formatted!"}';
}
