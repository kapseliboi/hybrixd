function getTargetValue (e) {
  return e.target.value;
}

const userIdInputStr = Rx.Observable
  .fromEvent(document.querySelector('#inputUserID'), 'input')
  .map(getTargetValue);

const passwordInputStream = Rx.Observable
  .fromEvent(document.querySelector('#inputPasscode'), 'input')
  .map(getTargetValue);

loginInputStreams = {
  credentialsStream: Rx.Observable
    .combineLatest(userIdInputStr, passwordInputStream)
};
