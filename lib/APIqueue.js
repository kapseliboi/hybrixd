//
// hybridd - apiqueue.js
// API/Transaction queue processor
//
var WebSocket = require('ws');
var teletype = require('teletype');
var functions = require('./functions');
var scheduler = require('./scheduler');

exports.initialize = initialize;
exports.add = insert;
exports.pause = pause;
exports.resume = resume;

// pause the APIqueue
function pause (callbackArray) {
  if (global.hybridd.APIqueueInterval) {
    console.log(' [i] API queue: REST-API has been paused');
  }
  clearInterval(global.hybridd.APIqueueInterval);
  global.hybridd.APIqueueInterval = null;
  global.hybridd.APIqueueInitiated = false;
  functions.sequential(callbackArray);
}

// resume the APIqueue
function resume (callbackArray) {
  if (!global.hybridd.APIqueueInterval) {
    console.log(' [i] API queue: REST-API has been started');
    initialize(callbackArray);
  } else {
    functions.sequential(callbackArray);
  }
}

function tcpCall (link, host, qpath, args, method, processID, qid) {
  if (typeof args.data !== 'string') {
    args.data = JSON.stringify(args.data);
  }
  if (typeof link[host] !== 'undefined' && typeof link[host].exec === 'function') {
    link[host].exec(args.data, /\n/).then(data => {
      restaction({
        'processID': processID,
        'qid': qid,
        'data': data
      });
    }).catch(function (error) {
      if (global.hybridd.APIqueue.hasOwnProperty(qid)) {
        global.hybridd.APIqueue[qid].busy = false;
      }
      console.log(' [!] API queue: TCP link error for ' + host + ' : ' + error);
    });
  } else {
    if (global.hybridd.APIqueue.hasOwnProperty(qid)) {
      global.hybridd.APIqueue[qid].busy = false;
    }
    console.log(' [!] API queue: TCP link error for ' + host);
  }
}

function httpCall (link, host, qpath, args, method, processID, qid) {
  var postresult;

  switch (method) {
    case 'POST':

      postresult = link.post(host + qpath, args, function (data, response) {
        restaction({
          'processID': this.processID,
          'qid': this.qid,
          'data': data
        });
      }.bind({
        qid,
        processID
      }));
      break;
    case 'PUT':
      postresult = link.put(host + qpath, args, function (data, response) {
        restaction({
          'processID': this.processID,
          'qid': this.qid,
          'data': data
        });
      }.bind({
        qid,
        processID
      }));
      break;
    case 'GET':
      postresult = link.get(host + qpath, {}, function (data, response) {
        restaction({
          'processID': this.processID,
          'qid': this.qid,
          'data': data
        });
      }.bind({
        qid,
        processID
      }));
      break;
  }
  postresult.on('error', (result) => {
    if (global.hybridd.APIqueue.hasOwnProperty(qid)) {
      global.hybridd.APIqueue[qid].busy = false;
    }
    console.log(' [!] API queue: HTTP error for ' + host + ' -> ' + result);
  });
}

function webSocketCall (link, host, qpath, args, method, processID, qid) {
  var postresult;

  link.on('message', function (data) {
    restaction({
      'processID': this.processID,
      'qid': this.qid,
      'data': data
    });
  }.bind({
    qid: qid,
    processID: processID
  }));
  if (typeof args.data !== 'string') {
    args.data = JSON.stringify(args.data);
  }
  if (typeof link.send === 'function') {
    postresult = link.send(args.data);
  } else {
    console.log(' [!] API queue: WebSocket error. Not a function: link.send');
  }
  postresult.on('error', (result) => {
    if (global.hybridd.APIqueue.hasOwnProperty(qid)) {
      global.hybridd.APIqueue[qid].busy = false;
    }
    console.log(' [!] API queue: WebSocket error for ' + host + ' -> ' + result);
  });
}

function getLastRequestTime (host) {
  if (global.hybridd.APIhost.hasOwnProperty(host)) {
    return global.hybridd.APIhost[host].lastRequestTime;
  } else {
    return 0;
  }
}

function setLastRequestTime (host, now) {
  if (global.hybridd.APIhost.hasOwnProperty(host)) {
    global.hybridd.APIhost[host].lastRequestTime = now;
  } else {
    global.hybridd.APIhost[host] = {};
    global.hybridd.APIhost[host].lastRequestTime = now;
  }
}

