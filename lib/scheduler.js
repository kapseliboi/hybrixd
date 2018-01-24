//
// hybridd - scheduler.js
// Main processing engine and scheduler

/* global DEBUG : true*/
/* eslint no-new-func: "off"*/

// required libraries in this context
var functions = require("./functions");

var initproc = function initproc (processID, properties) {

    var sessionID = 1;
    if (typeof properties !== "undefined") {

        if (typeof properties.subprocesses !== "undefined") {

            global.hybridd.procqueue[processID] = properties.subprocesses;

        }
        if (typeof properties.sessionID !== "undefined") {

            sessionID = properties.sessionID;

        }

    }
    if (processID === 0) {

        var suffix = `000${Math.random() * 999}`.slice(-3);
        processID = Date.now() + suffix.toString();

    }
    // initialize process variables
    global.hybridd.proc[processID] = {};
    global.hybridd.proc[processID].err = 0;
    global.hybridd.proc[processID].busy = null;
    global.hybridd.proc[processID].step = null;
    global.hybridd.proc[processID].steps = null;
    global.hybridd.proc[processID].subproc = null;
    global.hybridd.proc[processID].progress = 0;
    global.hybridd.proc[processID].autoprog = true;
    global.hybridd.proc[processID].timeout = null;
    global.hybridd.proc[processID].started = Date.now();
    global.hybridd.proc[processID].stopped = null;
    global.hybridd.proc[processID].request = null;
    global.hybridd.proc[processID].data = null;
    // root parent only
    if (processID.indexOf(".", 15) === -1) {

        global.hybridd.proc[processID].sid = sessionID;
        global.hybridd.proc[processID].vars = {};

    }

    return processID;

};

var stopproc = function stopproc (processID, properties) {
  if (typeof properties === "undefined") {

      properties = {};

  }
  try {

      if (global.hybridd.proc[processID].stopped === null) {

          global.hybridd.proc[processID].err = typeof properties.err === "undefined"
              ? 0
              : properties.err;
          global.hybridd.proc[processID].data = typeof properties.data === "undefined"
              ? null
              : properties.data;
          global.hybridd.proc[processID].progress = 1;
          global.hybridd.proc[processID].stopped = Date.now();

      } else {

          if (DEBUG) {

              console.log(` [D] (${processID}) process was already stopped`);

          }

      }

  } catch (result) {

      if (DEBUG) {

          console.log(` [D] process ${processID} no longer exists, or cannot be stopped`);

      }

  }
  return 1;
};

