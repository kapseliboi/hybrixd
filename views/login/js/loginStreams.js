var fetch_ = fetch;
var U = utils;

var userIdInputStr = rxjs.fromEvent(document.querySelector('#inputUserID'), 'input')
  .pipe(
    rxjs.operators.map(U.getTargetValue)
  );

const passwordInputStream = rxjs.fromEvent(document.querySelector('#inputPasscode'), 'input')
  .pipe(
    rxjs.operators.map(U.getTargetValue)
  );

var credentialsStream = rxjs.combineLatest(
  userIdInputStr,
  passwordInputStream
);

function mkInputStream (query) {
  return rxjs.fromEvent(document.querySelector(query), 'keydown')
    .pipe(
      rxjs.operators.filter(function (e) { return e.key === 'Enter'; })
    );
}

function mkSessionStepFetchPromise (sessionData, stepNameStr) {
  return fetch_(sessionData.url)
    .then(function (r) {
      return r.json()
        .then(function (stepData) {
          var defaultOrAssociatedStepData = stepNameStr === 'postSessionStep1Data'
            ? R.assoc('sessionStep1', stepData, {})
            : stepData;
          return R.merge(sessionData, defaultOrAssociatedStepData);
        })
        .catch(function (e) { throw e; });
    })
    .catch(function (e) { throw e; });
}

loginInputStreams = {
  credentialsStream,
  mkInputStream,
  mkSessionStepFetchPromise
};
