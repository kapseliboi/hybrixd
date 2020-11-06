const DEFAULT_PROCESS_TIMEOUT = 15000;
const PROCESS_PURGE_TIME = 600; // process purge time (sec): two minutes

const QrtzFunction = require('./function').QrtzFunction;
const Vars = require('./vars');
const modules = require('../modules');
const conf = require('../conf/conf');
const sequential = require('../util/sequential');
const queuedProcesses = {};
const busyProcesses = {};
const finishedProcesses = {};
const router = require('../router/router.js');
/**
 * @param processID
 */
function getProcess (processID) {
  if (queuedProcesses.hasOwnProperty(processID)) {
    return queuedProcesses[processID];
  } else if (busyProcesses.hasOwnProperty(processID)) {
    return busyProcesses[processID];
  } else if (finishedProcesses.hasOwnProperty(processID)) {
    return finishedProcesses[processID];
  } else {
    return null;
  }
}

/**
 * @param processID
 */
function get404 (processID) {
  return {id: processID, error: 404, data: `Process not found.`};
}

const get403 = (processID) => {
  return {id: processID, error: 403, data: 'Forbidden'};
};

// to expose and pass as first param to qrtz methods
/**
 * @param qrtzStatement
 * @param qrtzProcess
 * @param step
 */
function QrtzProcessStep (qrtzStatement, qrtzProcess, step) {
  let data = null;
  let childData = null;
  let error = 0;
  let progress = null;
  let started = null;
  let stopped = null;

  let childProcessIDCounter = 0;
  const busyChildProcesses = {};
  const finishedChildProcesses = {};
  this.peek = variableName => {
    return Vars.peek(this, variableName);
  };
  this.poke = (variableName, vdata) => {
    return Vars.poke(this, variableName, vdata);
  };
  this.reset = data_ => {
    data = data_;
    childData = null;
    error = 0;
    progress = null;
    started = null;
    stopped = null;
    for (let childID in busyChildProcesses) delete busyChildProcesses[childID];
    for (let childID in finishedChildProcesses) delete finishedChildProcesses[childID];
  };
  this.childReportsStop = (error_, data_, childID, childReferenceID, postProcessCallback) => {
    // the childReferenceID is used to format the resulted data the way the parent expects it
    // for example a qrtz 'each doSomething' called on {a:1,b:2} returns {a:somethingDoneWith(1),b:somethingDoneWith(2)}
    // a and b are the childReferenceID. Their respective childIDs would be 0 and 1
    if (!busyChildProcesses.hasOwnProperty(childID)) {
      global.hybrixd.logger(['error', 'process'], `Orphan process /p/${this.getProcessID()}.${childID} not found. `);
      return;
    }
    const childProcess = busyChildProcesses[childID];

    const onlyChild = childReferenceID === true;

    if (onlyChild) data = data_;
    else {
      if (childData === null) childData = isNaN(childReferenceID) ? {} : [];

      if (isNaN(childReferenceID) && (childData instanceof Array)) { // if an array gets a non numeric key, transform to object
        childData = Object.fromEntries(childData.forEach((value, key) => [key, value]));
      }
      if (data_ instanceof Error) data_ = data_.toString();
      childData[childReferenceID] = data_;
      data = childData;
    }

    delete busyChildProcesses[childID];
    finishedChildProcesses[childID] = childProcess;

    if (typeof postProcessCallback === 'function') postProcessCallback(error_, data_);
    else if (Object.keys(busyChildProcesses).length === 0) { // if last child process has stopped
      let failed, errorData, errorCode;
      if (onlyChild) {
        failed = error_ !== 0;
        errorData = data_;
        errorCode = error_;
      } else {
        for (let childID in finishedChildProcesses) { // if any child process has failed, fail the entire process
          const childErrorCode = finishedChildProcesses[childID].getError();
          if (childErrorCode !== 0) {
            failed = true;
            errorCode = childErrorCode;
            errorData = childData;
            break;
          }
        }
      }
      if (failed) this.fail(errorCode, errorData);
      else this.next(data);
    }
  };

  this.hook = (jumpOrErrOrData, err) => qrtzProcess.hook(step, jumpOrErrOrData, err);

  this.fork = (commandOrFunction, ydata, childReferenceID, options) => {
    let command;
    let qrtzFunction;
    if (commandOrFunction instanceof Array) {
      command = commandOrFunction;
    } else if (commandOrFunction instanceof QrtzFunction) {
      qrtzFunction = commandOrFunction;
      command = [];
    } else {
      this.fail('Illegal fork command or function');
      return 0;
    }
    let subProcess;
    const sessionID = this.getSessionID();
    const recipe = this.getRecipe();
    if (typeof childReferenceID !== 'undefined') { // childProcess
      const vars = options && options.shareScope ? this.getVars() : {};
      const postProcessCallback = typeof options === 'object' && options !== null ? options.callback : undefined;
      const childID = childProcessIDCounter++;
      subProcess = new QrtzProcess({
        data: ydata,
        recipe,
        command,
        timeout: this.getTimeOut(),
        vars,
        function: qrtzFunction,
        sessionID,
        parent: this,
        childID,
        childReferenceID,
        postProcessCallback
      });
      busyChildProcesses[childID] = subProcess;
    } else { // independant process
      subProcess = new QrtzProcess({data: ydata, recipe, command, function: qrtzFunction, sessionID});
      this.next(subProcess.getProcessID()); // if it's an independant process we don't have to wait for it
    }
    return subProcess.getProcessID();
  };

  this.adopt = (processID, childReferenceID, postProcessCallback) => {
    const childID = childProcessIDCounter++;
    const subProcess = getProcess(processID);
    if (subProcess && subProcess.getSessionID() === this.getSessionID()) {
      subProcess.adopt({parent: this, childID, childReferenceID, postProcessCallback});
      busyChildProcesses[childID] = subProcess;
    } else {
      this.fail(`Could not adopt process ${processID}`);
    }
  };

  this.pass = data_ => {
    data = data_;
    qrtzProcess.pass(data);
  };

  this.toString = () => qrtzStatement.toString();

  this.execute = (data_) => { // TODO should not be exposed to non parent
    this.reset(data_);
    started = Date.now();
    qrtzStatement.execute(this);
  };

  this.done = data_ => {
    if (stopped) { return; }
    error = 0;
    data = data_;
    progress = 1;
    stopped = Date.now();
    qrtzProcess.done(data);
  };

  this.jump = (delta, data_) => {
    if (stopped) { return; }
    error = 0;
    data = data_;
    progress = 1;
    stopped = Date.now();
    qrtzProcess.jump(delta, data);
  };
  this.next = data_ => this.jump(1, data_);

  this.kill = () => {
    for (let childID in busyChildProcesses) {
      // TODO not adopted childProcesses though
      busyChildProcesses[childID].kill();
    }
  };

  this.fail = (error_, data_) => {
    if (stopped) { return; }
    if (typeof data_ === 'undefined') {
      data_ = error_;
      error_ = 1;
    }
    error = error_;
    data = data_;
    stopped = Date.now();
    qrtzProcess.fail(error, data);
  };

  this.stop = (error_, data_) => {
    if (error_ === 0) {
      this.done(data_);
    } else {
      this.fail(error_, data_);
    }
  };
  this.prog = (step, steps) => {
    progress = typeof steps === 'undefined' ? step : step / steps;
    qrtzProcess.prog(progress);
  };
  this.mime = mimetype => qrtzProcess.mime(mimetype);
  this.help = help => qrtzProcess.help(help);

  this.setAutoProg = enabled => { qrtzProcess.setAutoProg(enabled); };

  this.setTimeOut = timeOut => {
    timeOut = typeof timeOut === 'undefined' ? DEFAULT_PROCESS_TIMEOUT : timeOut;
    qrtzProcess.setTimeOut(timeOut);
  };
  this.setChildrenTimeOut = timeOut => {
    timeOut = typeof timeOut === 'undefined' ? DEFAULT_PROCESS_TIMEOUT : timeOut;
    for (let childID in busyChildProcesses) {
      busyChildProcesses[childID].setTimeOut(timeOut);
    }
  };

  this.getMime = () => qrtzProcess.getMime();
  this.getHelp = () => qrtzProcess.getHelp();
  this.getProgress = () => progress;

  this.getProcessID = () => qrtzProcess.getProcessID() + '.' + step;
  this.getData = () => data;
  this.getError = () => error;
  this.getProcessData = () => qrtzProcess.getData();
  this.getTimeOut = () => qrtzProcess.getTimeOut();
  this.getCommand = index => qrtzProcess.getCommand(index);
  this.getRecipe = () => qrtzProcess.getRecipe();
  this.getVars = () => qrtzProcess.getVars();
  this.getParentVars = () => qrtzProcess.getParentVars();
  this.getSessionID = () => qrtzProcess.getSessionID();

  this.getInfo = (sessionID_) => {
    return this.getSessionID() !== sessionID_ && sessionID_ !== 1
      ? get403(this.getProcessID())
      : {id: this.getProcessID(), error, data, started, stopped, progress};
  };

  this.addDebug = (result, sessionID, prefix) => {
    prefix += '.' + step;
    result[prefix] = {...this.getInfo(sessionID), labels: {}, qrtz: this.toString()};
    for (let subID in busyChildProcesses) {
      busyChildProcesses[subID].addDebug(result, sessionID, prefix + '.' + subID);
    }
    for (let subID in finishedChildProcesses) {
      finishedChildProcesses[subID].addDebug(result, sessionID, prefix + '.' + subID);
    }
  };

  const logger = logType => function (messages_) {
    const recipe = this.getRecipe();
    const id = typeof recipe === 'object' && recipe !== null
      ? recipe.id
      : undefined;
    const messages = Array.from(arguments);
    global.hybrixd.logger.apply(global.hybrixd.logger, [[logType, id], ...messages]);
  }.bind(this);

  this.warn = logger('error');
  this.logs = logger('info');

  this.func = (command, data) => {
    const head = command[0];

    const moduleID = this.getRecipe().module;
    if (!modules.module.hasOwnProperty(moduleID)) {
      this.fail(`Unknown module '${moduleID}'`);
    } else if (!modules.module[moduleID].main.hasOwnProperty(head)) {
      this.fail(`Unknown function '${head}' for module '${moduleID}'`);
    } else {
      const pass = data => { this.pass(data); };
      const done = data => { this.next(data); };
      const stop = (err, data) => { if (err !== 0) { this.fail(err, data); } else { this.next(data); } };
      const fail = (err, data) => { this.fail(err, data); };
      const prog = (step, steps) => { this.prog(step, steps); };

      const mime = mimetype => { this.mime(mimetype); };
      const peek = (key, fallback) => {
        const result = this.peek(key);
        return result.e || typeof result.v === 'undefined'
          ? fallback
          : result.v;
      };
      const poke = (key, value) => { this.poke(key, value); };
      const help = helpMessage => { this.help(helpMessage); };
      const fork = (path, data) => {
        if (typeof path !== 'string') this.fail(1, 'fork: expected string path');
        else this.fork(path.split('/'), data);
      };
      const rout = (path, data, dataCallback, errorCallback) => {
        // TODO use callbacks
        router.route({url: path, sessionID: sessionID, data, hideInLogs: true});
      };
      const getMime = () => { this.getMime(); };
      const getHelp = () => { this.getHelp(); };
      const getProgress = () => { this.getProgress(); };

      const sessionID = this.getSessionID();
      try {
        modules.module[moduleID].main[ head ]({
          pass,
          done,
          stop,
          fail,
          peek,
          poke,
          prog,
          mime,
          help,
          rout,
          fork,
          // TODO fork (with callback) -> each, call
          getMime,
          getHelp,
          getProgress,
          sessionID,
          logs: this.logs,
          warn: this.warn,
          command: JSON.parse(JSON.stringify(command))}, data);
      } catch (error) {
        const internalErrorMessage = `Javascript module failure for ${moduleID}.${head} : ${error instanceof Error ? error.stack : error}`;
        global.hybrixd.logger(['error', 'process'], internalErrorMessage);
        const externalErrorMessage = this.getSessionID() === 1 // root session gets full details on error
          ? internalErrorMessage
          : 'Javascript module failure';
        this.fail(1, externalErrorMessage);
      }
    }
  };
}

