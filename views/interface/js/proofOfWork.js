var proofOfWork_ = {
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
    logger('submitting storage proof: ' + proofOfWorkStr);

    var hybriddCallStream = Rx.Observable
        .fromPromise(hybriddcall({r: url, z: false}))
        .filter(R.propEq('error', 0))
        .map(R.merge({r: url, z: true}));

    var hybriddCallResponseStream = hybriddCallStream
        .flatMap(function (properties) {
          return Rx.Observable
            .fromPromise(hybriddReturnProcess(properties));
        })
        .map(data => {
          if (R.isNil(R.prop('stopped', data)) && R.prop('progress', data) < 1) throw data;
          return data;
        });

    hybriddCallResponseStream.subscribe(function (_) {});
  };
}

function failedProofOfWork (req) {
  // DEBUG: logger('failed storage proof: ' + req.split('/')[0]);
}
