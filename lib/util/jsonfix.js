// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - functions.js
// Collection of process and other ubiquitous functions.

// parse dirty JSON used in redirect module and qrtz.jpar
function parse (input) {
  return input
    // Replace ":" with "@colon@" if it's between double-quotes
    .replace(/:\s*"([^"]*)"/g, function (match, p1) {
      return ': "' + p1.replace(/:/g, '@colon@') + '"';
    })

    // Replace ":" with "@colon@" if it's between single-quotes
    .replace(/:\s*'([^']*)'/g, function (match, p1) {
      return ': "' + p1.replace(/:/g, '@colon@') + '"';
    })

    // Add double-quotes around any tokens before the remaining ":"
    .replace(/(['"])?([a-z0-9A-Z_-]+)(['"])?\s*:/g, '"$2": ')

    // Turn "@colon@" back into ":"
    .replace(/@colon@/g, ':')
  ;
}

// handy functions that can be imported into modules
exports.parse = parse;