/**
 *
 */
function purgeProcesses () {
  const procPurgeTime = (conf.get('scheduler.ProcPurgeTime') || PROCESS_PURGE_TIME) * 1000;
  const now = Date.now();

  for (let processID in busyProcesses) {
    const process = busyProcesses[processID];
    const timeOut = process.getTimeOut();
    if (timeOut >= 0 && process.getStarted() < now - timeOut) { // set error when process has timed out on its short-term action
      global.hybrixd.logger(['error', 'process'], `Busy process /p/${processID} timed out after ${timeOut}ms`);
      process.fail('Process timed out after ' + timeOut + 'ms');
    }
  }
  let count = 0;
  for (let processID in finishedProcesses) {
    const process = finishedProcesses[processID];
    const timeOut = process.getTimeOut();
    if (timeOut >= 0 && process.getStopped() < now - procPurgeTime) {
      delete finishedProcesses[processID];
      ++count;
    }
  }
  if (count > 0) {
    global.hybrixd.logger(['info', 'process'], 'purged ' + count + ' stale processes');
  }
}

let updateInProgress = false;
/**
 * @param maxUsage
 * @param maxParallelProcesses
 */
function updateProcesses (maxUsage, maxParallelProcesses) {
  if (updateInProgress) return;
  updateInProgress = true;

  let schedulerParallelProcesses = Object.keys(queuedProcesses).length;
  let now = Date.now();
  const end = now + maxUsage; // end of the allowed timeframe

  while (now <= end && schedulerParallelProcesses > 0) { // run through all processes for a maximum timeframe if there are active processes
    const currentProcesses = Object.values(queuedProcesses).slice(0);

    schedulerParallelProcesses = currentProcesses.length;

    for (let i = 0; i < currentProcesses.length && i < maxParallelProcesses; ++i) {
      currentProcesses[i].update(now);
    }
    now = Date.now();
  }
  updateInProgress = false;
}

