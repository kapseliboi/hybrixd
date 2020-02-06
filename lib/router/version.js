exports.serve = serve;

function serve (request, xpath) {
  if (xpath.length === 2 && xpath[1] === 'details') {
    return {data: '../versions.json', mime: 'file:application/json', error: 0};
  } else {
    return {data: 'Bad request', error: 400};
  }
}
