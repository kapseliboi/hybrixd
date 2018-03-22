//
// hybridd - apiqueue.js
// API/Transaction queue processor
//

exports.initialize = initialize;
exports.add = insert;
exports.pause = pause;
exports.resume = resume;

// pause the APIqueue
function pause(callbackArray){
  if(global.hybridd.APIqueueInterval){
    console.log("[i] REST API has been paused.");
  }
  clearInterval(global.hybridd.APIqueueInterval);
  global.hybridd.APIqueueInterval = null;
  global.hybridd.APIqueueInitiated = false;
  functions.sequential(callbackArray);
}

// resume the APIqueue
function resume(callbackArray){
  if(!global.hybridd.APIqueueInterval){
    console.log("[i] REST API has been started...");
    initialize(callbackArray);
  }else{
    functions.sequential(callbackArray);
  }
}


function httpCall(link,host,qpath,args,method,processID,qid){
  var postresult;

  switch (method) {
  case 'POST':

    postresult = link.post(host+qpath, args, function (data, response) {

      restaction({
        "processID": this.processID,
        "qid": this.qid,
        "data" : data
      });

    }.bind({
      qid,
      processID
    }));
    break;
  case 'PUT':
    postresult = link.put(host+qpath, args, function (data, response) {
      restaction({
        "processID": this.processID,
        "qid": this.qid,
        "data" : data
      });

    }.bind({
      qid,
      processID
    }));
    break;
  case 'GET':
    postresult = link.get(host+qpath, {}, function (data, response) {
      restaction({
        "processID": this.processID,
        "qid": this.qid,
        "data" : data
      });

    }.bind({
      qid,
      processID
    }));
    break;
  }
  postresult.once("error", (result) => {

    console.log(` [!] API queue -> ${result}`);

  });
}

function webSocketCall(link,host,qpath,args,method,processID,qid){

  link.on('message',function (data) {
    restaction({
      "processID": this.processID,
      "qid": this.qid,
      "data" : data
    });

  }.bind({
      qid:qid,
      processID:processID
  }));
  link.send(JSON.stringify(args.data));
}

function initialize (callbackArray) {

  var timer = 500;
  global.hybridd.APIqueueInterval = setInterval( function() {
    if(!global.hybridd.APIqueueInitiated){
      console.log(` [i] REST API running on: http://${global.hybridd.restbind}:${global.hybridd.restport}`);
      global.hybridd.APIqueueInitiated=true;
      functions.sequential(callbackArray);
    }

    var timenow = Date.now();
    for (var qid in global.hybridd.APIqueue) {

      var target = global.hybridd.APIqueue[qid].target;
      var base = target.split(".")[0];
      var timestamp = global.hybridd.APIqueue[qid].time;
      var processID = global.hybridd.APIqueue[qid].pid;
      var timeout = timestamp + global.hybridd.APIqueue[qid].timeout;

      if (timeout > timenow && global.hybridd.APIqueue[qid].retries < global.hybridd.APIqueue[qid].retry) {

        if (typeof global.hybridd.APIthrottle[base] === "undefined") {

          global.hybridd.APIthrottle[base] = 0;

        }

        if (global.hybridd.APIqueue[qid].next < timenow && global.hybridd.APIthrottle[base] < timenow) {

          try {
            // reduce the amount of retries & throttle the maximum amount of requests per second
            global.hybridd.APIqueue[qid].retries++;
            global.hybridd.APIqueue[qid].next = timenow + Number(global.hybridd.APIqueue[qid].interval * (global.hybridd.APIqueue[qid].retries + 1));
            if (global.hybridd.APIthrottle[base] < timenow + timer / 1000 * global.hybridd.APIqueue[qid].throttle) {

              global.hybridd.APIthrottle[base] = timenow + timer / 1000 * global.hybridd.APIqueue[qid].throttle;

            }
            // loadbalance the URL element
            if (typeof global.hybridd.APIqueue[qid].host === "string") {

              var host = global.hybridd.APIqueue[qid].host;

            } else {

              var host = global.hybridd.APIqueue[qid].host[global.hybridd.APIqueue[qid].reqcnt];

              if (global.hybridd.APIqueue[qid].reqcnt < global.hybridd.APIqueue[qid].host.length - 1) {

                global.hybridd.APIqueue[qid].reqcnt+=1;

              } else {

                global.hybridd.APIqueue[qid].reqcnt = 0;

              }

            }
            // get the initialized link
            var args   = global.hybridd.APIqueue[qid].args;
            var method = global.hybridd.APIqueue[qid].method;
            var qpath  = (typeof args.path==='undefined'?'':args.path);
            // DEBUG: console.log(' ## TARGET: '+target+' HOST: '+host+'  QID: '+qid);
            // DEBUG: console.log(' ### METHOD: '+method+' ARGS: '+JSON.stringify(args));
            var link;

            if(global.hybridd.APIqueue[qid].link){
              link = (new Function(`return global.hybridd.${global.hybridd.APIqueue[qid].link}.link;`))();
            }else{
              //TODO get options from global.hybridd.APIqueue[qid] {user:,password:,proxy:};
              //TODO if wss or ws then websocket
              var Client = require('./rest').Client;
              link = new Client(); // create temporary Client to perform curl call.
            }
            if(host.substr(0,5) === 'ws://' || host.substr(0,6) === 'wss://'){
              webSocketCall(link,host,qpath,args,method,processID,qid);
            }else{
              httpCall(link,host,qpath,args,method,processID,qid);
            }

          } catch (result) { console.log(`[!] API queue catch -> ${result}`); }

        } else if(DEBUG){

          console.log("[i]  API-QUEUE: WAITING ON "+target+"... "+global.hybridd.APIqueue[qid].retries+"/"+global.hybridd.APIqueue[qid].retry);

        }
      } else if (global.hybridd.APIqueue[qid].retries >= global.hybridd.APIqueue[qid].retry) {
        // timeout: if no more retries delete the queue object
        if(DEBUG){
          console.log("[!] API-QUEUE: TIMEOUT"+target+ " "+processID);
        }
        scheduler.stop(processID, {"err": 1});
        delete global.hybridd.APIqueue[qid];

      }

    }
  }.bind({callbackArray}), timer); // every 'timer' milliseconds push transactions from the queue...

  return 1;
}