/**
 *
 */
function killAll () {
  for (let processID in queuedProcesses) {
    const process = queuedProcesses[processID];
    process.kill();
  }
  for (let processID in busyProcesses) {
    const process = busyProcesses[processID];
    process.kill();
  }
}

/**
 * @param properties
 * @param recipe
 * @param command
 */
function getQrtzFunction (properties, recipe, command) {
  if (properties.hasOwnProperty('function') && properties.function instanceof QrtzFunction) {
    return properties.function;
  } else if (properties.hasOwnProperty('steps') && properties.steps instanceof Array) {
    return new QrtzFunction(properties.steps);
  } else if (recipe.hasOwnProperty('quartz')) {
    if (command.length > 0) {
      for (let functionSignature in recipe.quartz) {
        const functionSignatureSplit = functionSignature.split('/');
        const functionName = functionSignatureSplit[0];
        if (functionName === command[0]) {
          const stepsOrFunction = recipe.quartz[functionSignature];
          if (stepsOrFunction instanceof Array) {
            return new QrtzFunction(stepsOrFunction, functionSignatureSplit);
          } else {
            return stepsOrFunction;
          }
        }
      }
    }
    if (recipe.quartz.hasOwnProperty('_root')) {
      const stepsOrFunction = recipe.quartz._root;
      if (stepsOrFunction instanceof Array) {
        return new QrtzFunction(stepsOrFunction);
      } else {
        return stepsOrFunction;
      }
    } else {
      global.hybrixd.logger(['error', 'process'], 'Failed to create process', command);
      return new QrtzFunction([['fail', 'Failed to create process']]);
    }
  } else {
    global.hybrixd.logger(['error', 'process'], 'Failed to create process', command);
    return new QrtzFunction([['fail', 'Failed to create process']]);
  }
}

