const FIRST_PAGE = 'TX01,TX02,TX03,TX04,TX05';
const THIRD_PAGE = 'TX11,TX12,TX13,TX14,TX15';
const FILE_CONTENT = '';
exports.steps = [
  {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
  // RETRIEVE EXISTING CACHE FILES
  {'pattern': '_dummyaddress_-dummy-history-*'}, 'list',
  // BURN EXISTING CACHE FILES
  keys => Object.fromEntries(keys.map(key => [key, {data: {key}, step: 'burn'}])), 'parallel',

  // RETRIEVE HISTORY
  {'query': '/a/dummy/history/_dummyaddress_/5/0'}, 'rout',
  history => ({ condition: history.join(',') === FIRST_PAGE, message: 'First dummy history page did not return expected result.' }), 'assert',
  // RETRIEVE MORE HISTORY
  {'query': '/a/dummy/history/_dummyaddress_/5/10'}, 'rout',
  history => ({condition: history.join(',') === THIRD_PAGE, message: 'Third dummy history page did not return expected result.'}), 'assert',

  {'pattern': '_dummyaddress_-dummy-history-*'}, 'list',
  // RETRIEVE CREATED CACHE FILES
  keys => Object.fromEntries(keys.map(key => [key, {data: {key, encrypted: false}, step: 'load'}])), 'parallel'
  // TODO  fileContent => ({condition: fileContent === FILE_CONTENT, message: 'First dummy history cache file did not contain expected content.'}), 'assert'

];
exports.validate = (success, data) => success;
