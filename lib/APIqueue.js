//
// hybridd - apiqueue.js
// API/Transaction queue processor
//
var WebSocket = require('ws');
var Teletype = require('teletype');
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
    });
  } else {
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
  postresult.once('error', (result) => {
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
  postresult.once('error', (result) => {
    console.log(' [!] API queue: WebSocket error for ' + host + ' -> ' + result);
  });
}

function initialize (callbackArray) {
  var timer = 500;
  global.hybridd.APIqueueInterval = setInterval(function () {
    if (!global.hybridd.APIqueueInitiated) {
      console.log(` [i] REST API running on: http://${global.hybridd.restbind}:${global.hybridd.restport}`);
      global.hybridd.APIqueueInitiated = true;
      functions.sequential(callbackArray);
    }

    var timenow = Date.now();
    for (var qid in global.hybridd.APIqueue) {
      var APIrequest = global.hybridd.APIqueue[qid];

      var target = APIrequest.target;
      var base = target.split('.')[0];
      var timestamp = APIrequest.time;
      var processID = APIrequest.pid;
      var timeout = timestamp + APIrequest.timeout;

      if (timeout > timenow && APIrequest.retries < APIrequest.retry) {
        if (typeof global.hybridd.APIthrottle[base] === 'undefined') {
          global.hybridd.APIthrottle[base] = 0;
        }

        if (APIrequest.next < timenow && global.hybridd.APIthrottle[base] < timenow) {
          try {
            // reduce the amount of retries & throttle the maximum amount of requests per second
            global.hybridd.APIqueue[qid].retries++;
            global.hybridd.APIqueue[qid].next = timenow + Number(APIrequest.interval * (APIrequest.retries + 1));
            if (global.hybridd.APIthrottle[base] < timenow + timer / 1000 * APIrequest.throttle) {
              global.hybridd.APIthrottle[base] = timenow + timer / 1000 * APIrequest.throttle;
            }
            // loadbalance the URL element
            var host = null;
            if (typeof APIrequest.host === 'string') {
              host = APIrequest.host;
            } else {
              host = APIrequest.host[APIrequest.reqcnt];

              if (APIrequest.reqcnt < APIrequest.host.length - 1) {
                APIrequest.reqcnt += 1;
              } else {
                APIrequest.reqcnt = 0;
              }
            }
            // get the initialized link
            var args = APIrequest.args;
            var method = APIrequest.method;
            var qpath = (typeof args.path === 'undefined' ? '' : args.path);
            // DEBUG: console.log(' ## TARGET: '+target+' HOST: '+host+'  QID: '+qid);
            // DEBUG: console.log(' ### METHOD: '+method+' ARGS: '+JSON.stringify(args));
            var link;

            if (APIrequest.link) { // If the link is already defined
              link = (new Function(`return global.hybridd.${APIrequest.link}.link;`))();
              if (host.substr(0, 6) === 'tcp://') {
                tcpCall(link, host, qpath, args, method, processID, qid);
              } else if (host.substr(0, 5) === 'ws://' || host.substr(0, 6) === 'wss://') {
                webSocketCall(link, host, qpath, args, method, processID, qid);
              } else {
                httpCall(link, host, qpath, args, method, processID, qid);
              }
            } else if (host.substr(0, 6) === 'tcp://') { // Create temporary TCP client
              var tmp = host.substr(6).split(':');
              var hostaddr = tmp[0];
              var hostport = (tmp[1] ? Number(tmp[1]) : 23);
              try {
                link = teletype(hostaddr, hostport);
                console.log(' [i] API queue: TCP link ' + host + ' opened');
              } catch (e) {
                console.log(' [!] API queue: TCP link ' + host + ' : Error ' + e);
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
                  console.log(' [i] API queue: WebSocket ' + this.host + ' : Error ' + code + ' ' + description);
                }.bind({host}));
              } catch (result) {
                console.log(' [!] API queue: Error initiating WebSocket for ' + host + ' -> ' + result);
              }
            } else { // Create temporary http/REST client
              var Client = require('./rest').Client;
              var options = {};
              if (APIrequest.user) { options.user = APIrequest.user; }
              if (APIrequest.pass) { options.password = APIrequest.pass; }
              link = new Client(options); // create temporary Client to perform curl call.
              httpCall(link, host, qpath, args, method, processID, qid);
            }
          } catch (result) { console.log(' [!] API queue: Error catch for ' + host + ' -> ' + result); }
        } else if (DEBUG) {
          console.log(' [i]  API queue: Waiting for ' + target + '... ' + APIrequest.retries + '/' + APIrequest.retry);
        }
      } else if (APIrequest.retries >= APIrequest.retry) {
        // timeout: if no more retries delete the queue object
        if (DEBUG) {
          console.log(' [!] API queue: Timeout ' + target + ' ' + processID);
        }
        
        // TODO:
        //if (APIrequest.proceedOnTimeOut) {
        //  scheduler.pass(processID, 0, null);
        //} else {
        scheduler.pass(processID, 1, null);
        //}
        delete global.hybridd.APIqueue[qid];
      }
    }
  }, timer); // every 'timer' milliseconds push transactions from the queue...

  return 1;
}

function repeatAPIrequest (APIrequest) {
  return {
    'link': APIrequest.link,
    'target': APIrequest.target,
    'host': APIrequest.host,
    'user': APIrequest.user,
    'pass': APIrequest.pass,
    'args': APIrequest.args,
    'method': APIrequest.method,
    'retry': APIrequest.retry,
    'throttle': APIrequest.throttle,
    'timeout': APIrequest.timeout,
    'interval': APIrequest.interval,
    'pid': APIrequest.pid,
    'autoproc': APIrequest.autoproc,
    parsing: APIrequest.parsing,
    proceedOnTimeOut: APIrequest.proceedOnTimeOut
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
    'proceedOnTimeOut': false,
    'autoproc': false,
    'parsing': 'json' // whether to parse the result as 'json' or 'none' for no parsing. TODO xml, yaml
  };

  // Remove time,next,retries,reqcnt from queueobject as they should only be set by APIqueue
  if (queueobject && typeof queueobject === 'object') {
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
