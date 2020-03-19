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

function getLogs (xpath) {
  const sessionID = 1; // TODO 0?
  const response = process.create({sessionID, command: [], steps: ['time 3000000', 'wait', 'done']});
  const processID = response.data;
  const categories = typeof xpath[0] === 'string' ? xpath[0].split('|') : [];
  const start = xpath[1];
  const end = xpath[2];
  const search = xpath[3];
  const options = {categories, start, end, search};
  stat.get(options,
    logEntries => {
      process.done(processID, logEntries.map(logEntry => logEntry.getJson()));
    },
    error => {
      process.fail(processID, error);
    }
  );

  return response;
}

function serve (request, xpath) {
  if (xpath.length > 2 && xpath[1] === 'log') {
    return getLogs(xpath.slice(2));
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