let lastProcesssSubIDInThisTimeWindow = 0;
let currentTimeWindow = 0;

/**
 * @param properties
 */
function getProcessID (properties) {
  if (properties.parent) {
    return properties.parent.getProcessID() + '.' + properties.childID;
  } else {
    const now = Date.now();
    let processSubID;
    if (now === currentTimeWindow) {
      processSubID = ++lastProcesssSubIDInThisTimeWindow;
    } else {
      lastProcesssSubIDInThisTimeWindow = 0;
      currentTimeWindow = now;
      processSubID = 0;
    }
    const suffix = `000000${processSubID}`.slice(-6);
    return now + suffix;
  }
}

// do not expose outside this file
/**
 * @param properties
 */
function QrtzProcess (properties) {
  // properties
  // - sessionID,
  // - data,
  // - command,
  // - [recipe,]
  // - [function],[steps]
  // - parent : the parent ProcessStep
  // - childID : the actual child id
  // - childReferenceID : an id used for reference by the parent ProcessStep

  // TODO wchan
  // - mime
  //      offset: process.offset,
  //    length: process.length,
  //    hash: process.hash,

  const parent = properties.parent;
  const postProcessCallback = properties.postProcessCallback;

  const childID = properties.childID;
  const childReferenceID = properties.childReferenceID;

  const processID = getProcessID(properties);

  let data = properties.hasOwnProperty('data') ? properties.data : null;
  let error = 0;

  let command = properties.command || {};

  const recipe = properties.recipe || {};
  const qrtzFunction = getQrtzFunction(properties, recipe, command);

  let busy = false;
  let step = null;

  let progress = null; // 0 is started, 1 = completed
  let autoprog = true; // whether to use step/stepCount as progress
  let timeout = properties.timeout || DEFAULT_PROCESS_TIMEOUT;

  const started = Date.now();
  let stopped = null;
  let sessionID = properties.sessionID || 0;

  let mime;
  let help;

  const adopters = []; // this process can become a child process for another process, as happens with the qrtz rout command

  let hook = null; // determines on failure behaviour (for process errors and API queue time outs)
  let timeHook = null; // determines on failure behaviour (for process time outs)
  const vars = properties.vars || {}; // variables used by quartz.poke and quartz.peek

  if (qrtzFunction instanceof QrtzFunction) {
    qrtzFunction.setNamedCommandVars(command, vars);
  }

  const processSteps = qrtzFunction instanceof QrtzFunction
    ? qrtzFunction.getStatements().map((qrtzStatement, step) => new QrtzProcessStep(qrtzStatement, this, step))
    : null;

  const reportStopToParents = (error, data) => {
    if (parent) {
      parent.childReportsStop(error, data, childID, childReferenceID, postProcessCallback);
    }
    for (let adopter of adopters) {
      const parent = adopter.parent;
      const childID = adopter.childID;
      const childReferenceID = adopter.childReferenceID;
      const postProcessCallback = adopter.postProcessCallback;
      parent.childReportsStop(error, data, childID, childReferenceID, postProcessCallback);
    }
  };

  this.adopt = properties => { // this process is being adopted as a child by another process
    adopters.push(properties);
  };

  this.done = data_ => {
    if (stopped) return;
    error = 0;
    data = data_;
    this.kill();
  };

  this.fail = (error_, errorMessage) => {
    if (stopped) return undefined;
    if (typeof errorMessage === 'undefined') {
      errorMessage = error_;
      error_ = 1;
    }

    if (hook) {
      if (hook.hasOwnProperty('jump')) {
        const ydata = hook.hasOwnProperty('data') ? hook.data : data;
        const jump = hook.jump - step;
        hook = null;
        return this.jump(jump, ydata);
      } else if (hook.hasOwnProperty('data')) {
        if (hook.error === 0) {
          const data = hook.data;
          hook = null;
          return this.done(data);
        } else {
          error = hook.error;
          data = hook.data;
          hook = null;
          return this.kill(error, data);
        }
      }
    }

    data = errorMessage;
    error = error_;
    return this.kill();
  };

  this.kill = () => {
    stopped = Date.now();
    busy = false;
    finishedProcesses[processID] = this;
    delete busyProcesses[processID];
    delete queuedProcesses[processID];
    reportStopToParents(error, data);
    for (let processStep of processSteps) {
      processStep.kill();
    }
  };

  this.jump = (delta, data_) => {
    if (stopped) return;
    data = data_;
    if (delta === 0) { this.fail('Illegal zero jump.'); return; }
    if (delta + step < 0) { this.fail('Illegal negative jump.'); return; }
    if (delta + step > qrtzFunction.getStepCount()) { this.fail('Illegal out of bounds jump.'); return; }
    if (delta + step === qrtzFunction.getStepCount()) { this.done(data); return; }
    step += delta;
    busy = false;
    delete busyProcesses[processID];
    queuedProcesses[processID] = this;
  };

  this.pass = data_ => {
    data = data_;
  };

  this.update = now => {
    if (timeout && started + timeout < now) {
      global.hybrixd.logger(['error', 'process'], `Queued process /p/${this.getProcessID()} timed out after ${timeout}ms.`);
      this.fail('Process timed out after ' + timeout + ' ms.');
      return;
    }
    delete queuedProcesses[processID];

    if (stopped) {
      finishedProcesses[processID] = this;
      delete busyProcesses[processID];
      return;
    }

    if (busy) return;
    busyProcesses[processID] = this;
    busy = true;

    if (autoprog) {
      progress = step / (qrtzFunction.getStepCount() - 1);
    }
    if (step === processSteps.length) { this.done(data); return; }
    if (step > processSteps.length) { this.fail('Illegal out of bounds step.'); return; }
    if (step < 0) { this.fail('Illegal negative step.'); return; }
    if (isNaN(step)) { this.fail('Illegal non numeric step.'); return; }
    processSteps[step].execute(data);
  };

  this.hook = (step, jumpOrErrOrData, error) => {
    if (isNaN(jumpOrErrOrData)) hook = {data: jumpOrErrOrData, error};
    else if (Number(jumpOrErrOrData) === 0) this.fail('hook: illegal zero jump.');
    else if (Number(jumpOrErrOrData) + step < 0) this.fail('hook: illegal negative jump.');
    else if (Number(jumpOrErrOrData) + step > qrtzFunction.getStepCount()) this.fail('hook: illegal out of bounds jump.');
    else hook = {jump: Number(jumpOrErrOrData) + step, error: 0};
  };

  this.mime = mime_ => { mime = mime_; };
  this.prog = progress_ => { progress = progress_; autoprog = false; };
  this.help = help_ => { help = help_; };

  this.setAutoProg = enabled => { autoprog = enabled; progress = step / (qrtzFunction.getStepCount() - 1); };

  this.setTimeOut = milliseconds => {
    if (milliseconds > timeout) {
      timeout = milliseconds;
      for (let processStep of processSteps) {
        processStep.setChildrenTimeOut(milliseconds);
      }
      if (parent) parent.setTimeOut(milliseconds);
    }
  };

  this.getInfo = (sessionID_) => {
    return sessionID !== sessionID_ && sessionID_ !== 1
      ? get403(processID)
      : {id: processID, error, data, mime, started, stopped, progress, help, command, timeout};
  };
  this.getFollowUp = (sessionID_) => {
    if (sessionID !== sessionID_ && sessionID_ !== 1) {
      return get403(processID);
    } else {
      return stopped
        ? this.getInfo(sessionID_)
        : {id: 'id', error, data: processID, mime, started, stopped, progress, help, command};
    }
  };

  this.getMime = () => mime;
  this.getHelp = () => help;
  this.getProgress = () => progress;

  this.getProcessID = () => processID;
  this.getSessionID = () => sessionID;
  this.getStarted = () => started;
  this.getStopped = () => stopped;

  this.getCommand = index => typeof index === 'undefined' ? command : command[index];// TODO stringify/parse to ugly copy

  this.getRecipe = () => recipe;
  this.getVars = () => vars;
  this.getParentVars = () => parent instanceof QrtzProcessStep ? parent.getVars() : {};
  this.getTimeOut = () => timeout;
  this.getData = () => data;
  this.getError = () => error;

  this.addDebug = (result, sessionID, prefix) => {
    prefix = prefix || this.getProcessID();
    result[prefix] = {...this.getInfo(sessionID), labels: qrtzFunction.getLabels(), qrtz: '/' + command.join('/')};
    for (let step = 0; step < processSteps.length; ++step) {
      const processStep = processSteps[step];
      processStep.addDebug(result, sessionID, prefix);
    }
    return result;
  };

  let syncFunctionName;
  if (!(qrtzFunction instanceof QrtzFunction)) {
    this.fail('Missing quartz function.');
  } else if ((syncFunctionName = qrtzFunction.getSyncFunctionName())) {
    queuedProcesses[processID] = this;
    progress = 0;
    step = 0;
    processSteps[0].func([syncFunctionName].concat(command), data);
    data = processSteps[0].getData();
    stopped = Date.now();
  } else if (qrtzFunction.getStepCount() === 0) {
    this.done();
  } else {
    queuedProcesses[processID] = this;
    step = 0;
    progress = 0;
  }
}