function call (qid, APIrequest, host, timer, now) {
  var processID = APIrequest.pid;

  APIrequest.retries++; // increase number of tries
  setLastRequestTime(host, now); // set the last request time
  APIrequest.busy = true;

  // get the initialized link
  var args = APIrequest.args;
  var method = APIrequest.method;
  var qpath = (typeof args.path === 'undefined' ? '' : args.path);

  try {
    // DEBUG: console.log(' ## TARGET: '+target+' HOST: '+host+'  QID: '+qid);
    // DEBUG: console.log(' ### METHOD: '+method+' ARGS: '+JSON.stringify(args));
    var link;

    if (APIrequest.link) { // If the link is already defined
      link = (new Function(`return global.hybridd.${APIrequest.link}.link;`))();
    } else if (host.substr(0, 6) === 'tcp://') { // Create temporary TCP client
      var tmp = host.substr(6).split(':');
      var hostaddr = tmp[0];
      var hostport = (tmp[1] ? Number(tmp[1]) : 23);
      try {
        link = teletype(hostaddr, hostport);
        console.log(' [i] API queue: TCP link ' + host + ' opened');
      } catch (e) {
        APIrequest.busy = false;
        console.log(' [!] API queue: TCP link ' + host + ' : Error ' + e);
        return;
      }
    } else if (host.substr(0, 5) === 'ws://' || host.substr(0, 6) === 'wss://') { // Create temporary websocket client
      try {
        var ws = new WebSocket(host, {});
        link = ws;

        ws.on('open', function () {
          console.log(' [i] API queue: WebSocket ' + this.host + ' opened');
          webSocketCall(this.link, this.host, this.qpath, this.args, this.method, this.processID, this.qid);
        }.bind({link, host, qpath, args, method, processID, qid})).on('close', function () {
          console.log(' [i] API queue: WebSocket ' + this.host + ' closed');
        }.bind({host})).on('error', function (code, description) {
          this.APIrequest.busy = false;
          console.log(' [i] API queue: WebSocket ' + this.host + ' : Error ' + code + ' ' + description);
        }.bind({host, APIrequest}));
      } catch (result) {
        APIrequest.busy = false;
        console.log(' [!] API queue: Error initiating WebSocket for ' + host + ' -> ' + result);
      }
      return; // Websocketcall is made on opening of websocket
    } else { // Create temporary http/REST client
      var Client = require('./rest').Client;
      var options = {};
      if (APIrequest.user) { options.user = APIrequest.user; }
      if (APIrequest.pass) { options.password = APIrequest.pass; }
      link = new Client(options); // create temporary Client to perform curl call.
    }

    if (host.substr(0, 6) === 'tcp://') {
      tcpCall(link, host, qpath, args, method, processID, qid);
    } else if (host.substr(0, 5) === 'ws://' || host.substr(0, 6) === 'wss://') {
      webSocketCall(link, host, qpath, args, method, processID, qid);
    } else {
      httpCall(link, host, qpath, args, method, processID, qid);
    }
  } catch (result) {
    console.log(' [!] API queue: Error catch for ' + host + ' -> ' + result);
    APIrequest.busy = false;
  }
}

// using throttle and reqcnt (round robin) for load balancing
function findAvailableHost (qid, APIrequest, timer, now) {
  var host = null;
  if (typeof APIrequest.host === 'string') {
    host = APIrequest.host;
    if (now - getLastRequestTime(host) >= 1000 / APIrequest.throttle) { // check if  the last call was made suffciently long ago
      return host;
    } else {
      return null;
    }
  } else {
    for (var i = 0; i < APIrequest.host.length; ++i) { // TODO perhaps find host with smallest LastRequestTime
      host = APIrequest.host[APIrequest.reqcnt];
      if (APIrequest.reqcnt < APIrequest.host.length - 1) {
        APIrequest.reqcnt += 1;
      } else {
        APIrequest.reqcnt = 0;
      }
      if (now - getLastRequestTime(host) >= 1000 / APIrequest.throttle) { // check if the last call was made suffciently long ago
        return host; // found a available host
      }
    }
    return null;
  }
}

function update (qid, APIrequest, timer, now) {
  var timestamp = APIrequest.time;
  var processID = APIrequest.pid;
  var timeout = timestamp + APIrequest.timeout;
  if (!APIrequest.busy && timeout > now && APIrequest.retries < APIrequest.retry) { // there is time and retries left, so the request is still valid
    var host = findAvailableHost(qid, APIrequest, timer, now);
    if (host) {
      call(qid, APIrequest, host, timer, now);
    }
  } else if (APIrequest.retries >= APIrequest.retry) { // no more retries left : delete the queue object and fail the process
    scheduler.pass(processID, 1, 'Max number of retries exceeded.');
    delete global.hybridd.APIqueue[qid];
  } else if (timeout <= now) { // no more time left : delete the queue object and fail the process
    scheduler.pass(processID, 1, 'Request timed out.');
    delete global.hybridd.APIqueue[qid];
  }
}

