//
// hybrixd - apiqueue.js
// API/Transaction queue processor
//

const Client = require('./util/rest').Client;
const WebSocket = require('ws');
const teletype = require('teletype');
const sequential = require('./util/sequential');
const scheduler = require('./scheduler/scheduler');

const TIMER_DEFAULT = 500;
const DEFAULT_TCP_PORT = 23;

/*
  Globals:
  - global.hybrixd.APIqueueInterval
  - global.hybrixd.APIqueueInitiated
  - global.hybrixd.APIqueue
  - global.hybrixd.APIhost
*/
// pause the APIqueue
function pause (cbArr) {
  if (global.hybrixd.APIqueueInterval) {
    console.log(' [i] API queue: REST API has been paused');
  }
  clearInterval(global.hybrixd.APIqueueInterval);
  global.hybrixd.APIqueueInterval = null;
  global.hybrixd.APIqueueInitiated = false;
  sequential.next(cbArr);
}

// resume the APIqueue
function resume (cbArr) {
  if (!global.hybrixd.APIqueueInterval) {
    console.log(' [i] API queue: REST API has been started');
    initialize(cbArr);
  } else {
    sequential.next(cbArr);
  }
}

function tcpCall (link, host, qpath, args, method, processID, qid) {
  if (typeof args.data !== 'string') { args.data = JSON.stringify(args.data); }

  typeof link.exec === 'function'
    ? link.exec(args.data, /\n/)
      .then(doRestactionAndClose(qid, processID, host, link))
      .catch(tcpError(qid, host, link))
    : defaultError(qid, host, 'TCP')('link.exec not defined yet.');
}

function doRestactionAndClose (qid, processID, host, link) {
  return function (data) {
    restaction({
      'processID': processID,
      'qid': qid,
      'data': data
    });
    link.close();
    delete global.hybrixd.APIhost[host];
  };
}

function tcpError (qid, host, link) {
  return function (e) {
    defaultError(qid, host, 'TCP link')(e);
    link.close();
    delete global.hybrixd.APIhost[host];
  };
}

function httpCall (link, host, qpath, args, method, processID, qid) {
  const args_ = method === 'GET' ? {} : args;
  const methodLowerCase = method.toLowerCase();
  const idx = {
    qid,
    processID
  };

  if (args_ && args_.headers && method === 'POST') { // To handle a bug in Node JS which makes the server vulnerable to DDOS
    args_.headers['content-length'] = args_.data
      ? !isNaN(args_.data.length)
        ? args_.data.length
        : 0
      : 0;
  }

  let postresult = link[methodLowerCase](host + qpath, args_, doRestaction.bind(idx));

  postresult.once('error', defaultError(qid, host, 'HTTP'));
}

function webSocketCall (link, host, qpath, args, method, processID, qid) {
  const idx = {
    qid: qid,
    processID: processID
  };

  if (link.readyState) {
    link.once('message', doRestaction.bind(idx))
      .once('error', defaultError)
      .once('open', function () { console.log(' [i] API queue: WebSocket open for ' + host); });
    if (typeof args.data !== 'string') { args.data = JSON.stringify(args.data); }
    link.send(args.data, function (error) {
      if (typeof error !== 'undefined') {
        console.log(' [!] API queue: WebSocket error for ' + this.host + ' -> ' + error);
      }
    }.bind({host}));
  } else {
    global.hybrixd.APIqueue[qid].busy = false;
  }
}

function doRestaction (data, response) {
  restaction({
    'processID': this.processID,
    'qid': this.qid,
    'data': data
  });
}

function defaultError (qid, host, protocolStr) {
  return function (e) {
    if (global.hybrixd.APIqueue.hasOwnProperty(qid)) {
      global.hybrixd.APIqueue[qid].busy = false;
    }
    console.log(` [!] API queue: ${protocolStr} error for ${host} -> ` + e);
  };
}

function getLastRequestTime (host) {
  return global.hybrixd.APIhost.hasOwnProperty(host)
    ? global.hybrixd.APIhost[host].lastRequestTime
    : 0;
}

function setLastRequestTime (host, now) {
  if (!global.hybrixd.APIhost.hasOwnProperty(host)) global.hybrixd.APIhost[host] = {};
  global.hybrixd.APIhost[host].lastRequestTime = now;
}

function mkWsLink (host) {
  let link = new WebSocket(host, {});

  return link.on('open', function open () {
    console.log(' [i] API queue: Websocket ' + this.host + ' opened');
  }.bind({host})).on('close', function close () {
    console.log(' [i] API queue: Websocket ' + this.host + ' closed');
    delete (global.hybrixd.APIhost.host);
  }.bind({host})).on('error', function error (error) {
    console.log(' [i] API queue: Websocket ' + this.host + ' : Error ' + error);
  }.bind({host}));
}