/**
 * @param properties
 */
function create (properties) {
  const process = new QrtzProcess(properties);
  return process.getFollowUp(properties.sessionID);
}

/**
 * @param processID
 * @param sessionID
 */
function getInfo (processID, sessionID) {
  const process = getProcess(processID);
  return process
    ? process.getInfo(sessionID)
    : get404(processID);
}

/**
 * @param processID
 * @param sessionID
 */
function getFollowUp (processID, sessionID) {
  const process = getProcess(processID);
  return process
    ? process.getFollowUp(sessionID)
    : get404(processID);
}

/**
 * @param processID
 * @param sessionID
 */
function getDebug (processID, sessionID) {
  const process = getProcess(processID);
  if (process) {
    const info = process.getInfo(sessionID);
    const data = process.addDebug({}, sessionID);
    data[processID].data = info.data;
    info.error = 0;
    info.data = data;
    return info;
  } else {
    return get404(processID);
  }
}

/**
 * @param processID
 */
function processExists (processID, sessionID) { // TODO use sessionID
  return queuedProcesses.hasOwnProperty(processID) ||
    busyProcesses.hasOwnProperty(processID) ||
    finishedProcesses.hasOwnProperty(processID);
}

/**
 * @param processes
 * @param sessionID
 */
function getSessionProcessKeys (processes, sessionID) {
  if (sessionID === 0 || typeof sessionID === 'undefined') return [];
  else if (sessionID === 1) return Object.keys(processes);
  else return Object.keys(processes).filter(processID => processes[processID].getSessionID() === sessionID);
}

