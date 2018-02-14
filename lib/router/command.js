// proc.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

// export every function
exports.process = process;

var conf = require("../conf");

// functions start here
function process(request,xpath) {
  var result = null;
  if(request.sessionID!==1){ // only root
    return {error:1, id:"command", info:"Insufficient permissions."};
  }
  if (xpath.length === 1) {
                result = {error:1, id:"command", info:"No command specified."}
  }else if (xpath[1]==="apiqueue") {
    result = commandAPIqueue(xpath);
  }else if (xpath[1]==="reload") {
    result = commandReload(xpath);
  }else if (xpath[1]==="restart" && request.sessionID===1) {
    result = {error:1, id:"command/restart", info:"NOT YET IMPLEMENTED!"};//TODO
  }else if (xpath[1]==="scheduler") {
    result = commandScheduler(xpath);
  }else if (xpath[1]==="stop") {


    process.exit()
  }else if (xpath[1]==="userinterface") {
    result = commandUserInterface(xpath);
  }else{
      result = {error:1, id:"command/", info:"The command specified '"+xpath[1]+"'does not exist!"};
  }
        return result;
}

// command specific functions start here

function commandReload(xpath){
  if(xpath.length === 2){ // Reload everything
    //TODO reload configuration as well
    functions.sequential([APIqueue.pause,scheduler.pause,recipes.init,modules.init,scheduler.resume,APIqueue.resume]);
    result = {error:0, id:"command/reload", info:"Reload successfull."};
  }else if(xpath[2]==="conf"){
    conf.reload();
    result = {error:0, id:"command/reload/modules", info:"Configuration reloaded successfully."};
  }else if(xpath[2]==="modules"){
    functions.sequential([APIqueue.pause,scheduler.pause,modules.init,scheduler.resume,APIqueue.resume]);

    result = {error:0, id:"command/reload/modules", info:"Modules reloaded successfully."};
  }else if(xpath[2]==="recipes"){
    functions.sequential([APIqueue.pause,scheduler.pause,recipes.init,scheduler.resume,APIqueue.resume]);

    result = {error:0, id:"command/reload/recipes", info:"Recipes reloaded successfully."};
  }else if(xpath[2]==="sessions"){
    //TODO
  }else{
    result = {error:1, id:"command/reload", info:"Unknown reload command."}
  }
  return result;
}

function commandScheduler(xpath){
  if(xpath.length === 2){
    result = {error:1, id:"command/scheduler", info:"Specify command for scheduler."}
  }else if(xpath[2]==="pause"){
    if(global.hybridd.schedulerInterval){
      scheduler.pause();
      result = {error:0, id:"command/scheduler/pause", info:"Scheduler paused."};
    }else{
      result = {error:0, id:"command/scheduler/pause", info:"Scheduler already paused."};
    }
  }else if(xpath[2]==="resume"){
    if(global.hybridd.schedulerInterval){
      result = {error:0, id:"command/scheduler/resume", info:"Scheduler already running."};
    }else{
      scheduler.resume();
      result = {error:0, id:"command/scheduler/resume", info:"Scheduler resumed."};
    }
  }else if(xpath[2]==="status"){
    if(global.hybridd.schedulerInterval){
      if(global.hybridd.schedulerInitiated){
        result = {error:0, id:"command/scheduler/status", info:"Scheduler is running."};
      }else{
        result = {error:0, id:"command/scheduler/status", info:"Scheduler is starting up."};
      }
    }else{
      result = {error:0, id:"command/scheduler/status", info:"Scheduler is paused."};
    }
  }else{
    result = {error:1, id:"command/scheduler", info:"Unknown scheduler command."}
  }
  return result;
}

function commandAPIqueue(xpath){
  if(xpath.length === 2){
    result = {error:1, id:"command/apiqueue", info:"Specify command for API Queue."}
  }else if(xpath[2]==="pause"){
    if(global.hybridd.APIqueueInterval){
      APIqueue.pause();
      result = {error:0, id:"command/apiqueue/pause", info:"API Queue paused."};
    }else{
      result = {error:0, id:"command/apiqueue/pause", info:"API Queue already paused."};
    }
  }else if(xpath[2]==="resume"){
    if(global.hybridd.APIqueueInterval){
      result = {error:0, id:"command/apiqueue/resume", info:"API Queue already running."};
    }else{
      APIqueue.resume();
      result = {error:0, id:"command/apiqueue/resume", info:"API Queue resumed."};
    }
  }else if(xpath[2]==="status"){
    if(global.hybridd.APIqueueInterval){
      if(global.hybridd.APIqueueInitiated){
        result = {error:0, id:"command/apiqueue/status", info:"API Queue is running."};
      }else{
        result = {error:0, id:"command/apiqueue/status", info:"API Queue is starting up."};
      }
    }else{
      result = {error:0, id:"command/apiqueue/status", info:"API Queue is paused."};
    }
  }else{
    result = {error:1, id:"command/apiqueue", info:"Unknown API Queue command."}
  }
  return result;
}


function commandUserInterface(xpath){
  var userinterface = typeof global.hybridd.userinterface !== "undefined" ? global.hybridd.userinterface : "enabled";

  if(xpath.length === 2){
    result = {error:1, id:"command/userinterface", info:"Specify command for User Interface."}
  }else if(xpath[2]==="close"){
    if(userinterface==="disabled"){
      result = {error:1, id:"command/userinterface/close", info:"User Interface is disabled."};
    }else if(global.hybridd.uiServer){
      if(global.hybridd.uiServer.listening){
        global.hybridd.uiServer.close(function(){console.log("[i] user interface has been closed.");});
        result = {error:0, id:"command/userinterface/close", info:"Closing User Interface..."};
      }else{
        result = {error:0, id:"command/userinterface/close", info:"User Interface already closed."};
      }
    }else{
      result = {error:1, id:"command/userinterface/close", info:"User Interface not running."};
    }
  }else if(xpath[2]==="listen"){
    if(userinterface==="disabled"){
      result = {error:1, id:"command/userinterface/listen", info:"User Interface is disabled."};
    }else if(global.hybridd.uiServer){
      if(global.hybridd.uiServer.listening){
        result = {error:0, id:"command/userinterface/listen", info:`User Interface is already listening on: http://${global.hybridd.userbind}:${global.hybridd.userport}`};
      }else{
        var userport = typeof global.hybridd.userport !== "undefined" ? global.hybridd.userport : 8080;
        global.hybridd.uiServer.listen(userport, global.hybridd.userbind);
        console.log(` [i] user interface running on: http://${global.hybridd.userbind}:${global.hybridd.userport}`);
        result = {error:0, id:"command/userinterface/listen", info:`User Interface resumed listening on: http://${global.hybridd.userbind}:${global.hybridd.userport}`};
      }
    }else{
      result = {error:1, id:"command/userinterface/listen", info:"User Interface not running."};
    }
  }else if(xpath[2]==="status"){
    if(userinterface==="disabled"){
      result = {error:0, id:"command/userinterface/status", info:"User Interface is disabled."};
    }else if(global.hybridd.uiServer){
      if(global.hybridd.uiServer.listening){
        result = {error:0, id:"command/userinterface/status", info:`User Interface is running on: http://${global.hybridd.userbind}:${global.hybridd.userport}`};
      }else{
        result = {error:0, id:"command/userinterface/status", info:"User Interface is closed."};
      }
    }else{
      result = {error:0, id:"command/userinterface/status", info:"User Interface is not running."};
    }
  }else{
    result = {error:1, id:"command/userinterface", info:"Unknown User Interface command."}
  }
  return result;
}
