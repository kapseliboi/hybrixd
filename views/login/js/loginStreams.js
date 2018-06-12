var fetch_ = fetch;
var U = utils;

const userIdInputStr = Rx.Observable
  .fromEvent(document.querySelector('#inputUserID'), 'input')
  .map(U.getTargetValue);

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
