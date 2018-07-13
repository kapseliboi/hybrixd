var U = utils;

hybridd = {
  mkHybriddCallStream: function (url) {
    var hybriddCallStream = rxjs
      .from(hybriddcall({r: url, z: true}))
      .pipe(
        rxjs.operators.filter(R.propEq('error', 0)), // TODO Handle errors.
        rxjs.operators.map(R.merge({r: url, z: true}))
      );

    var hybriddCallResponseStream = hybriddCallStream
      .pipe(
        rxjs.operators.flatMap(function (properties) {
          return rxjs
            .from(hybriddReturnProcess(properties));
        })
      );

    return hybriddCallResponseStream;
  }
};

hybriddcall = function (properties) {
  var urltarget = properties.r;
  var usercrypto = GL.usercrypto;
  var step = nextStep();
  var reqmethod = typeof properties.z === 'undefined' && properties.z;
  var urlrequest = path + zchanOrYchanEncryptionStr(reqmethod, usercrypto)(step)(urltarget);

  return fetch(urlrequest)
    .then(r => r.json()
      .then(encodedResult => {
        return zchanOrYchanEncryptionObj(reqmethod, usercrypto)(step)(encodedResult); // TODO: Factor out decoding!!!
      })
      .catch(e => {
        console.log('Error hybriddCall', e);
        throw { error: 1, msg: e };
      }))
    .catch(e => {
      console.log('Error hybriddCall', e);
      throw { error: 1, msg: e };
    });
};

// proc request helper function
hybriddReturnProcess = function (properties) {
  var processStep = nextStep();
  var reqmethod = typeof properties.z === 'undefined' && properties.z;
  var urlrequest = path + zchanOrYchanEncryptionStr(reqmethod, GL.usercrypto)(processStep)('p/' + properties.data);

  return fetch(urlrequest)
    .then(r => r.json()
      .then(r => zchanOrYchanEncryptionObj(reqmethod, GL.usercrypto)(processStep)(r)) // TODO: Factor out decoding!!!
      .catch(e => console.log('Error hybriddCall', e)))
    .catch(e => console.log('Error hybriddCall', e));
};

function zchanOrYchanEncryptionStr (requestMethod, userCrypto) {
  return function (step) {
    return function (str) {
      var encryptionMethod = requestMethod ? zchan : ychan;
      return encryptionMethod(userCrypto, step, str);
    };
  };
}

function zchanOrYchanEncryptionObj (requestMethod, userCrypto) {
  return function (step) {
    return function (obj) {
      var encryptionMethod = requestMethod ? zchan_obj : ychan_obj;
      return encryptionMethod(userCrypto, step, obj);
    };
  };
}
