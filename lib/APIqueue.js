//
// hybridd - apiqueue.js
// API/Transaction queue processor
//
var WebSocket = require('ws');

exports.initialize = initialize;
exports.add = insert;
exports.pause = pause;
exports.resume = resume;

// pause the APIqueue
function pause (callbackArray) {
  if (global.hybridd.APIqueueInterval) {
    console.log(' [i] REST API has been paused');
  }
  clearInterval(global.hybridd.APIqueueInterval);
  global.hybridd.APIqueueInterval = null;
  global.hybridd.APIqueueInitiated = false;
  functions.sequential(callbackArray);
}

// resume the APIqueue
function resume (callbackArray) {
  if (!global.hybridd.APIqueueInterval) {
    console.log(' [i] REST API has been started');
    initialize(callbackArray);
  } else {
    functions.sequential(callbackArray);
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
    console.log(` [!] API queue -> ${result}`);
  });
}

function webSocketCall (link, host, qpath, args, method, processID, qid) {
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
  link.send(JSON.stringify(args.data));
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
            if (typeof APIrequest.host === 'string') {
              var host = APIrequest.host;
            } else {
              var host = APIrequest.host[APIrequest.reqcnt];

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

              if (host.substr(0, 5) === 'ws://' || host.substr(0, 6) === 'wss://') {
                webSocketCall(link, host, qpath, args, method, processID, qid);
              } else {
                httpCall(link, host, qpath, args, method, processID, qid);
              }
            } else if (host.substr(0, 5) === 'ws://' || host.substr(0, 6) === 'wss://') { // Create temporary websocket client
              try {
                var ws = new WebSocket(host, {});

                ws.on('open', function open () {
                  console.log(' [i] WebSocket ' + host + ' opened.');
                  webSocketCall(link, host, qpath, args, method, processID, qid);
                }).on('close', function close () {
                  console.log(' [i] WebSocket ' + host + ' closed.');
                }).on('error', function error (code, description) {
                  console.log(' [i] WebSocket ' + host + ' : Error ' + code + ' ' + description);
                });

                link = ws;
              } catch (result) {
                console.log(`[!] Error initiating WebSocket -> ${result}`);
              }
            } else { // Create temporary http/REST client
              var Client = require('./rest').Client;
              var options = {};
              if (APIrequest.user) { options.user = APIrequest.user; }
              if (APIrequest.pass) { options.password = APIrequest.pass; }
              link = new Client(options); // create temporary Client to perform curl call.
              httpCall(link, host, qpath, args, method, processID, qid);
            }
          } catch (result) { console.log(` [!] API queue catch -> ${result}`); }
        } else if (DEBUG) {
          console.log(' [i]  API-QUEUE: WAITING ON ' + target + '... ' + APIrequest.retries + '/' + APIrequest.retry);
        }
      } else if (APIrequest.retries >= APIrequest.retry) {
        // timeout: if no more retries delete the queue object
        if (DEBUG) {
          console.log(' [!] API-QUEUE: TIMEOUT' + target + ' ' + processID);
        }
        scheduler.error(processID, 'API queue time out.');
        delete global.hybridd.APIqueue[qid];
      }
    }
  }, timer); // every 'timer' milliseconds push transactions from the queue...

  return 1;
}

function restaction (properties) {
  var err = 0;

  if (!global.hybridd.APIqueue.hasOwnProperty(properties.qid)) {
    console.log(' [!] API queue request not found.');
    return 1;
  }

  APIrequest = global.hybridd.APIqueue[properties.qid];

  if (APIrequest.autoproc) { // Auto proc option is to automatically resolve hybridd "two step API calls"
    if (properties.data.id === 'id') { // 1) if the response contains id="id" then it is a reference to process
      APIrequest.args.path = '/proc/' + properties.data.data; // 2) call /proc/$ID  at the same target to retrieve the process
      insert(APIrequest);
      delete global.hybridd.APIqueue[properties.qid];
      return 0;
    } else if (properties.data.hasOwnProperty('started')) { // 3) the response should be a process which contains a started property
      var stopped = typeof properties.data.stopped !== 'undefined' ? properties.data.stopped : null;
      if (!stopped) { // 4) If the [rocess has not finished yet, call again to check
        insert(APIrequest);
        delete global.hybridd.APIqueue[properties.qid];
        return 0;
      } else { // 5) once the process has finished: return the result.
        properties.data = properties.data.data;
      }
    } else {
      err = 1;
      console.log(' [i] API Queue : auto proc failure.');
    }
  }

  if (err === 0) {
    var parsing = APIrequest.parsing || 'json'; // parsing method, defaults to JSON
    try {
      switch (parsing) {
        case 'json' : properties.data = JSON.parse(properties.data); break;
        case 'none' : break;
      }
    } catch (result) {
      if (typeof properties.data !== 'object') {
        err = 1;
      }
    }
  }

  if (err === 0) {
    delete global.hybridd.APIqueue[properties.qid];

    scheduler.stop(properties.processID, {
      'err': 0,
      'data': properties.data
    });
  } else {
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
    'target': null // TODO rename to symbol? : should be removed, only base (upto .) is currently used
    // "user":null // user:password perhaps in the future, be aware of PEEK, admins can see data
    // proxy
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
