$(document).ready(function () {
  const customAlert = new CustomAlert();
});

function alertbutton () {
  alert('<div class="alert-header">⚠</div><br><h2>WARNING: Do not store large value in this wallet!</h2><br>We\'re making every effort towards a secure design, and do not store any wallet file or data on this computer. Regardless, we cannot guarantee the security of your cryptocurrency in this stage of the project!<br><br>',
    {title: '', button: 'Yes, I understand'});
}

function helpbutton () {
  alert('<h2>Welcome to the Internet of Coins wallet</h2><br><h3>I already have an account</h3>To sign in, you need to enter an account code and password that are both 16 characters long.<br><br><h3>I\'m new, I need a new account </h3>If you don\'t have sign in credentials yet, you can generate them by clicking on the "+ Create a new account" button, and the new credentials will be filled in for you.<br><br><h3>Do you still have questions?</h3>Please visit <a href="https://internetofcoins.org" target="_BLANK">our FAQ.</a><br><br>',
    {title: '', button: 'Close'});
}

function checkfields () {
  var userID = String($('#inputUserID').val());
  var pass = String($('#inputPasscode').val());
  var isUserIDValid = validateUserID(userID) && validate_userid(userID) && userID !== pass;
  var isPasswordValid = validatePassword(pass) && validate_passwd(userID, pass);

  if (isUserIDValid && isPasswordValid) {
    $('#loginbutton').removeClass('disabled');
    $('#tooltip').css('opacity', 0);
    $('#loginform input[type=text], #loginform input[type=password]').css('border-color', '#D9E3EB');
  } else {
    // TODO: Give back some feedback to the user about incorrect credentials????
    if (userID.length > 0) {
      $('#inputUserID').css('text-transform', 'uppercase');
    } else {
      $('#inputUserID').css('text-transform', '');
    }
    $('#loginbutton').addClass('disabled');
  }
}
