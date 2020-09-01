exports.steps = [
  {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
  // TODO clear storage (LIST,BURN?)
  {'query': '/a/dummy/history/_dummyaddress_/5/0'}, 'rout',
  history => ({ condition: history.join(',') === 'TX01,TX02,TX03,TX04,TX05' }), 'assert',
  {'query': '/a/dummy/history/_dummyaddress_/5/10'}, 'rout',
  history => ({condition: history.join(',') === 'TX11,TX12,TX13,TX14,TX15'}), 'assert'
  // TODO check file content LOAD
];
exports.validate = (success, data) => success;
