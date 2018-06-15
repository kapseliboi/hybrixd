var fetch_ = fetch;
var U = utils;

var userIdInputStr = Rx.Observable
  .fromEvent(document.querySelector('#inputUserID'), 'input')
  .map(U.getTargetValue)
  .map(_ => {
    throw 'Error';
  })
  .retryWhen(e => {
    e.pipe(
      e.tap(console.log('Something went wrong...')),
      e.delay(500)
    );
  })
  .subscribe(v => {
    console.log('Got value, nothing happened.');
  });

const passwordInputStream = Rx.Observable
  .fromEvent(document.querySelector('#inputPasscode'), 'input')
  .map(U.getTargetValue);

loginInputStreams = {
  credentialsStream: Rx.Observable
    .combineLatest(userIdInputStr, passwordInputStream),

  mkInputStream: function (query) {
    return Rx.Observable
      .fromEvent(document.querySelector(query), 'keydown')
      .filter(function (e) { return e.key === 'Enter'; });
  },

  mkSessionStepFetchPromise: function (sessionData, stepNameStr) {
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
};
