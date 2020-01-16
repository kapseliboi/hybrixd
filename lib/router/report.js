const fs = require('fs');

const test = require('../../interface/test.js');
const Hybrix = require('../../interface/hybrix-lib.nodejs.js');
const router = require('./router.js');
const scheduler = require('../scheduler/scheduler.js');

exports.serve = serve;

const rout = query => {
  const request = {url: query, sessionID: 0};
  const result = JSON.stringify(router.route(request));
  return result;
};

function exec (xpath, format, mime) {
  const processID = scheduler.init(0, {sessionID: 1, path: xpath, command: ['exec']});
  scheduler.fire(processID, ['time 3000000', 'wait', 'done']);
  const hybrix = new Hybrix.Interface({local: {rout}});
  const symbolsToTest = '*';
  const host = 'http://localhost:1111/';

  test.runTests(symbolsToTest, hybrix, host,
    results => {
      fs.writeFileSync('../var/report.assets.json', JSON.stringify(results));
      let data;
      if (format === 'xml') {
        data = test.xml(results);
      } else {
        data = results;
      }
      scheduler.stop(processID, 0, data);
    },
    progress => scheduler.prog(processID, progress)
  );

  return scheduler.result(processID, 'command/reload');
}

function get (transformation, mime) {
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
    const error = typeof data === 'string' ? 404 : 0;
    return {data, type: mime, error};
  } else {
    return {data: 'No data available', error: 500};
  }
}

function serve (request, xpath) {
  if (xpath.length === 2 && xpath[1] === 'assets') {
    return get(data => test.web(data), 'text/html');
  } else if (xpath.length === 3 && xpath[1] === 'assets' && xpath[2] === 'test') {
    return exec(xpath, 'xml');
  } else if (xpath.length === 3 && xpath[1] === 'assets' && xpath[2] === 'xml') {
    return get(data => test.xml(data));
  } else if (xpath.length === 3 && xpath[1] === 'assets' && xpath[2] === 'json') {
    return get(x => x);
  } else if (xpath.length === 3 && xpath[1] === 'assets' && xpath[2] === 'cli') {
    return get(data => test.cli(data));
  } else if (xpath.length === 3 && xpath[1] === 'asset') {
    const symbol = xpath[2];
    return get(data => {
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
