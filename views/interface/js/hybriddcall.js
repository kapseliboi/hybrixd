import { utils_ } from './utils.js';
import { commonUtils } from './../../common/index.js';

import { from } from 'rxjs/observable/from';
import { map, filter, flatMap } from 'rxjs/operators';

import * as R from 'ramda';

export var hybridd = {
  mkHybriddCallStream: function (url) {
    var hybriddCallStream = from(hybriddcall({r: url, z: true}))
      .pipe(
        filter(R.propEq('error', 0)), // TODO Handle errors.
        map(R.merge({r: url, z: true}))
      );

    var hybriddCallResponseStream = hybriddCallStream
      .pipe(
        flatMap(function (properties) {
          return from(hybriddReturnProcess(properties));
        })
      );

    return hybriddCallResponseStream;
  },
  hybriddcall,
  hybriddReturnProcess
};

export function hybriddcall (properties) {
  var urltarget = properties.r;
  var usercrypto = GL.usercrypto;
  var step = commonUtils.nextStep();
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
}

// proc request helper function
export function hybriddReturnProcess (properties) {
  var processStep = commonUtils.nextStep();
  var reqmethod = typeof properties.z === 'undefined' && properties.z;
  var urlrequest = path + zchanOrYchanEncryptionStr(reqmethod, GL.usercrypto)(processStep)('p/' + properties.data);

  return fetch(urlrequest)
    .then(r => r.json()
      .then(r => zchanOrYchanEncryptionObj(reqmethod, GL.usercrypto)(processStep)(r)) // TODO: Factor out decoding!!!
      .catch(e => console.log('Error hybriddCall', e)))
    .catch(e => console.log('Error hybriddCall', e));
}

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
