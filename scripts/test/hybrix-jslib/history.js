const FIRST_TX = 'TX01';
const FIFTH_TX = 'TX05';
const TWENTYEIGHTH_TX = 'TX28';
const LATEST_TRANSACTIONS =  'TX01,TX02,TX03,TX04,TX05,TX06,TX07,TX08,TX09,TX10,TX11,TX12';
const SECOND_PAGE =  'TX13,TX14,TX15,TX16,TX17,TX18,TX19,TX20,TX21,TX22,TX23,TX24';

const LONG_FORWARDS_RESULT =                       '["TX04","TX05","TX06","TX07","TX08","TX09","TX10","TX11","TX12","TX13","TX14","TX15","TX16","TX17","TX18","TX19","TX20","TX21","TX22","TX23","TX24","TX25","TX26","TX27","TX28","TX29"]';
const LONG_BACKWARDS_RESULT = '["TX01","TX02","TX03","TX04","TX05","TX06","TX07","TX08","TX09","TX10","TX11","TX12","TX13","TX14","TX15","TX16","TX17","TX18","TX19","TX20","TX21","TX22","TX23","TX24","TX25","TX26","TX27","TX28","TX29"]';
const REPLACEMENT_RESULT =                         '["TX04","TX05","TX06","TX07","TX08","TX09","TX10","TX11","TX12","TX13","TX14","TX15","TX16","TX17","TX18","TX19","TX20","TX21","TX22","TX23","TX24","TX25","TX26","TX27","TX28","TX29"]';
const LATEST_RESULTS =        '["TX01","TX02","TX03","TX04","TX05","TX06","TX07","TX08","TX09","TX10","TX11","TX12"]';
const SECOND_PAGE_RESULT = '["TX13","TX14","TX15","TX16","TX17","TX18","TX19","TX20","TX21","TX22","TX23","TX24"]';
const EMPTY_RESULT = '[]';

const burn = [
  {'pattern': '_dummyaddress_-dummy-history-*'}, 'list', // RETRIEVE EXISTING CACHE FILES
  keys => Object.fromEntries(keys.map(key => [key, {data: {key}, step: 'burn'}])), 'parallel',
]

const checkFile = res => [
  {'pattern': '_dummyaddress_-dummy-history-*'}, 'list',
  keys => Object.fromEntries(keys.map(key => [key, {data: {key, encrypted: false}, step: 'load'}])), 'parallel',
  testFileContent(res), 'assert'
]

const testFileContent = (arrayToTest, message) => fileContent => {
  const key = Object.keys(fileContent)[0];
  const history = fileContent[key];

  console.log(history)
  console.log(arrayToTest)

  return {condition: history === arrayToTest, message}
}

const testHistory = (paramsStr, txStr, message) => [
  {'query': `/a/dummy/history/_dummyaddress_${paramsStr}`}, 'rout',
  history => ({ condition: history.join(',') === txStr, message }), 'assert',
]

// TESTS
const testForwardConcatenation = [
  burn,
  testHistory('/1/4', FIFTH_TX, 'Transaction did not match expected result "TX5".'),
  testHistory('/1/27', TWENTYEIGHTH_TX, 'Transaction did not match expected result TX28.'),
  checkFile(LONG_FORWARDS_RESULT, 'Forwards concatenated history cache file did not contain expected content.'),
]

const testBackwardsConcatenation = [
  burn,
  testHistory('/1/27', TWENTYEIGHTH_TX, 'Transaction did not match expected result TX28.'),
  testHistory('/1/4', FIFTH_TX, 'Transaction did not match expected result "TX5".'),
  checkFile(LONG_BACKWARDS_RESULT, 'Backwards concatenated history cache file did not contain expected content.'),
]

const testReplacingExistingHistory = [
  burn,
  testHistory('/1/4', FIRST_TX, 'Transaction did not match expected result "TX1".'),
  testHistory('/1/27', TWENTYEIGHTH_TX, 'Transaction did not match expected result TX28.'),
  checkFile(REPLACEMENT_RESULT, 'History cache file did not contain expected replaced content.'),
]

const testLatestTransactionsOnDefaultParameters = [
  burn,
  testHistory('', LATEST_TRANSACTIONS, 'Latest dummy transactions did not return expected result.'),
  checkFile(LATEST_RESULTS, 'History cache file did not contain expected first 12 transactions.')
]

const testSecondHistoryPage = [
  burn,
  testHistory('/12/1', SECOND_PAGE, 'Second history page did not return expected result.'),
  checkFile(SECOND_PAGE_RESULT, 'History cache file did not contain expected second batch of 12 transactions.')
]

const testSelection = [
  burn,
  testHistory('', LATEST_TRANSACTIONS, 'Latest dummy transactions did not return expected result.'),
  testHistory('/1/4', FIFTH_TX, 'Transaction did not match expected result "TX5".'),
  checkFile(LATEST_RESULTS, 'History cache file did not return expected 12 latest transactions')
]

const testNonExistentInCache = [
  burn,
  testHistory('', LATEST_TRANSACTIONS, 'Latest dummy transactions did not return expected result.'),
  testHistory('/1/12', EMPTY_RESULT, 'Transaction did not match expected empty result.'),
]

const tests = [
  testForwardConcatenation,
  testBackwardsConcatenation,
  testReplacingExistingHistory,
  testLatestTransactionsOnDefaultParameters,
  testSecondHistoryPage,
  testSelection,
  testNonExistentInCache
].map(test => test.flat())

exports.steps = [
  {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
  tests
].flat();

exports.validate = (success, data) => success;