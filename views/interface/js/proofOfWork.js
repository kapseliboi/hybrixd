import { hybridd } from './hybriddcall';

import * as R from 'ramda';

import { from } from 'rxjs/observable/from';
import { map, filter, flatMap } from 'rxjs/operators';

export var proofOfWork_ = {
  loopThroughProofOfWork: function () {
    var req = GL.powqueue.shift();
    if (typeof req !== 'undefined') {
      // attempt to send proof-of-work to node
      proofOfWork.solve(req.split('/')[1], submitProofOfWork(req), failedProofOfWork(req));
    }
  }
};

function submitProofOfWork (req) {
  return function (proof) {
    const proofOfWorkStr = req.split('/')[0] + '/' + proof;
    var url = 's/storage/pow/' + proofOfWorkStr;
    logger('Submitting storage proof: ' + proofOfWorkStr);

    var hybriddCallStream = from(hybridd.hybriddCall({r: url, z: false}))
      .pipe(
        filter(R.propEq('error', 0)),
        map(R.merge({r: url, z: true}))
      );

    var hybriddCallResponseStream = hybriddCallStream
      .pipe(
        flatMap(function (properties) {
          return from(hybridd.hybriddReturnProcess(properties));
        }),
        map(data => {
          if (R.isNil(R.prop('stopped', data)) && R.prop('progress', data) < 1) throw data;
          return data;
        })
      );

    hybriddCallResponseStream.subscribe(function (_) {});
  };
}

function failedProofOfWork (req) {
  // DEBUG:
  logger('failed storage proof: ' + req.split('/')[0]);
}
