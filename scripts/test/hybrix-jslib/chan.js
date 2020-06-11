exports.steps = [
  {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
  {
    _options: {passErrors: true},
    y: {step: 'rout', data: {query: '/a/dummy/fee-symbol', channel: 'y'}},
    z: {step: 'rout', data: {query: '/a/dummy/fee-symbol', channel: 'z'}}
  }, 'parallel'];
exports.validate = (success, data) => success && typeof data === 'object' && data !== null && data.y === 'dummy' && data.z === 'dummy';