function getBusyProcessList (sessionID) {
  return getSessionProcessKeys(busyProcesses, sessionID);
}

function getQueuedProcessList (sessionID) {
  return getSessionProcessKeys(queuedProcesses, sessionID);
}

function getFinishedProcessList (sessionID) {
  return getSessionProcessKeys(finishedProcesses, sessionID);
}

/**
 * @param sessionID
 */
function getProcessList (sessionID) {
  const list = getQueuedProcessList(sessionID)
    .concat(getBusyProcessList(sessionID))
    .concat(getFinishedProcessList(sessionID));
  return list;
}

/**
 * @param processID
 * @param data
 */
function done (processID, data) {
  const process = getProcess(processID);
  if (!process) {
    return false;
  }
  process.done(data);
  return true;
}

/**
 * @param processID
 * @param data
 */
function fail (processID, data) {
  const process = getProcess(processID);
  if (!process) {
    return false;
  }
  process.fail(data);
  return true;
}

/**
 * @param processID
 * @param data
 */
function kill (processID, data) {
  const process = getProcess(processID);
  if (!process) {
    return false;
  }
  process.kill(data);
  return true;
}

/**
 * @param processID
 * @param progress
 */
function prog (processID, progress) {
  const process = getProcess(processID);
  if (!process) {
    return false;
  }
  process.prog(progress);
  return true;
}

// return a function that takes a sequential callback array
/**
 * @param processId
 * @param data
 */
function sequentialStop (processId, data) {
  return (cbArr) => {
    done(processId, data);
    sequential.next(cbArr);
  };
}

exports.sequentialStop = sequentialStop;

exports.processExists = processExists;
exports.getProcessList = getProcessList;
exports.getBusyProccessList = getBusyProcessList;
exports.getQueuedProccessList = getQueuedProcessList;
exports.getFinishedProccessList = getFinishedProcessList;

exports.create = create;

exports.done = done;
exports.fail = fail;

exports.failure = fail;
exports.prog = prog;
exports.kill = kill;
exports.getDebug = getDebug;
exports.getInfo = getInfo;
exports.getFollowUp = getFollowUp;

exports.stopAll = killAll;

exports.updateProcesses = updateProcesses;
exports.purgeProcesses = purgeProcesses;
