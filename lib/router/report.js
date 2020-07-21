const fs = require('fs');

const test = require('../../interface/test.js');
const hostsTests = require('../../interface/test.host.js');
const Hybrix = require('../../interface/hybrix-lib.nodejs.js');
const router = require('./router.js');
const process = require('../scheduler/process.js');
const stat = require('../log/stat.js');

const REPORT_LOG_JSON = '../var/report.log.json';
const WEEK_IN_MILISECONDS = 7 * 24 * 60 * 60 * 1000;

exports.serve = serve;

const rout = query => {
  const request = {url: query, sessionID: 0};
  const result = JSON.stringify(router.route(request));
  return result;
};

function execAssets (xpath, xml) {
  const sessionID = 1; // TODO 0?
  const response = process.create({sessionID, command: [], steps: ['time 3000000', 'wait', 'done']});
  const processID = response.data;
  const hybrix = new Hybrix.Interface({local: {rout}});
  const symbolsToTest = '*';
  const host = 'http://127.0.0.1:1111/'; // TODO retrieve proper ports
  test.runTests(symbolsToTest, hybrix, host,
    results => {
      fs.writeFileSync('../var/report.assets.json', JSON.stringify(results));
      const data = xml ? test.xml(results) : results;
      process.done(processID, data);
    },
    progress => process.prog(processID, progress)
  );
  return response;
}

function execHosts (xpath, xml) {
  const sessionID = 1; // TODO 0?
  const response = process.create({sessionID, command: [], steps: ['time 3000000', 'wait', 'done']});
  const processID = response.data;
  const hybrix = new Hybrix.Interface({local: {rout}});
  const symbolsToTest = '*';
  const host = 'http://127.0.0.1:1111/'; // TODO retrieve proper ports
  hostsTests.run(symbolsToTest, hybrix, host,
    results => {
      fs.writeFileSync('../var/report.hosts.json', JSON.stringify(results));
      const data = xml ? test.xml(results) : results;
      process.done(processID, data);
    },
    progress => process.prog(processID, progress)
  );
  return response;
}

function getAssets (transformation, mime) {
  if (fs.existsSync('../var/report.assets.json')) {
    let data;
    try {
      const content = fs.readFileSync('../var/report.assets.json').toString();
      data = JSON.parse(content);
    } catch (e) {
      return {data: 'Data could not be parsed.', error: 500};
    }
    try {
      data = transformation(data);
    } catch (e) {
      return {data: 'Data transformation failed.', error: 500};
    }
    const error = typeof data !== 'string' ? 404 : 0;
    return {data, mime, error};
  } else {
    return {data: 'No data available', error: 500};
  }
}

function getHosts (transformation, mime) {
  if (fs.existsSync('../var/report.hosts.json')) {
    let data;
    try {
      const content = fs.readFileSync('../var/report.hosts.json').toString();
      data = JSON.parse(content);
    } catch (e) {
      return {data: 'Data could not be parsed.', error: 500};
    }
    try {
      data = transformation(data);
    } catch (e) {
      return {data: 'Data transformation failed.', error: 500};
    }
    const error = typeof data !== 'string' ? 404 : 0;
    return {data, mime, error};
  } else {
    return {data: 'No data available', error: 500};
  }
}

function getLogEntries (categories, start, end, search, postprocessFunction) {
  const sessionID = 1; // TODO 0?
  const response = process.create({sessionID, command: [], steps: ['time 3000000', 'wait', 'done']});
  const processID = response.data;
  if (categories === '*') categories = [];
  categories = typeof categories === 'string' ? categories.split('|') : [];
  const options = {categories, start, end, search};
  stat.get(options,
    logEntries => {
      process.done(processID, postprocessFunction(logEntries));
    },
    error => {
      process.fail(processID, error);
    }
  );
  return response;
}

function getLogs (xpath) {
  const [categories, start, end, search] = xpath;
  const postprocessFunction = logEntries => logEntries.map(logEntry => logEntry.getJson());
  return getLogEntries(categories, start, end, search, postprocessFunction);
}

// divide entries into timeslot buckets. If categorize is a function than that is used to create multiple bucket sets per category
function count (entries, start, end, catagorize) {
  const now = Date.now();
  const nrOfBuckets = 100;
  start = now - stat.timeWithUnitsToSeconds(start || '1h');
  end = now - stat.timeWithUnitsToSeconds(end || '0');
  const result = {};
  for (let entry of entries) {
    const bucketId = Math.floor((entry.timestamp - start) / (end - start) * nrOfBuckets);
    const bucketTime = start + bucketId / nrOfBuckets * (end - start);
    let buckets;
    if (typeof catagorize === 'function') {
      const category = catagorize(entry);
      if (!result.hasOwnProperty(category)) {
        result[category] = {};
      }
      buckets = result[category];
    } else {
      buckets = result;
    }
    if (buckets.hasOwnProperty(bucketTime)) {
      ++buckets[bucketTime];
    } else {
      buckets[bucketTime] = 1;
    }
  }
  return result;
}