var evaluate = function evaluate (runprocess, p, err, data) {

    return ( new Function("p", "err", "data", `

      // process ID decomposition
      var procpart = function procpart (processID) {
        var procsplit = processID.split(".");
        var pieces = {};
        var procinfo = [];
        procinfo[0] = "";
        // store parent in first element
        for (var i = 0; i < procsplit.length - 1; i += 1) {
            pieces[i] = procsplit[i];
        }
        procinfo[0] = functions.implode(".", pieces);
        // store child in next element
        procinfo[1] = procsplit[procsplit.length - 1];
        // store previous child in next element
        if (procinfo[1] - 1 > -1) {
            procinfo[2] = procinfo[0]+"."+(procinfo[1]-1);
        } else {
            procinfo[2] = procinfo[0];
        }
        return procinfo;
      }

      // call an external module function
      function func(p,module,funcname,funcdata,data) {
        if(DEBUG) { console.log(" [D] ("+p.parentID+") function call to module "+module+" -> "+funcname); }
        if(typeof funcdata != "object") { funcdata = {}; }
        funcdata.processID = p.processID;
        return ( new Function("modules.module."+module+".main."+funcname+"("+JSON.stringify(funcdata)+");") )();
      }

      // go to next step
      function next(p,err,data) {
        global.hybridd.proc[p.processID].err = (typeof err === "undefined"?1:err);
        global.hybridd.proc[p.processID].busy = false;
        global.hybridd.proc[p.processID].progress = 1;
        global.hybridd.proc[p.processID].stopped = Date.now();
        global.hybridd.proc[p.processID].data = (typeof data != "undefined"?data:"[next]");
        return true;
      }

      // dump information to the console
      function dump(p,data) {
        console.log("[D] ("+p.parentID+") dump: "+JSON.stringify(data));
        return next(p,0,data);
      }

      // wait a specified amount of time
      function wait(p,millisecs,data) {
        if(DEBUG) { console.log(" [D] ("+p.parentID+") waiting at "+(global.hybridd.proc[p.parentID].step+1)+" of "+(global.hybridd.proc[p.parentID].steps+1)); }
        if(typeof data === "undefined") { data = "[wait "+millisecs+"]"; }
        if(global.hybridd.proc[p.parentID].timeout>0 && millisecs < global.hybridd.proc[p.parentID].timeout && global.hybridd.proc[p.parentID].timeout != -1) {
          global.hybridd.proc[p.parentID].timeout = global.hybridd.proc[p.parentID].timeout + millisecs;
        }
        if(global.hybridd.proc[p.processID].timeout>0 && millisecs < global.hybridd.proc[p.processID].timeout && global.hybridd.proc[p.processID].timeout != -1) {
          global.hybridd.proc[p.processID].timeout = global.hybridd.proc[p.processID].timeout + millisecs;
        }
        return setTimeout(function(p,data) {
          next(p,0,data);
        },millisecs,p,data);
      }

      // wait for a process to finish, and store its processID
      function prwt(p,processID) {
        var millisecs = 500;
        if(typeof global.hybridd.proc[processID] != "undefined") {
          if(global.hybridd.proc[processID].progress >= 1 || global.hybridd.proc[processID].stopped > 1) {
            next(p,global.hybridd.proc[processID].err,{processID:processID});
          } else {
            setTimeout(function(p,processID) {
              prwt(p,processID);
            },millisecs,p,processID);
          }
          if(DEBUG) { console.log(" [D] ("+p.parentID+") processwait at "+(global.hybridd.proc[p.parentID].step+1)+" of "+(global.hybridd.proc[p.parentID].steps+1)); }
        }
        return 1;
      }

      // collate data from previous subprocess steps
      function coll(p,steps) {
        if(DEBUG) { console.log(" [D] ("+p.parentID+") collating subprocess data for "+steps+" steps"); }
        if(typeof steps === "undefined" || steps === 0) { steps = global.hybridd.proc[p.parentID].step; } // default: collate all previous steps
        if(steps>global.hybridd.proc[p.parentID].step) { steps = global.hybridd.proc[p.parentID].step; } // avoid reads beyond the first processID
        var data = [];
        for(var i=global.hybridd.proc[p.parentID].step-steps; i<global.hybridd.proc[p.parentID].step; i+=1) {
          data.push( global.hybridd.proc[p.parentID+"."+i].data );
        }
        return next(p,0,data);
      }

      // logs data to parent process
      function logs(p,level,log,data) {
        // if(DEBUG) { console.log(' [D] ('+p.parentID+') '+level+' : '+log); } else {
        console.log(" ["+(level==2?"!":(level==1?"i":"."))+"] "+log);
        if(typeof data === "undefined") { data = "[logs]"; }
        return next(p,0,data);
      }

      // pass data to parent process
      function pass(p,data) {
        if(DEBUG) { console.log(" [D] ("+p.parentID+") passing subprocess data to parent process"); }
        if(typeof data === "undefined") { data = "[pass]"; }
        global.hybridd.proc[p.parentID].data = data;
        return next(p,0,data);
      }

      // force set progress of parent process
      function prog(p,step,steps,data) {
        if(DEBUG) { console.log(" [D] ("+p.parentID+") progress reset to "+step+" of "+steps); }
        if(typeof steps === "undefined") { steps = 1; }
        if(typeof data === "undefined") { data = "[prog "+step+"/"+steps+"]"; }
        if(step === -1) {
          global.hybridd.proc[p.parentID].autoprog = true;
        } else {
          global.hybridd.proc[p.parentID].progress=step/steps;
          global.hybridd.proc[p.parentID].autoprog = false;
        }
        return next(p,0,data);
      }

      // force set timeout of current process
      function time(p,millisecs,data) {
        if(DEBUG) { console.log(" [D] ("+p.parentID+") timeout for process forced to "+(millisecs?millisecs+"ms":"indefinite")); }
        if(typeof data === "undefined") { data = "[time "+millisecs+"]"; }
        // increase timeout of all siblings
        var loopid;
        for(var i=global.hybridd.proc[p.parentID].step; i<=global.hybridd.proc[p.parentID].steps; i+=1) {
          loopid = p.parentID+"."+i;
          if(global.hybridd.proc[loopid].timeout<millisecs || millisecs<=0) {
            global.hybridd.proc[loopid].timeout = millisecs;
          }
        }
        // increase timeout of all parents
        var parentID = true;
        var processID = p.processID;
        while (parentID) {
          var procinfo = procpart(processID);
          if(procinfo[1]>-1) { parentID = procinfo[0]; processID = parentID; } else { parentID = false; }
          if(parentID) {
            // DEBUG: console.log(' [#] setting timeout of parentID '+parentID);
            if(global.hybridd.proc[parentID].timeout<millisecs || millisecs<=0) {
              global.hybridd.proc[parentID].timeout = millisecs;
            }
          }
        }
        return next(p,0,data);
      }

      // stop processing and return data
      function stop(p,err,data) {
        global.hybridd.proc[p.processID].busy = false;
        global.hybridd.proc[p.processID].err = (typeof err === "undefined"?1:err);
        global.hybridd.proc[p.processID].progress = 1;
        global.hybridd.proc[p.processID].stopped = Date.now();
        global.hybridd.proc[p.processID].data = (typeof data != "undefined"?data:"[stop]");
        global.hybridd.proc[p.parentID].busy = false;
        global.hybridd.proc[p.parentID].err = (typeof err === "undefined"?1:err);
        global.hybridd.proc[p.parentID].progress = 1;
        global.hybridd.proc[p.parentID].stopped = Date.now();
        global.hybridd.proc[p.parentID].data = (typeof data != "undefined"?data:"[stop]");
        if(DEBUG) { console.log(" [D] ("+p.parentID+") stopped at step "+(global.hybridd.proc[p.parentID].step<=global.hybridd.proc[p.parentID].steps?global.hybridd.proc[p.parentID].step+1:1)+" of "+(global.hybridd.proc[p.parentID].steps+1)); }
        return 1;
      }

      // jump forward or backward X instructions
      var jump = function(p,stepto,data) {
        if(typeof data === "undefined") { data = "[jump "+stepto+"]"; }
        global.hybridd.proc[p.processID].started = Date.now();
        if(stepto === 0) { stepto = 1; }
        if(stepto < 0) {
          var previd;
          for(var i=global.hybridd.proc[p.parentID].step+stepto; i<global.hybridd.proc[p.parentID].step; i+=1) {
            previd = p.parentID+"."+i;
            global.hybridd.proc[previd].err = 0;
            global.hybridd.proc[previd].busy = false;
            global.hybridd.proc[previd].progress = 0;
            global.hybridd.proc[previd].started = Date.now();
            global.hybridd.proc[previd].stopped = null;
          }
        }
        global.hybridd.proc[p.parentID].busy = false;
        global.hybridd.proc[p.parentID].step = global.hybridd.proc[p.parentID].step+stepto;
        global.hybridd.proc[p.processID].err = 0;
        global.hybridd.proc[p.processID].busy = false;
        global.hybridd.proc[p.processID].progress = 1;
        global.hybridd.proc[p.processID].data = data;
        if(DEBUG) { console.log(" [D] ("+p.parentID+") jumping to step "+(global.hybridd.proc[p.parentID].step+1)+" of "+(global.hybridd.proc[p.parentID].steps+1)); }
        global.hybridd.proc[p.processID].stopped = Date.now();
        return "step = step+"+stepto+";";
      };

      // test a condition and choose to jump
      function test(p,condition,is_true,is_false,data) {
        if(DEBUG) { console.log(" [D] ("+p.parentID+") testing ["+condition+"] in step "+(global.hybridd.proc[p.parentID].step+1)+" of "+(global.hybridd.proc[p.parentID].steps+1)); }
        if(condition) {
          if(typeof data === "undefined") { data = "[test T "+is_true+"]"; }
          jump(p,is_true,data);
        } else if(typeof is_false === "undefined") {
            if(typeof data === "undefined") { data = "[test F 1]"; }
            next(p,0,data);
          } else {
            if(typeof data === "undefined") { data = "[test F "+is_false+"]"; }
            jump(p,is_false,data);
          }
        return 1;
      }

      function poke(p,variable,pokedata,data) {
        // DEBUG: console.log('POKE: '+JSON.stringify(pokedata));
        if(typeof data === "undefined") { data = "[poke]"; }
        if(DEBUG) { console.log(" [D] ("+p.parentID+") poke ["+JSON.stringify(variable)+"] in step "+(global.hybridd.proc[p.parentID].step+1)+" of "+(global.hybridd.proc[p.parentID].steps+1)); }
        // get root parent
        var rootID=p.processID.substring( 0,p.processID.indexOf(".") );
        // store poke data in root process
        global.hybridd.proc[rootID].vars[variable] = pokedata;
        next(p,0,data);
        return 1;
      }

      // peek at a variable
      var peek = function(p,variable) {
        if(DEBUG) { console.log(" [D] ("+p.parentID+") peek ["+JSON.stringify(variable)+"] in step "+(global.hybridd.proc[p.parentID].step+1)+" of "+(global.hybridd.proc[p.parentID].steps+1)); }
        // get root parent
        var rootID=p.processID.substring( 0,p.processID.indexOf(".") );
        // DEBUG: console.log('PEEK: '+rootID);
        // set data to what is peeked
        var data = null;
        if(typeof global.hybridd.proc[rootID].vars != "undefined") {
          if(typeof global.hybridd.proc[rootID].vars[variable] != "undefined") {
            data = global.hybridd.proc[rootID].vars[variable];
          }
        }
        return data;
      }

    ${runprocess}`) )(p, err, data);

};

