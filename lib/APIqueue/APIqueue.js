//
// hybrixd - apiqueue.js
// API/Transaction queue processor
//

const sequential = require('../util/sequential');
const scheduler = require('../scheduler/scheduler');
const hosts = require('./hosts');

const TIMER_DEFAULT = 500;

// API queue
const APIqueue = {};
let APIqueueInterval = null; // the API queue main interval loop
let APIqueueInitiated = false; // whether the API queue has been initiated

function isRunning () {
  return !!APIqueueInterval;
}

function isReady () {
  return APIqueueInitiated;
}

// pause the APIqueue
function pause (cbArr) {
  cbArr = cbArr || [];
  if (isRunning()) {
    console.log(' [i] API queue: Paused');
  }
  cbArr.unshift(hosts.closeAll);
  clearInterval(APIqueueInterval);
  APIqueueInterval = null;
  APIqueueInitiated = false;
  sequential.next(cbArr);
}

// resume the APIqueue
function resume (cbArr) {
  if (!isRunning()) {
    console.log(' [i] API queue: Started');
    initialize(cbArr);
  } else {
    sequential.next(cbArr);
  }
}

function call (qid, APIrequest, host, now) {
  APIrequest.retries++; // increase number of tries
  APIrequest.busy = true;

  const errorCallback = e => {
    if (APIqueue.hasOwnProperty(qid)) {
      APIqueue[qid].busy = false;
    }
    console.log(` [!] API queue: error for ${host} -> ` + e);
  };

  hosts.call(host, APIrequest, now, handleResult(qid), errorCallback);
}

function update (qid, APIrequest, now) {
  const timestamp = APIrequest.time;
  const timeout = timestamp + APIrequest.timeout;

  if (!APIrequest.busy && timeout > now && APIrequest.retries < APIrequest.retry) { // there is time and retries left, so the request is still valid
    const host = hosts.findAvailableHost(APIrequest, now);
    if (host) {
      call(qid, APIrequest, host, now);
    }
  } else if (APIrequest.retries >= APIrequest.retry) { // no more retries left : delete the queue object and fail the process
    fail(qid, 'Max number of API call retries exceeded');
  } else if (timeout <= now) { // no more time left : delete the queue object and fail the process
    fail(qid, 'Request timed out (' + APIrequest.timeout + ' ms)');
  }
}

function initialize (callbackArray) {
  if (!APIqueueInitiated) {
    console.log(` [i] API Queue: Initialized.`);
    APIqueueInitiated = true;
    APIqueueInterval = setInterval(updateApiQueue, TIMER_DEFAULT); // every 'timer' milliseconds push transactions from the queue...
  }
  sequential.next(callbackArray);
}

function updateApiQueue () {
  Object.keys(APIqueue)
    .forEach(updateQueueItem(Date.now()));
}

function updateQueueItem (now) {
  return qid => {
    update(qid, APIqueue[qid], now);
  };
}

const handleResult = qid => data => {
  if (!APIqueue.hasOwnProperty(qid)) {
    console.log(' [!] API queue: request ' + qid + ' not found');
  } else {
    const APIrequest = APIqueue[qid];
    try {
      switch (APIrequest.parsing) {
        case 'none' : break;
        case 'json' :
        default:
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          break;
      }
    } catch (result) {
      console.log(' [!] API queue: parsing failed: ' + data);
      fail(qid, 'Parsing failed');
      return;
    }
    done(qid, data);
  }
};

function done (qid, data) {
  const APIrequest = APIqueue[qid];
  const processID = APIrequest.pid;
  delete APIqueue[qid];
  scheduler.jump(processID, APIrequest.jumpOnSuccess, data, e => console.log(' [i] API queue: jump error:' + e)); // TODO fail on jump error
}

function fail (qid, data) {
  const APIrequest = APIqueue[qid];
  const processID = APIrequest.pid;
  delete APIqueue[qid];
  scheduler.jump(processID, APIrequest.jumpOnFailure, data, e => console.log(' [i] API queue: jump error:' + e));// TODO fail on jump error
}

function insert (queueobject) {
  const suffix = `0000${Math.random() * 9999}`.slice(-4);
  const now = Date.now();
  const qid = now + suffix.toString();

  let queueobjectInit = { // Sane defaults
    busy: false, // (Not modifiable)
    time: now, // (Not modifiable)
    retries: 0, // number of retries done (Not modifiable)

    cache: 12000,
    retry: 5, // max nr of retries allowed
    throttle: 5,
    timeout: 30000,

    method: 'POST',
    host: null,
    args: null, // data passed to call (inluding args.headers and args.path)

    parsing: 'json', // whether to parse the result as 'json' or 'none' for no parsing. TODO xml, yaml,

    pid: null,
    jumpOnSuccess: 1,
    jumpOnFailure: 1
  };

  const notModifiables = ['busy', 'time', 'retries'];

  if (queueobject && typeof queueobject === 'object') notModifiables.forEach(deleteStatusWhenQueued(queueobject)); // Remove from queueobject as they should only be set by APIqueue
  APIqueue[qid] = Object.assign(queueobjectInit, queueobject);
}

function deleteStatusWhenQueued (queue) {
  return status => {
    if (queue.hasOwnProperty(status)) { delete queue[status]; }
  };
}

exports.initialize = initialize;
exports.add = insert;
exports.pause = pause;
exports.resume = resume;
exports.isRunning = isRunning;
exports.isReady = isReady;
