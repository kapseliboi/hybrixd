const fs = require('fs');

const test = require('../../interface/test.js');
const Hybrix = require('../../interface/hybrix-lib.nodejs.js');
const router = require('./router.js');
const process = require('../scheduler/process.js');

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
      process.stop(processID, data);
    },
    progress => process.prog(processID, progress)
  );
  return response;
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
    const error = typeof data !== 'string' ? 404 : 0;
    return {data, mime, error};
  } else {
    return {data: 'No data available', error: 500};
  }
}

function serve (request, xpath) {
  if (xpath.length === 2 && xpath[1] === 'assets') {
    return get(data => test.web(data), 'text/html');
  } else if (xpath.length === 3 && xpath[1] === 'assets' && xpath[2] === 'test') {
    return exec(xpath);
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
