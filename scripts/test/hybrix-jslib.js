const fs = require('fs');
const http = require('http');
const Hybrix = require('../../interface/hybrix-lib.nodejs.js');
const TEST_DIRECTORY = './hybrix-jslib/';

const testResults = {};
let failed = 0;

fs.readdir(TEST_DIRECTORY, function (err, files) {
  if (err) {
    console.error('[!] Could not list the directory ' + TEST_DIRECTORY, err);
    process.exit(1);
  }
  files = files.filter(fileName => fileName.endsWith('.js'));
  for (let fileName of files) testResults[fileName] = undefined;
  files.forEach(runTest);
});

function runTest (fileName) {
  const hybrix = new Hybrix.Interface({http});

  const {steps, validate} = require(TEST_DIRECTORY + fileName);

  const handleResponse = success => data => {
    if (validate(success, data)) {
      testResults[fileName] = true;
      console.log(`[v] hybrix-jslib: test '${fileName}' succeeded`);
    } else {
      ++failed;
      console.log(`[x] hybrix-jslib: test '${fileName}' failed!`, data);
      testResults[fileName] = false;
    }
    if (Object.values(testResults).filter(result => typeof result === 'undefined').length === 0) { // if all tests have finished
      if (failed > 0) {
        console.log(`[!] hybrix-jslib: tests completed with ${failed} failed tests.`);
      } else {
        console.log(`[i] hybrix-jslib: tests completed, all tests succeeded.`);
      }
      process.exit(failed > 0 ? 1 : 0);
    }
  };
  hybrix.sequential([
    'init',
    {host: 'http://localhost:1111'}, 'addHost'

  ].concat(steps), handleResponse(true), handleResponse(false));
}
