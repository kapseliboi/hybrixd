//
// hybrixd - apiqueue.js
// API/Transaction queue processor
//

const sequential = require('../util/sequential');
const hosts = require('./hosts');
const fs = require('fs');

const DEFAULT_APIREQUEST_TIMEOUT = 14500; // Note: Should  be less than process timeout
const DEFAULT_APICACHE_TIME = 12000;
const DEFAULT_RETRY_LIMIT = 5;
const DEFAULT_THROTTLE = 5;

const TIMER_DEFAULT = 100;

// API queue
const APIqueue = {};
let APIqueueInterval = null; // the API queue main interval loop
let APIqueueInitiated = false; // whether the API queue has been initiated

const testDataFile = './APIqueue/testData.json';
let testMode = false; // when in test mode the testData is used as fallback
let testModeForce = false; // when in test mode force the testData is used without checking for available data
const testData = {};

function escapeJSON (str) {
  return str
    .replace(/[\\]/g, '\\\\')
    .replace(/["]/g, '\\"')
    .replace(/[/]/g, '\\/')
    .replace(/[\b]/g, '\\b')
    .replace(/[\f]/g, '\\f')
    .replace(/[\n]/g, '\\n')
    .replace(/[\r]/g, '\\r')
    .replace(/[\t]/g, '\\t');
}

function getTestQuery (APIrequest) {
  const methodPOST = APIrequest.method === 'POST';
  const tcpHost = (APIrequest.host + '').startsWith('tcp://');
  const wsHost = (APIrequest.host + '').startsWith('ws://') || (APIrequest.host + '').startsWith('wss://');
  if (methodPOST || tcpHost || wsHost) {
    const data = APIrequest.args.data;
    let generalizedData;
    if (typeof data === 'object' && data !== null) {
      generalizedData = {};
      for (let key in data) {
        if (key !== 'id') { // we need to remove identifiers
          generalizedData[key] = data[key];
        }
      }
    } else {
      generalizedData = data;
    }
    return escapeJSON(APIrequest.host + APIrequest.args.path + JSON.stringify(generalizedData));
  } else {
    return escapeJSON(APIrequest.host + APIrequest.args.path);
  }
}

function isTesting () { return testMode; }

function testStart (force) {
  testModeForce = !!force;
  testMode = true;
  if (fs.existsSync(testDataFile)) {
    const newTestData = JSON.parse(fs.readFileSync(testDataFile, 'utf-8'));
    for (let query in newTestData) {
      testData[query] = newTestData[query];
    }
  }
}

function testStop () {
  testMode = false;
  testModeForce = false;
}

function testWrite (APIrequest, data) {
  const query = getTestQuery(APIrequest);
  global.hybrixd.logger(['test', 'apiQueue'], 'Write to test data: ', query);
  testData[query] = data;
  fs.writeFileSync(testDataFile, JSON.stringify(testData));
}

function testRead (APIrequest, qid) {
  const query = getTestQuery(APIrequest);
  if (testData.hasOwnProperty(query)) {
    global.hybrixd.logger(['test', 'apiQueue'], 'Read from test data: ', query);
    done(qid, testData[query], true);
    return true;
  } else {
    global.hybrixd.logger(['test', 'apiQueue'], 'No test data available for: ', query);
    return false;
  }
}

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
    global.hybrixd.logger(['info', 'apiQueue'], 'Paused');
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
    global.hybrixd.logger(['info', 'apiQueue'], 'Started');
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
    global.hybrixd.logger(['error', 'apiQueue'], `error for ${host} -> ` + e);
  };

  hosts.call(host, APIrequest, now, handleResult(qid), errorCallback);
}

function update (qid, APIrequest, now) {
  const timestamp = APIrequest.time;
  const timeout = timestamp + APIrequest.timeout;
  if (testMode && testModeForce) { // skip the call, only use cached data
    if (testRead(APIrequest, qid)) {
      // cached data found
    } else {
      fail(qid, 'Test mode force with no test data available');
    }
  } else {
    // global.hybrixd.logger(['debug', 'apiQueue'], `Update ${APIrequest.host}`);

    if (!APIrequest.busy && timeout > now && APIrequest.retries < APIrequest.retry) { // there is time and retries left, so the request is still valid
      const host = hosts.findAvailableHost(APIrequest, now);
      if (host) {
        // global.hybrixd.logger(['debug', 'apiQueue'], `Call ${host}`);
        call(qid, APIrequest, host, now);
      } else {
        // global.hybrixd.logger(['debug', 'apiQueue'], `No host available yet for ${APIrequest.host} (${APIrequest.retries}/${APIrequest.retry})`);
      }
    } else if (APIrequest.retries >= APIrequest.retry) { // no more retries left : delete the queue object and fail the process
      global.hybrixd.logger(['error', 'apiQueue'], `Max number of API call retries exceeded for ${APIrequest.host}.`);
      fail(qid, 'Max number of API call retries exceeded');
    } else if (timeout <= now) { // no more time left : delete the queue object and fail the process
      global.hybrixd.logger(['error', 'apiQueue'], `Time out for for ${APIrequest.host}.`);
      fail(qid, 'Request timed out (' + APIrequest.timeout + ' ms)');
    }
  }
}

