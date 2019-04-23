// (C) 2019 Internet of Coins / Rouke Pouw

// handle a list of callbacks sequentially
function next (callbackArray) {
  if (typeof callbackArray === 'undefined') { return; }
  if (callbackArray.constructor === Array) { // list of sequential functions
    if (callbackArray.length > 0) {
      let f = callbackArray[0];
      f(callbackArray.slice(1));
    }
  } else { // singular function
    callbackArray();
  }
}

// handy functions that can be imported into modules
exports.next = next;