var seqstep = function seqstep (processID, subprocesses, step) {

  // wait for subprocess step to finish
  if (global.hybridd.proc[processID].busy === true) { //  || global.hybridd.proc[processID].step < step

      // check if the subprocess is already finished
      if (global.hybridd.proc[`${processID}.${step}`].progress === 1) { // && global.hybridd.proc[processID].progress < 1

          if (DEBUG) {

              console.log(` [D] (${processID}) finished step ${step + 1} of ${global.hybridd.proc[processID].steps + 1}`);

          }
          if (global.hybridd.proc[processID].autoprog === true) {

              global.hybridd.proc[processID].progress = global.hybridd.proc[processID].step / global.hybridd.proc[processID].steps;

          }
          global.hybridd.proc[processID].busy = false;
          // set time process has stopped
          if (global.hybridd.proc[processID].progress === 1) {

              global.hybridd.proc[processID].stopped = Date.now();

          } else {

              global.hybridd.proc[processID].step += 1;

          }
          // if all steps have been done, stop to pass data to parent process
          if (step === global.hybridd.proc[processID].steps) {

              var prevID = global.hybridd.proc[processID].subproc;
              var data = null,
                  err = null;
              if (typeof global.hybridd.proc[prevID] !== "undefined") {

                  err = typeof global.hybridd.proc[prevID].err === "undefined" ? 1 : global.hybridd.proc[prevID].err;
                  data = typeof global.hybridd.proc[prevID].data === "undefined" ? null : global.hybridd.proc[prevID].data;

              }
              var p = {
                  "parentID": processID,
                  "processID": `${processID}.${step}`
              };
              evaluate("stop(p,err,data);", p, err, data);

          }

      } else if (global.hybridd.proc[processID].autoprog === true) {

          if (global.hybridd.proc[`${processID}.${step}`].steps > 0) {

              global.hybridd.proc[processID].progress = (global.hybridd.proc[processID].step - 1) / global.hybridd.proc[processID].steps + 1 / global.hybridd.proc[processID].steps * global.hybridd.proc[`${processID}.${step}`].progress;

          }

      }
      // run next step
      setTimeout(() => {

          if (typeof global.hybridd.proc[processID] !== "undefined") {

              if (typeof global.hybridd.proc[processID].step !== "undefined") {

                  seqstep(processID, subprocesses, global.hybridd.proc[processID].step);

              }

          }

      }, 200);
      // initialize subprocess step

  } else if (global.hybridd.proc[processID].busy !== true && global.hybridd.proc[processID].stopped === null && global.hybridd.proc[processID].step <= global.hybridd.proc[processID].steps) {

      global.hybridd.proc[processID].busy = true;
      if (DEBUG) {

          console.log(` [D] (${processID}) running step ${step + 1} of ${global.hybridd.proc[processID].steps + 1}`);

      }
      prevID = global.hybridd.proc[processID].subproc;
      if (typeof global.hybridd.proc[prevID] !== "undefined") {

          err = typeof global.hybridd.proc[prevID].err !== "undefined" ? global.hybridd.proc[prevID].err : 1;
          data = typeof global.hybridd.proc[prevID].data !== "undefined" ? global.hybridd.proc[prevID].data : null;

      } else {

          err = null;
          data = null;

      }
      // if base command is used, insert extra properties
      var subinsert = `{parentID:"${processID}",processID:"${processID}.${step}"}`;
      var runprocess = subprocesses[step].replace(/peek\(/g, `peek(${subinsert},`); // .replace(/json\(/g,'json('+subinsert+',');
      if ([
          "coll",
          "dump",
          "func",
          "jump",
          "logs",
          "next",
          "pass",
          "poke",
          "prog",
          "prwt",
          "stop",
          "test",
          "time",
          "wait"
      ].indexOf(subprocesses[step].substr(0, 4)) > -1) {

          runprocess = `${runprocess.slice(0, 5) + subinsert},${runprocess.slice(5)}`;

      }
      // set previous ID step
      global.hybridd.proc[processID].subproc = `${processID}.${step}`;
      // fire off the subprocess
      try {

          evaluate(runprocess, p, err, data);

      } catch (result) {

          console.log(` [!] (${processID}) proc error: \n     ${runprocess}\n     ${result ? result : "UNKNOWN ERROR!"}`);

      }
      setTimeout(() => {

          seqstep(processID, subprocesses, global.hybridd.proc[processID].step);

      }, 200);

  }
  return 1;

};

var seqproc = function seqproc (processID, subprocesses) {

    global.hybridd.proc[processID].step = 0;
    global.hybridd.proc[processID].steps = subprocesses.length - 1;
    global.hybridd.proc[processID].busy = false;
    if (DEBUG) {

        console.log(` [D] (${processID}) initializing sequence processing for ${global.hybridd.proc[processID].steps + 1} steps...`);

    }
    // prepare stepping array
    for (var step = 0; step < subprocesses.length; step += 1) {

        initproc(`${processID}.${step}`);
        subprocesses[step] = subprocesses[step].replace(`"processID":"${processID}"`, `"processID":"${processID}.${step}"`);
        global.hybridd.proc[`${processID}.${step}`].request = subprocesses[step];

    }

    return seqstep(processID, subprocesses, 0);	// start stepping

};

var subqueue = function subqueue (processID, subprocesses) {

    var result = true;
    var sessionID = 1;
    if (typeof subprocesses !== "undefined") {

        if (subprocesses.length > -1) {

            if (DEBUG) {

                console.log(` [D] adding ${processID} to processing queue`);

            }
            if (typeof global.hybridd.proc[processID] !== "undefined" && typeof global.hybridd.proc[processID].sid !== "undefined") {

                sessionID = global.hybridd.proc[processID].sid;

            }
            initproc(processID, {
                sessionID,
                subprocesses
            });
            result = false;

        }

    }

    return result;

};

// pause the scheduler
var pause = function pause(){
  if(global.hybridd.schedulerInterval){
    console.log("[i] Scheduler has been paused.");
  }
  global.hybridd.schedulerInterval = null;
  global.hybridd.schedulerInitiated = false;
}

// resume the scheduler
var resume = function resume(){
  if(!global.hybridd.schedulerInterval){
    console.log("[i] Scheduler has been started...");
    initialize();
  }
}

var initialize = function initialize () {

     global.hybridd.schedulerInterval = setInterval(() => {

        if(!global.hybridd.schedulerInitiated){
          global.hybridd.schedulerInitiated = true;
          console.log(" [i] scheduler is running");
        }

        for (var processID in global.hybridd.procqueue) {

            if (DEBUG) {

                console.log(` [D] processing engine creating process ${processID}`);

            }
            seqproc(processID, global.hybridd.procqueue[processID]);
            delete global.hybridd.procqueue[processID];

        }

    }, 50);

    // every 50 milliseconds perform tasks from the queue...
    return setInterval(() => {

        var procpurgetime = 60; // process purge time (sec): one minute
        for (var processID in global.hybridd.proc) {

            if ({}.hasOwnProperty.call(global.hybridd.proc, processID)) {

                var proctimeout = global.hybridd.proc[processID].timeout === null ? 15000 : global.hybridd.proc[processID].timeout;
                if (typeof global.hybridd.proc[processID] !== "undefined") {

                    // started stale processes are purged here
                    if (proctimeout > 0 && global.hybridd.proc[processID].started < Date.now() - procpurgetime * 1000) {

                        if (DEBUG) {

                            console.log(` [D] processing engine purging process ${processID}`);

                        }
                        delete global.hybridd.proc[processID];

                    } else {

                        // set error when process has timed out on its short-term action
                        if (proctimeout > 0 && (global.hybridd.proc[processID].stopped === null && global.hybridd.proc[processID].started < Date.now() - proctimeout)) {

                            if (DEBUG) {

                                console.log(` [D] process ${processID} has timed out`);

                            }
                            global.hybridd.proc[processID].err = 1;
                            global.hybridd.proc[processID].info = "Process timeout!";
                            global.hybridd.proc[processID].busy = false;
                            global.hybridd.proc[processID].stopped = Date.now();

                        }

                    }

                }

            }

        }

    }, 1000); // every second purge old tasks from the proc list...

};

exports.initialize = initialize; // main scheduler initializer
exports.init = initproc; // initialize a new process
exports.stop = stopproc; // functionally stop a process
exports.fire = subqueue; // queue subprocess steps
exports.pause = pause; // pause the scheduler
exports.resume = resume; // resume the scheduler