function mkTcpLink (host) {
  const hostSplit = host.substr(6).split(':');
  const hostaddr = hostSplit[0];
  const hostport = hostSplit[1] ? Number(hostSplit[1]) : DEFAULT_TCP_PORT;

  return teletype(hostaddr, hostport);
  // console.log(' [i] API queue: TCP link ' + hostaddr + ':' + hostport + ' opened');
}

function mkHttpLink (APIrequest) {
  let options = {};
  if (APIrequest.user) { options.user = APIrequest.user; }
  if (APIrequest.pass) { options.password = APIrequest.pass; }

  /*
    TODO possibly to extend options:
    proxy
    connection
    mimetypes
    requestConfig
    rejectUnauthorized
  */

  return new Client(options);
}

function mkLink (APIrequest, host) {
  let link = null;
  if (host.startsWith('ws://') || host.startsWith('wss://')) {
    link = mkWsLink(host);
  } else if (host.startsWith('tcp://')) {
    link = mkTcpLink(host);
  } else if (host.startsWith('http://') || host.startsWith('https://')) {
    link = mkHttpLink(APIrequest);
  } else {
    console.log(' [i] API queue: Unknown protocol for :' + host);
    return null;
    // todo error unknown protocol
  }
  return link;
}

function getLink (host, APIrequest) {
  let link = null;
  if (global.hybrixd.APIhost.hasOwnProperty(host)) {
    return global.hybrixd.APIhost[host].link;
  } else {
    link = mkLink(APIrequest, host);
  }
  global.hybrixd.APIhost[host] = {
    link: link,
    lastRequestTime: 0
  };
  return link;
}

function call (qid, APIrequest, host, timer, now) {
  let processID = APIrequest.pid;
  let link = getLink(host, APIrequest);
  setLastRequestTime(host, now); // set the last request time
  APIrequest.retries++; // increase number of tries
  APIrequest.busy = true;

  // get the initialized link
  let args = APIrequest.args;
  let method = APIrequest.method;
  let qpath = (typeof args.path === 'undefined' ? '' : args.path);

  if (!link) {
    console.log(' [!] API queue: Failed to created link for ' + host, link);
    APIrequest.busy = false;
    return;
  }
  try {
    if (host.substr(0, 6) === 'tcp://') {
      tcpCall(link, host, qpath, args, method, processID, qid);
    } else if (host.substr(0, 5) === 'ws://' || host.substr(0, 6) === 'wss://') {
      webSocketCall(link, host, qpath, args, method, processID, qid);
    } else {
      httpCall(link, host, qpath, args, method, processID, qid);
    }
  } catch (e) {
    console.log(' [!] API queue call error for ' + host + ' : ' + e);
  }
}

function getHostOrNull (APIrequest, now) {
  const host = APIrequest.host;
  return now - getLastRequestTime(host) >= 1000 / APIrequest.throttle // check if  the last call was made suffciently long ago
    ? host
    : null;
}

// using throttle and reqcnt (round robin) for load balancing
function findAvailableHost (qid, APIrequest, timer, now) {
  let host = null;
  if (typeof APIrequest.host === 'string') {
    return getHostOrNull(APIrequest, now);
  } else {
    if (APIrequest.host) {
      const offset = Math.floor(Math.random() * APIrequest.host.length);
      for (let i = 0; i < APIrequest.host.length; ++i) {
        const j = (offset + i) % APIrequest.host.length;
        host = APIrequest.host[j];
        if (now - getLastRequestTime(host) >= 1000 / APIrequest.throttle) { // check if the last call was made suffciently long ago
          return host; // found an available host
        }
      }
    }
    return null;
  }
}

function update (qid, APIrequest, timer, now) {
  const timestamp = APIrequest.time;
  const processID = APIrequest.pid;
  const timeout = timestamp + APIrequest.timeout;

  if (!APIrequest.busy && timeout > now && APIrequest.retries < APIrequest.retry) { // there is time and retries left, so the request is still valid
    const host = findAvailableHost(qid, APIrequest, timer, now);
    if (host) {
      call(qid, APIrequest, host, timer, now);
    }
  } else if (APIrequest.retries >= APIrequest.retry) { // no more retries left : delete the queue object and fail the process
    deleteItemFromQueue(processID, qid, 'Max number of API call retries exceeded');
    delete global.hybrixd.APIqueue[qid];
  } else if (timeout <= now) { // no more time left : delete the queue object and fail the process
    deleteItemFromQueue(processID, qid, 'Request timed out (' + APIrequest.timeout + ' ms)');
  }
}

