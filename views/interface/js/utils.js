var fetch_ = fetch;

function takeWhile (fn, xs) {
  var idx = 0;
  var len = xs.length;
  while (idx < len && fn(xs[idx])) {
    idx += 1;
  }
  return Array.prototype.slice.call(xs, 0, idx);
}

mkSvgIcon = function (symbolName) {
  var firstLetterCapitalized = symbolName.slice(0, 1).toUpperCase();

  return '<svg width="50px" height="50px" viewBox="0 0 50 50" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g id="Asset-view" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Symbols" transform="translate(-367.000000, -248.000000)" fill-rule="nonzero" fill="#000000"> <g id="error" transform="translate(367.000000, 248.000000)"> <path d="M25.016,0.016 C38.8656595,0.016 50.016,11.1663405 50.016,25.016 C50.016,38.8656595 38.8656595,50.016 25.016,50.016 C11.1663405,50.016 0.016,38.8656595 0.016,25.016 C0.016,11.1663405 11.1663405,0.016 25.016,0.016 Z" id="Shape"></path> <text x="50%" y="72%" text-anchor="middle" fill="white" style="font-size: 30px; font-weight: 200;">' + firstLetterCapitalized + '</text> </g> </g> </g> </svg>';
};

const utils = {
  fetchDataFromUrl: function (url, cb, errStr) {
    fetch_(url)
      .then(r => r.json()
            .then(cb)
            .catch(e => console.log(errStr, e)))
      .catch(e => console.log(errStr, e));
  }
}

function bigNumberToString (obj, base) {
  // setup base
  base = base || 10

  // check if obj is type object, not an array and does not have BN properties
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !('lessThan' in obj)) {
    // move through plain object
    Object.keys(obj).forEach(function (key) {
      // recurively converty item
      obj[key] = bigNumberToString(obj[key], base)
    })
  }

  // obj is an array
  if (Array.isArray(obj)) {
    // convert items in array
    obj = obj.map(function (item) {
      // convert item to a string if bignumber
      return bigNumberToString(item, base)
    })
  }

  // if not an object bypass
  if (typeof obj !== 'object' || obj === null) return obj

  // if the object to does not have BigNumber properties, bypass
  if (!('toString' in obj) || !('lessThan' in obj)) return obj

  // if object has bignumber properties, convert to string with base
  return obj.toString(base);
}