function isSession (logEntry) {
  // 'Routing request /source/web-wallet/api/x/d26182c297dac10029405d2be129839f52aca7d0eb0bf553f08d83a525182454/0'
  return logEntry.message.startsWith('Routing request /source/web-wallet/api/x/') && logEntry.message.endsWith('/0');
}

function getSessions (xpath) {
  const [start, end] = xpath;
  const postprocessFunction = logEntries => count(logEntries.map(logEntry => logEntry.getJson()).filter(isSession), start, end);
  return getLogEntries('router', start, end, undefined, postprocessFunction);
}

function isApiCall (logEntry) {
  // 'Routing request /source/web-wallet/api/s/deterministic/hash/ark'
  // Skip 'Routing request /source/web-wallet/api/p/1585032720455897'
  return logEntry.message.startsWith('Routing request ') && !logEntry.message.includes('/p/');
}

function getApiCalls (xpath) {
  const [start, end, search] = xpath;
  const postprocessFunction = logEntries => count(logEntries.map(logEntry => logEntry.getJson()).filter(isApiCall), start, end);
  return getLogEntries('router', start, end, search, postprocessFunction);
}

function isAssetApiCall (logEntry) {
  // 'Routing request /asset/dummy/balance/_dummybalance_'
  // 'Routing request /source/web-wallet/api/a/dummy/balance/_dummybalance_'
  return logEntry.message.startsWith('Routing request ') && (
    logEntry.message.includes(' /a/') ||
      logEntry.message.includes(' /asset/') ||
      logEntry.message.includes('/api/a/') ||
      logEntry.message.includes('/api/asset/')) &&
    /(\/asset\/|\/a\/)([\w.]+)\//.test(logEntry.message)
  ;
}

