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
function prwt(p,processID,millisecs) {
  if(global.hybridd.proc[p.processID].sessionID === 1 || global.hybridd.proc[p.processID].sessionID === global.hybridd.proc[processID].sessionID){

    if(typeof global.hybridd.proc[processID] != "undefined") {
      if(global.hybridd.proc[processID].progress >= 1 || global.hybridd.proc[processID].stopped > 1) {
        next(p,global.hybridd.proc[processID].err,{processID:processID});
      } else {
        setTimeout(function(p,processID,millisecs) {
          prwt(p,processID,millisecs);
        },millisecs||500,p,processID,millisecs||500);
      }
      if(DEBUG) { console.log(" [D] ("+p.parentID+") processwait at "+(global.hybridd.proc[p.parentID].step+1)+" of "+(global.hybridd.proc[p.parentID].steps+1)); }
    }
    return 1;
  }else{
    stop(p,1,"prwt: insufficient permissions to access process "+processID+".");
  }
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
  if(typeof data === "undefined") { data = global.hybridd.proc[p.processID].data;}
  return next(p,0,data);
}

// pass data to parent process
function pass(p,data) {
  if(DEBUG) { console.log(" [D] ("+p.parentID+") passing subprocess data to parent process"); }
  if(typeof data === "undefined") { data = "[pass]"; }
  global.hybridd.proc[p.parentID].data = data;
  return next(p,0,data);
}