function deleteItemFromQueue (processID, qid, msg) {
  scheduler.pass(processID, 1, msg);
  delete global.hybrixd.APIqueue[qid];
}

function initialize (callbackArray) {
  const timer = TIMER_DEFAULT;

  if (!global.hybrixd.APIqueueInitiated) initializeRestApi(callbackArray);
  global.hybrixd.APIqueueInterval = setInterval(updateApiQueue(callbackArray, timer), timer); // every 'timer' milliseconds push transactions from the queue...

  return 1;
}

function initializeRestApi (cbArr) {
  console.log(` [i] REST API running.`);
  global.hybrixd.APIqueueInitiated = true;
  sequential.next(cbArr);
}

function updateApiQueue (cbArr, timer) {
  return function () {
    const now = Date.now();
    Object.keys(global.hybrixd.APIqueue)
      .forEach(updateQueueItem(timer, now));
  };
}

function updateQueueItem (timer, now) {
  return function (qid) {
    update(qid, global.hybrixd.APIqueue[qid], timer, now);
  };
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
    pid: APIrequest.pid,
    autoproc: APIrequest.autoproc,
    parsing: APIrequest.parsing
  };
}

function insertFollowUp (followUp, properties) {
  insert(followUp);
  delete global.hybrixd.APIqueue[properties.qid];
  return 0;
}

function restaction (properties) {
  let err = 0;

  if (!global.hybrixd.APIqueue.hasOwnProperty(properties.qid)) {
    console.log(' [!] API queue: request ' + properties.qid + ' not found');
    return 1;
  }

  let APIrequest = global.hybrixd.APIqueue[properties.qid];

  if (APIrequest.autoproc) { // Auto proc option is to automatically resolve hybrixd "two step API calls"
    let followUp;
    if (properties.data.id === 'id') { // 1) if the response contains id="id" then it is a reference to process
      followUp = repeatAPIrequest(APIrequest);
      followUp.args.path = '/proc/' + properties.data.data; // 2) call /proc/$ID  at the same target to retrieve the process
      //    followUp.parsing = 'none';
      return insertFollowUp(followUp, properties);
    } else if (properties.data.hasOwnProperty('started')) { // 3) the response should be a process which contains a started property
      if (!properties.data.stopped) { // 4) If the process has not finished yet, call again to check
        followUp = repeatAPIrequest(APIrequest);
        --followUp.retry;
        return insertFollowUp(followUp, properties);
      } else { // 5) once the process has finished: return the result.
        properties.data = properties.data.data;
      }
    } else {
      err = 1;
      console.log(' [i] API queue: auto proc failure!');
    }
  }

  if (err === 0) {
    let parsing = APIrequest.parsing || 'json'; // parsing method, defaults to JSON
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
    delete global.hybrixd.APIqueue[properties.qid];
    scheduler.pass(properties.processID, 0, properties.data);
  } else {
    // TODO do we need to set the process to error?
    if (typeof global.hybrixd.proc[properties.processID] !== 'undefined') {
      global.hybrixd.proc[properties.processID].data = properties.data;
    }
  }

  return err;
}

function insert (queueobject) {
  // sane defaults
  let suffix = `0000${Math.random() * 9999}`.slice(-4);
  let qid = Date.now() + suffix.toString();

  let queueobjectInit = {
    cache: 12000,
    link: null, // digital callback function object
    busy: false,
    method: 'POST',
    retry: 5, // max nr of retries allowed
    retries: 0, // number of retries done (Not modifiable)
    throttle: 5,
    timeout: 30000,
    time: Date.now(), // (Not modifiable)
    next: Date.now(), // (Not modifiable)
    host: null,
    pid: null,
    args: null, // data passed to call (inluding args.headers and args.path)
    target: null, // TODO rename to symbol? : should be removed, only base (upto .) is currently used
    autoproc: false,
    parsing: 'json' // whether to parse the result as 'json' or 'none' for no parsing. TODO xml, yaml

  };
  const statuses = ['busy', 'time', 'next', 'retries'];

  if (queueobject && typeof queueobject === 'object') statuses.forEach(deleteStatusWhenQueued(queueobject)); // Remove busy,time,next,retries from queueobject as they should only be set by APIqueue
  global.hybrixd.APIqueue[qid] = Object.assign(queueobjectInit, queueobject);

  return 1;
}

function deleteStatusWhenQueued (queue) {
  return function (status) {
    if (queue.hasOwnProperty(status)) { delete queue[status]; }
  };
}

exports.initialize = initialize;
exports.add = insert;
exports.pause = pause;
exports.resume = resume;