function getSymbol (logEntry) {
  // 'Routing request /asset/dummy/balance/_dummybalance_'
  // 'Routing request /source/web-wallet/api/a/dummy/balance/_dummybalance_'
  const match = logEntry.message.match(/(\/asset\/|\/a\/)([\w.]+)\//);
  if (match instanceof Array && match.length > 2) {
    const symbol = match[2];
    return symbol;
  } else return 'error';
}

function getAssetApiCalls (xpath) {
  const [start, end, search] = xpath;
  const postprocessFunction = logEntries => count(logEntries.map(logEntry => logEntry.getJson()).filter(isAssetApiCall), start, end, getSymbol);
  return getLogEntries('router', start, end, search, postprocessFunction);
}

function getCategory (logEntry) {
  if (isSession(logEntry)) return 'session';
  if (isAssetApiCall(logEntry)) return 'api/assets/' + getSymbol(logEntry);
  return 'api';
}

function filterOldEntriesAndGetLastTimestamp (oldStatistics, threshold) {
  let lastTimestamp = 0;
  for (let categoryId in oldStatistics) {
    const category = oldStatistics[categoryId];
    for (let timestamp in category) {
      timestamp = Number(timestamp);
      if (timestamp < threshold) delete category[timestamp];
      if (timestamp > lastTimestamp) lastTimestamp = timestamp;
    }
  }
  return lastTimestamp;
}

function combineStatistics (oldStatistics, newStatistics) {
  for (let categoryId in newStatistics) {
    const category = newStatistics[categoryId];
    if (!oldStatistics.hasOwnProperty(categoryId)) {
      oldStatistics[categoryId] = category;
    } else {
      oldStatistics[categoryId] = {...oldStatistics[categoryId], category};
    }
  }
  return oldStatistics;
}

/* check if a report exists filter old values from it and add all api and session statistics for last week */
function collectPublicStatistics () {
  let oldStatistics = {};
  if (fs.existsSync(REPORT_LOG_JSON)) {
    try {
      oldStatistics = JSON.parse(fs.readFileSync(REPORT_LOG_JSON).toString());
    } catch (e) {
      oldStatistics = {};
    }
  }

  const now = Date.now();
  const lastTimestamp = filterOldEntriesAndGetLastTimestamp(oldStatistics, now - WEEK_IN_MILISECONDS);

  const start = Math.min(WEEK_IN_MILISECONDS, now - lastTimestamp) / 1000;

  const end = 0;
  const postprocessFunction = logEntries => {
    const newStatistics = count(logEntries.map(logEntry => logEntry.getJson()).filter(logEntry => (isApiCall(logEntry) || isSession(logEntry))), start, end, getCategory);
    const combinedStatistics = combineStatistics(oldStatistics, newStatistics);
    fs.writeFileSync(REPORT_LOG_JSON, JSON.stringify(combinedStatistics));
    return combinedStatistics;
  };
  return getLogEntries('router', start, end, undefined, postprocessFunction);
}

// retrieve a subset of statistics that has been generated by the cron job
function getPublicStatistics (search) {
  if (!fs.existsSync(REPORT_LOG_JSON)) {
    return {error: 500, data: 'No data available'};
  } else {
    let statistics;
    try {
      statistics = JSON.parse(fs.readFileSync(REPORT_LOG_JSON).toString());
    } catch (e) {
      return {error: 500, data: 'Data could not be parsed'};
    }
    if (search.endsWith('*')) {
      const prefix = search.substr(0, search.length - 1);
      const filteredStatistics = {};
      for (let categoryId in statistics) {
        if (categoryId.startsWith(prefix)) filteredStatistics[categoryId.substr(prefix.length)] = statistics[categoryId];
      }
      statistics = filteredStatistics;
    } else {
      statistics = statistics[search] || {};
    }
    return {error: 0, data: statistics};
  }
}

function serve (request, xpath) {
  const path = '/' + xpath.join('/');
  // UI
  if (path === '/report' || path === '/report/log' || path === '/report/sessions' || path === '/report/api' || path === '/report/api/assets' || path === '/report/assets') {
    return {error: 0, data: 'lib/router/report/report.html', mime: 'file:text/html'};
  } else if (path === '/report/report.css') {
    return {error: 0, data: 'lib/router/report/report.css', mime: 'file:text/css'};
  } else if (path === '/report/report.js') {
    return {error: 0, data: 'lib/router/report/report.js', mime: 'file:text/javascript'};
    // Cron
  } else if (path === '/report/cron') {
    return collectPublicStatistics();
    // Log reports
  } else if (path.startsWith('/report/log/')) {
    return getLogs(xpath.slice(2));
    // Api reports
  } else if (path === '/report/api/json') {
    return getPublicStatistics('api');
  } else if (path === '/report/api/assets/json') {
    return getPublicStatistics('api/assets/*');
  } else if (path.startsWith('/report/api/assets/')) {
    return getAssetApiCalls(xpath.slice(3));
  } else if (path.startsWith('/report/api')) {
    return getApiCalls(xpath.slice(2));
    // Session reports
  } else if (path === '/report/sessions/json') {
    return getPublicStatistics('session');
  } else if (path.startsWith('/report/sessions/')) {
    return getSessions(xpath.slice(2));
    // Asset test reports
  } else if ((xpath.length === 3 && xpath[1] === 'assets') || (xpath.length === 3 && xpath[1] === 'hosts')) {
    return getAssetsAndHostsReport(xpath);
    // API/ASSET
  } else if (xpath.length === 3 && xpath[1] === 'asset') {
    const symbol = xpath[2];
    return getAssets(data => {
      if (data.assets && data.assets[symbol]) {
        const testObj = {assets: {[symbol]: data.assets[symbol]}};
        return test.web(testObj);
      } else if (data.assets && symbol === 'all') {
        return JSON.stringify(Object.keys(data.assets));
        // return {error: 0, data: Object.keys(data.assets), mime: 'application/json'};
      } else {
        return `Could not find report for asset ${symbol}.`;
      }
    });
  } else {
    return {data: 'Bad request', error: 400};
  }
}

function getAssetsAndHostsReport (xpath) {
  const isAssets = xpath[1] === 'assets';
  const testSuite = isAssets ? test : hostsTests;
  const exec = isAssets ? execAssets : execHosts;
  const getReport = isAssets ? getAssets : getHosts;

  if (xpath.length === 3 && xpath[2] === 'cron') {
    return exec(xpath, false);
  } else if (xpath.length === 3 && xpath[2] === 'test') {
    return exec(xpath, true);
  } else if (xpath.length === 3 && xpath[2] === 'xml') {
    return getReport(data => testSuite.xml(data));
  } else if (xpath.length === 3 && xpath[2] === 'json') {
    return getReport(JSON.stringify);
  } else if (xpath.length === 3 && xpath[2] === 'cli') {
    return getReport(data => testSuite.cli(data));
  } else if (xpath.length === 3 && xpath[2] === 'html') {
    return getReport(data => testSuite.web(data));
  }
}