// parse string data to JSON object
function jpar(p,data,failvalue) {
  if(DEBUG) { console.log(" [D] ("+p.parentID+") parsing string data to JSON object"); }
  //var err = 0;
  try {
    data = JSON.parse(data);
  } catch(e) {
    //err = 1;
    if(typeof failvalue!=='undefined') {
      data = failvalue;
    } else {
      data = null;
    }
  }
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
  if(stepto === 0 || typeof stepto === 'undefined') { stepto = 1; }
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


function chckString(p,property,data){
  if(property.substr(0,1)!=='.'){return {valid:true,data:property};}  // "foo" -> "foo"

  var propertyPath = property.substr(1).replace(']','').replace('[','.').split(".");  // ".foo.bar[3][5].x" -> ["foo","bar","3","5","x"]

  var iterator = data;
  for(var i=0, len=propertyPath.length; i<len;++i){
    if(iterator !== null && typeof iterator === 'object' ){
      if(iterator.constructor === Array){ // Array object
        var index = Number(propertyPath[i]);
        if(index>=0 && index < iterator.length){
          iterator = iterator[index];
        }else{
          return {valid:false,data:data};
        }
      } else { // Dictionary object
        if(iterator.hasOwnProperty(propertyPath[i])){
          iterator = iterator[propertyPath[i]];
        }else{
          return {valid:false,data:data};
        }
      }
    } else {
      return {valid:false,data:data};
    }
  }
  return {valid:true,data:iterator};
}

function chckVar(p,property,data){

  if(typeof property==="string"){ // If String
    return chckString(p,property,data);
  }else if(typeof property==="number" || typeof property==="boolean"  || typeof property==="undefined"){ // If Explicit Number, Boolean or Undefined
    return {valid:true,property};
  }else if(typeof property==="object"){ // If Object
    if(property === null){ // If Null
      return {valid:true,data:null};
    }else if(property.constructor === Array){ // If Array
      var newData = [];
      for(var index, len=property.length; index<len;++index){
        var chckIndex = chckVar(p,property[index],data);
        if(!chckIndex.valid){return {valid:false,data:data};}
        newData[key] = chckIndex.data;
      }
      return {valid:true,data:newData};
    }else{ // If Dictionary
      var newData = {};
      for(var key in property){
        var chckKey = chckVar(p,property[key],data);
        if(!chckKey.valid){return {valid:false,data:data};}
        newData[key] = chckKey.data;
      }
      return {valid:true,data:newData};
    }
  }
}

// Given property = ".foo.bar[3][5].x" checks if data.foo.bar[3][5].x exists if so passes it to jump
// also for arrays and dictionaries of property paths
// also for explicit primitive values
function tran(p,property,testObject,is_valid,is_invalid,data){
  if(DEBUG) { console.log(" [D] ("+p.parentID+") tran ["+JSON.stringify(property)+"] in step "+(global.hybridd.proc[p.parentID].step+1)+" of "+(global.hybridd.proc[p.parentID].steps+1)); }
  var checkVar = chckVar(p,property,testObject);
  if(checkVar.valid){
    jump(p,is_valid,data?data:checkVar.data);
  } else if(typeof is_invalid === "undefined") {
    next(p,0,data?data:null);
  } else {
    jump(p,is_invalid,data?data:testObject);
  }
  return 1;
}

// find a string in an array of objects, and return the object it was found in
function find(p,findObject,searchArray,found,not_found,data){
  if(DEBUG) { console.log(" [D] ("+p.parentID+") find ["+JSON.stringify(property)+"] in step "+(global.hybridd.proc[p.parentID].step+1)+" of "+(global.hybridd.proc[p.parentID].steps+1)); }

  var matches = [], query;
  query = JSON.stringify(findObject).replace(new RegExp("^[{]*"), '').replace(new RegExp("[}]*$"), '');
  if(Object.prototype.toString.call(searchArray)!=="[object Array]") {
    searchArray = [].push(searchArray);
  }
  for(var i = 0 ; i < searchArray.length; i++){
    if(JSON.stringify(searchArray[i]).indexOf(query)>-1) {
      matches.push(searchArray[i]);
    }
  }
  if(matches.length>0) {
    jump(p,found,matches.length===1?matches[0]:matches);
  } else if(typeof not_found === "undefined") {
    next(p,0,data?data:null);
  } else {
    jump(p,not_found,data?data:null);
  }
  return 1;
}

// format float number
function form(p,data,factor,convert){
  if(DEBUG) { console.log(" [D] ("+p.parentID+") form ["+JSON.stringify(data)+","+JSON.stringify(factor)+"] in step "+(global.hybridd.proc[p.parentID].step+1)+" of "+(global.hybridd.proc[p.parentID].steps+1)); }
  var result = null;
  if(typeof convert==='undefined' || !convert || convert==='none') {
    result = padFloat(data,factor);
  } else if (convert || convert==='reduce') {
    result = padFloat(fromInt(data,factor),factor);
  } else if (convert===2 || convert==='atomic') {
    result = toInt(data,factor);
  }
  next(p,0,result);
}

// explode string
function expl(p,data,seperator){
  var result = data.split(seperator);
  next(p,0,result);
}

// implode string
function impl(p,data,seperator){
  var result = data.join(seperator);
  next(p,0,result);
}

//use APIqueue to perform a curl
function curl(p,target,querystring,method,data,headers,overwriteProperties){
  var properties;
  var link;
  if(target.substr(0,8) === "asset://"){  // target = "asset://base.mode"
    target = target.substring(8,target.length); // target = "base.mode"
    var base = target.split('.')[0];  // base = "base"
    link = 'asset["'+base+'"]';
    properties = {};
    Object.assign(properties,global.hybridd.asset[base]); // use base as default
    if(base !== target){ // extend with mode if required
      properties = Object.assign(properties,global.hybridd.asset[target]);
    }
  }else if(target.substr(0,9) === "source://"){ // target = "source://base.mode"
    target = target.substring(7,target.length);  // target = "base.mode"
    var base = target.split('.')[0];  // base = "base"
    link = 'source["'+base+'"]';
    properties = {};
    Object.assign(properties,global.hybridd.source[base]); // use base as default
    if(base !== target){  // extend with mode if required
      properties = Object.assign(properties,global.hybridd.source[target]);
    }
  }else{ // target = "user:password@host:port"
    var targetSplitOnAdd = target.split('@');
    properties = {};
    if(targetSplitOnAdd.length==1){
      properties.host = targetSplitOnAdd[0];
    }else{
      var userSplitOnColon = targetSplitOnAdd[0].split(':');
      properties.user = userSplitOnColon[0];
      properties.pass = userSplitOnColon.length>1?userSplitOnColon[1]:undefined;
      properties.host = targetSplitOnAdd[1];
    }
  }

  var args = {};
  args['data']=data;
  args['path']=querystring;
  args.headers = headers;
  var queueObject = {
    "link": link,
    "target": target,
    "host": properties.host,
    "args": args,
    "method": method,
    "retry": properties.retry,
    "throttle": properties.throttle,
    "timeout": properties.timeout,
    "interval": properties.retry,
    "pid": p.processID
  }


  // Remove undefined values (needed to let APIqueue set defaults)
  var cleanQueueObject = Object.keys(queueObject).reduce(
    function(cleanQueueObject, key){
      if(typeof queueObject[key]!=='undefined'){
        cleanQueueObject[key]=queueObject[key];
      }
      return cleanQueueObject;
    }, {});

  if(overwriteProperties){ // overwrite connection properties
    if(overwriteProperties.hasOwnProperty("pid")){delete overwriteProperties.pid;}
    if(overwriteProperties.hasOwnProperty("link")){delete overwriteProperties.link;}
    Object.assign(cleanQueueObject, overwriteProperties);
  }

  APIqueue.add(cleanQueueObject);
}

function fork(p,target,xpath,xdata,childId) {
  var requestPID = typeof childID === 'undefined'?0:p.processID+"."+childId; // PID+"."+childID for child process, "0" for independant process.
  var childPID = scheduler.init(requestPID,{data:xdata});
  var childRecipe;

  if(target.substr(0,8) === "asset://"){  // target = "asset://base.mode"
    target = target.substring(8,target.length); // target = "base.mode"
    childRecipe = global.hybridd.asset[target];
  }else if(target.substr(0,9) === "source://"){ // target = "source://base.mode"
    target = target.substring(7,target.length);  // target = "base.mode"
    childRecipe = global.hybridd.source[target];
  }else{
    stop(p,1,"call: target not found: '"+target+"'");
    return 0;
  }
  // the command xpath passed to the Quartz function: "functionId/$1/$2/$3/..."
  modules.module[childRecipe.module].main.exec({processID:childPID,parentID: p.processID,target:childRecipe,mode:childRecipe.mode,factor:childRecipe.factor,command:xpath.split('/')});

  return childPID;
}

function call(p,target,xpath,xdata) {
  read(p,fork(p,target,xpath,xdata,0));
}

// wait for one or more processes to finish, and pass its data
function read(p,processIDs,millisecs) {
  if(typeof processIDs !== 'object'){ // If not an array, create an array
    processIDs = [processIDs];
  }
  // check permissions for processes
  var permission = processIDs.reduce(function(permission, processID){
    return permission && global.hybridd.proc.hasOwnProperty(processID) && (global.hybridd.proc[this.mainProcessID].sessionID === 1 || global.hybridd.proc[this.mainProcessID].sessionID === global.hybridd.proc[processID].sessionID)
  }.bind({mainProcessID:p.processID}),true);

  if(permission){
    // check if processes have finished:
    var finished = processIDs.reduce(function(finished, processID){
      return finished && (global.hybridd.proc[processID].progress >= 1 || global.hybridd.proc[processID].stopped > 1);
    },true);

    if(finished){
      var result =  processIDs.reduce(function(result, processID){
        return {data:result.data.concat([global.hybridd.proc[processID].data]),err:global.hybridd.proc[processID].err};
      },{data:[],err:0});
      next(p,result.err,result.data);
    }else{
      setTimeout(function(p,processIDs,millisecs) {
        read(p,processIDs,millisecs);
      },millisecs||500,p,processIDs,millisecs||500);
    }

  }else{
    stop(p,1,"read: insufficient permissions to access processes "+processIDs+".");
  }
}


function each(p,array,target,xpath,xdata) {
  var processIDs = [];
  for(var index = 0; index < array.length; ++index){
    processIDs.push(fork(p,target,xpath, {data:xdata, array:array, index:index, value:array[index]},index));
  }
  read(p,processIDs);
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
