const fs = require('fs');

const test = require('../../interface/test.js');
const Hybrix = require('../../interface/hybrix-lib.nodejs.js');
const router = require('./router.js');
const process = require('../scheduler/process.js');
const stat = require('../log/stat.js');

exports.serve = serve;

const rout = query => {
  const request = {url: query, sessionID: 0};
  const result = JSON.stringify(router.route(request));
  return result;
};

function exec (xpath) {
  const sessionID = 1; // TODO 0?
  const response = process.create({sessionID, command: [], steps: ['time 3000000', 'wait', 'done']});
  const processID = response.data;
  const hybrix = new Hybrix.Interface({local: {rout}});
  const symbolsToTest = '*';
  const host = 'http://127.0.0.1:1111/';
  test.runTests(symbolsToTest, hybrix, host,
    results => {
      fs.writeFileSync('../var/report.assets.json', JSON.stringify(results));
      const data = test.xml(results);
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

function getLogEntries (categories, start, end, search, postprocessFunction) {
  const sessionID = 1; // TODO 0?
  const response = process.create({sessionID, command: [], steps: ['time 3000000', 'wait', 'done']});
  const processID = response.data;
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
  const nrOfBuckets = 100;
  start = stat.timeWithUnitsToSeconds(start || '1h');
  end = stat.timeWithUnitsToSeconds(end || '0');
  const result = {};
  for (let entry of entries) {
    const bucketId = Math.floor((entry.timestamp - start) / (end - start) * nrOfBuckets);
    const bucketTime = start + bucketId * nrOfBuckets * (end - start);
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
      logEntry.message.includes('/api/asset/')
  );
}

function getSymbol (logEntry) {
  // 'Routing request /asset/dummy/balance/_dummybalance_'
  // 'Routing request /source/web-wallet/api/a/dummy/balance/_dummybalance_'
  const symbol = logEntry.message.match(/(\/asset\/|\/a\/)([\w\.]+)\//)[2];
  return symbol;
}

function getAssetApiCalls (xpath) {
  const [start, end, search] = xpath;
  const postprocessFunction = logEntries => count(logEntries.map(logEntry => logEntry.getJson()).filter(isAssetApiCall), start, end, entry => getSymbol(entry));
  return getLogEntries('router', start, end, search, postprocessFunction);
}

function serve (request, xpath) {
  console.log(xpath);
  if (xpath.length >= 2 && xpath[1] === 'log') {
    return getLogs(xpath.slice(2));
  } else if (xpath.length >= 3 && xpath[1] === 'api' && xpath[2] === 'assets') {
    return getAssetApiCalls(xpath.slice(3));
  } else if (xpath.length >= 2 && xpath[1] === 'sessions') {
    return getSessions(xpath.slice(2));
  } else if (xpath.length >= 2 && xpath[1] === 'api') {
    return getApiCalls(xpath.slice(2));
  } else if (xpath.length === 2 && xpath[1] === 'assets') {
    return getAssets(data => test.web(data), 'text/html');
  } else if (xpath.length === 3 && xpath[1] === 'assets' && xpath[2] === 'test') {
    return exec(xpath);
  } else if (xpath.length === 3 && xpath[1] === 'assets' && xpath[2] === 'xml') {
    return getAssets(data => test.xml(data));
  } else if (xpath.length === 3 && xpath[1] === 'assets' && xpath[2] === 'json') {
    return getAssets(x => x);
  } else if (xpath.length === 3 && xpath[1] === 'assets' && xpath[2] === 'cli') {
    return getAssets(data => test.cli(data));
  } else if (xpath.length === 3 && xpath[1] === 'asset') {
    const symbol = xpath[2];
    return getAssets(data => {
      if (data.assets && data.assets[symbol]) {
        return data.assets[symbol];
      } else {
        return `Could not find report for asset ${symbol}.`;
      }
    });
  } else {
    return {data: 'Bad request', error: 400};
  }
}
