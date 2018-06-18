const C = commonUtils;
const V = validations;
const U = utils;
const S = loginInputStreams;

// TODO: Give back some feedback to the user about incorrect credentials????
// const loginFormStateStream = S.credentialsStream
//   .map(R.map(U.normalizeUserInput))
//   .map(validateZippedCredentials)
//   .map(renderLoginFormState);

// function renderLoginFormState (hasValidCredentials) {
//   const borderColor = hasValidCredentials ? '#D9E3EB' : 'transparent';
//   const addOrRemove = hasValidCredentials ? 'remove' : 'add';

//   renderLoginFormToEnabledState(addOrRemove, borderColor);
// }

// function renderLoginFormToEnabledState (addOrRemove, color) {
//   document.querySelector('#loginbutton').classList[addOrRemove]('disabled');
//   document.querySelector('#loginform input[type=text]').style.borderColor = color;
//   document.querySelector('#loginform input[type=password]').style.borderColor = color;
// }

// function validateZippedCredentials (z) {
//   return V.validateCredentials(z[0], z[1]);
// }

function alertbutton () {
  alert('<div class="alert-header">⚠</div><br><h2>WARNING: Do not store large value in this wallet!</h2><br>We\'re making every effort towards a secure design, and do not store any wallet file or data on this computer. Regardless, we cannot guarantee the security of your cryptocurrency in this stage of the project!<br><br>', {title: '', button: 'Yes, I understand'});
}

function helpbutton () {
  alert('<h2>Welcome to the Internet of Coins wallet</h2><br><h3>I already have an account</h3>To sign in, you need to enter an account code and password that are both 16 characters long.<br><br><h3>I\'m new, I need a new account </h3>If you don\'t have sign in credentials yet, you can generate them by clicking on the "+ Create a new account" button, and the new credentials will be filled in for you.<br><br><h3>Do you still have questions?</h3>Please visit <a href="https://internetofcoins.org" target="_BLANK">our FAQ.</a><br><br>', {title: '', button: 'Close'});
}

U.documentReady(function () {
  const customAlert = new CustomAlert();
  // loginFormStateStream.subscribe();
});
