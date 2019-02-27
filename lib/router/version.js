exports.serve = serve;

function serve (request, xpath) {
  if (xpath.length === 2 && xpath[1] === 'details') {
    return {data: '../versions.json', type: 'file:application/json', error: 0};
  }
}