function initialize (callbackArray) {
  var timer = 500;
  global.hybridd.APIqueueInterval = setInterval(function () {
    if (!global.hybridd.APIqueueInitiated) {
      console.log(` [i] REST API running on: http://${global.hybridd.restbind}:${global.hybridd.restport}`);
      global.hybridd.APIqueueInitiated = true;
      functions.sequential(callbackArray);
    }

    var now = Date.now();
    for (var qid in global.hybridd.APIqueue) {
      update(qid, global.hybridd.APIqueue[qid], timer, now);
    }
  }, timer); // every 'timer' milliseconds push transactions from the queue...

  return 1;
}

function repeatAPIrequest (APIrequest) {
  return {
    link: APIrequest.link,
    target: APIrequest.target,
    host: APIrequest.host,
    user: APIrequest.user,
    pass: APIrequest.pass,
    args: APIrequest.args,
    method: APIrequest.method,
    retry: APIrequest.retry,
    throttle: APIrequest.throttle,
    timeout: APIrequest.timeout,
    interval: APIrequest.interval,
    pid: APIrequest.pid,
    autoproc: APIrequest.autoproc,
    parsing: APIrequest.parsing
  };
}

function restaction (properties) {
  var err = 0;

  if (!global.hybridd.APIqueue.hasOwnProperty(properties.qid)) {
    console.log(' [!] API queue: request ' + properties.qid + ' not found');
    return 1;
  }

  var APIrequest = global.hybridd.APIqueue[properties.qid];

  if (APIrequest.autoproc) { // Auto proc option is to automatically resolve hybridd "two step API calls"
    if (properties.data.id === 'id') { // 1) if the response contains id="id" then it is a reference to process
      var followUp = repeatAPIrequest(APIrequest);
      followUp.args.path = '/proc/' + properties.data.data; // 2) call /proc/$ID  at the same target to retrieve the process
      //    followUp.parsing = 'none';
      insert(followUp);
      delete global.hybridd.APIqueue[properties.qid];
      return 0;
    } else if (properties.data.hasOwnProperty('started')) { // 3) the response should be a process which contains a started property
      if (!properties.data.stopped) { // 4) If the process has not finished yet, call again to check
        var followUp = repeatAPIrequest(APIrequest);
        --followUp.retry;
        insert(followUp);
        delete global.hybridd.APIqueue[properties.qid];
        return 0;
      } else { // 5) once the process has finished: return the result.
        properties.data = properties.data.data;
      }
    } else {
      err = 1;
      console.log(' [i] API queue: auto proc failure!');
    }
  }

  if (err === 0) {
    var parsing = APIrequest.parsing || 'json'; // parsing method, defaults to JSON
    try {
      switch (parsing) {
        case 'none' : break;
        case 'json' :
        default:
          properties.data = JSON.parse(properties.data);
          break;
      }
    } catch (result) {
      if (typeof properties.data !== 'object') {
        err = 1;
      }
    }
  }

  if (err === 0) {
    delete global.hybridd.APIqueue[properties.qid];
    scheduler.pass(properties.processID, 0, properties.data);
  } else {
    // TODO do we need to set the process to error?
    if (typeof global.hybridd.proc[properties.processID] !== 'undefined') {
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
    'cache': 12000,
    'link': null, // digital callback function object
    busy: false,
    'method': 'POST',
    'retry': 5, // max nr of retries allowed
    'retries': 0, // number of retries done (Not modifiable)
    'throttle': 5,
    'timeout': 30000,
    'time': Date.now(), // (Not modifiable)
    'next': Date.now(), // (Not modifiable)
    'interval': 2000,
    'host': null,
    'reqcnt': 0, // (Not modifiable)
    'pid': null,
    'args': null, // data passed to call (inluding args.headers and args.path)
    'target': null, // TODO rename to symbol? : should be removed, only base (upto .) is currently used
    'autoproc': false,
    'parsing': 'json' // whether to parse the result as 'json' or 'none' for no parsing. TODO xml, yaml

  };

  // Remove busy,time,next,retries,reqcnt from queueobject as they should only be set by APIqueue
  if (queueobject && typeof queueobject === 'object') {
    if (queueobject.hasOwnProperty('busy')) { delete queueobject.busy; }
    if (queueobject.hasOwnProperty('time')) { delete queueobject.time; }
    if (queueobject.hasOwnProperty('next')) { delete queueobject.next; }
    if (queueobject.hasOwnProperty('retries')) { delete queueobject.retries; }
    if (queueobject.hasOwnProperty('reqcnt')) { delete queueobject.reqcnt; }
  }

  Object.assign(global.hybridd.APIqueue[qid], queueobject);

  // if multiple hosts: randomize the first request count
  if (typeof global.hybridd.APIqueue[qid].host === 'object' && global.hybridd.APIqueue[qid].host.length) {
    global.hybridd.APIqueue[qid].reqcnt = Math.floor(Math.random() * (global.hybridd.APIqueue[qid].host.length));
  }

  return 1;
}