function initialize (callbackArray) {
  if (!APIqueueInitiated) {
    global.hybrixd.logger(['info', 'apiQueue'], `Initialized.`);
    APIqueueInitiated = true;
    APIqueueInterval = setInterval(updateApiQueue, TIMER_DEFAULT);
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
    global.hybrixd.logger(['error', 'apiQueue'], 'request ' + qid + ' not found');
  } else {
    const APIrequest = APIqueue[qid];
    try {
      switch (APIrequest.parsing) {
        case 'none' : break;
        case 'json' :
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          break;
        case 'auto' :
        default:
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch (e) {
              // FIXME API queue: no JSON, skipping parsing...
            }
          }
          break;
      }
    } catch (result) {
      global.hybrixd.logger(['error', 'apiQueue'], 'Parsing failed: (/proc/' + APIrequest.qrtzProcessStep.getProcessID() + ') ' + data);
      fail(qid, 'Parsing failed ');
      return;
    }
    done(qid, data);
  }
};

function done (qid, data, skipWrite) {
  const APIrequest = APIqueue[qid];

  // global.hybrixd.logger(['debug', 'apiQueue'], `Done ${APIrequest.host}`);

  if (testMode && !skipWrite) {
    testWrite(APIrequest, data);
  }
  const qrtzProcessStep = APIrequest.qrtzProcessStep;
  delete APIqueue[qid];
  qrtzProcessStep.jump(APIrequest.jumpOnSuccess, data); // TODO what if jump fails
}

function fail (qid, data) {
  const APIrequest = APIqueue[qid];
  if (testMode && !testModeForce && testRead(APIrequest, qid)) {
    // skip failure, got fallback reply from test data
  } else {
    const qrtzProcessStep = APIrequest.qrtzProcessStep;
    delete APIqueue[qid];
    qrtzProcessStep.jump(APIrequest.jumpOnFailure, data); // TODO what if jump fails
  }
}

function insert (queueobject) {
  const suffix = `0000${Math.random() * 9999}`.slice(-4);
  const now = Date.now();
  const qid = now + suffix.toString();

  let queueobjectInit = { // Sane defaults
    busy: false, // (Not modifiable)
    time: now, // (Not modifiable)
    retries: 0, // number of retries done (Not modifiable)

    cache: DEFAULT_APICACHE_TIME,
    retry: DEFAULT_RETRY_LIMIT, // max nr of retries allowed
    throttle: DEFAULT_THROTTLE,
    timeout: DEFAULT_APIREQUEST_TIMEOUT,

    method: 'POST',
    host: null,
    args: null, // data passed to call (inluding args.headers and args.path)

    parsing: 'auto', // whether to parse the result as 'auto', 'json' or 'none' for no parsing. TODO: xml, yaml,

    qrtzProcessStep: null,
    jumpOnSuccess: 1,
    jumpOnFailure: 1
  };

  const notModifiables = ['busy', 'time', 'retries'];
  if (queueobject && typeof queueobject === 'object') notModifiables.forEach(deleteStatusWhenQueued(queueobject)); // Remove from queueobject as they should only be set by APIqueue

  APIqueue[qid] = Object.assign(queueobjectInit, queueobject);
  const APIrequest = APIqueue[qid];
  if (APIrequest.qrtzProcessStep) {
    const processTimeOut = APIrequest.qrtzProcessStep.getTimeOut();
    if (processTimeOut <= APIrequest.timeout) {
      APIrequest.timeout = processTimeOut - 500; // ensure api request timeout is always smaller than process timeout
    }
  }
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
exports.testStart = testStart;
exports.testStop = testStop;
exports.isTesting = isTesting;