function restaction (properties) {

  var err = 0;
  try {
    properties.data = JSON.parse(properties.data);
  } catch(result) {
    if(typeof properties.data !== 'object') {
      err = 1;
    }
  }

  if(err === 0) {

    delete global.hybridd.APIqueue[properties.qid];

    scheduler.stop(properties.processID, {
      "err": 0,
      "data": properties.data
    });

  } else {
    if(typeof global.hybridd.proc[properties.processID]!=="undefined") {
      global.hybridd.proc[properties.processID].data = properties.data;
    }

  }

  return err;
}

function insert (queueobject) {

  // sane defaults
  var suffix = `0000${Math.random() * 9999}`.slice(-4);
  var qid = Date.now() + suffix.toString();

  global.hybridd.APIqueue[qid] = {
    "cache": 12000,
    "link" : null, // digital callback function object
    "method": "POST",
    "retry": 3,  // max nr of retries allowed
    "retries": 0,  //number of retries done (Not modifiable)
    "throttle": 5,
    "timeout": 15000,
    "time": Date.now(), // (Not modifiable)
    "next": Date.now(), // (Not modifiable)
    "interval": 2000,
    "host": null,
    "reqcnt": 0,  // (Not modifiable)
    "pid": null,
    "args": null,  // data passed to call (inluding args.headers and args.path)
    "target": null  // TODO rename to symbol? : should be removed, only base (upto .) is currently used
    // "user":null // user:password perhaps in the future, be aware of PEEK, admins can see data
    //proxy
  };

  // Remove time,next,retries,reqcnt from queueobject as they should only be set by APIqueue
  if(queueobject && typeof queueobject === "object"){
    if(queueobject.hasOwnProperty("time")){delete queueobject.time;}
    if(queueobject.hasOwnProperty("next")){delete queueobject.next;}
    if(queueobject.hasOwnProperty("retries")){delete queueobject.retries;}
    if(queueobject.hasOwnProperty("reqcnt")){delete queueobject.reqcnt;}
  }

  Object.assign(global.hybridd.APIqueue[qid], queueobject);

  // if multiple hosts: randomize the first request count
  if(typeof global.hybridd.APIqueue[qid].host === "object" && global.hybridd.APIqueue[qid].host.length) {
    global.hybridd.APIqueue[qid].reqcnt = Math.floor(Math.random() * (global.hybridd.APIqueue[qid].host.length));
  }

  return 1;
}
