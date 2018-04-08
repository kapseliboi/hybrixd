// hy_login.js - contains javascript for login, encryption and session authentication

$(document).ready(function() {
  function handleLogin() {
    var btnIsNotDisabled = !$('#loginbutton').hasClass('disabled')
    if (btnIsNotDisabled) {
      var userid = $('#inputUserID').val().toUpperCase();
      var passcode = $('#inputPasscode').val();
      var isValidUserIDAndPassword = validateUserID(userid) && validatePassword(passcode);
      if (isValidUserIDAndPassword) {
        var sessionStep = session_step = 0;
        $('#loginbutton').addClass('disabled')
        rotate_login(0);
        $('#arc0').css('background-color',$('#combinator').css('color'));
        $('#generatebutton').attr('disabled','disabled');
        $('#helpbutton').attr('disabled','disabled');
        $('#combinatorwrap').css('opacity',1);
        main(userid, passcode, sessionStep);
      }
    }
  }

  // handle login click
  $('#loginbutton').click(handleLogin);
  $('#inputUserID').keypress(focusOnPasswordAfterReturnKeyOnID);
  $(document).keydown(handleCtrlSKeyEvent); // for legacy wallets enable signin button on CTRL-S
  $('#inputPasscode').keypress(function (e) {
    if (e.keyCode == 13) {
      $('#loginbutton').focus();
      handleLogin();
    }
  });

  maybeOpenNewWalletModal();
});

init.login = function(args) {
  if ( DEBUG ) { console.log('init.login called with args: '+JSON.stringify(args)); }
  // do nothing
}

function main(userid, passcode, sessionStep) {
  blink('arc0');
  nacl = null; // TODO: make official global
  nacl_factory.instantiate(
    instantiateNaclAndHandleLogin(passcode, userid, sessionStep)
  ); // instantiate nacl and handle login
}

function instantiateNaclAndHandleLogin (passcode, userID, sessionStep, cb) {
  return function (naclinstance) {
    nacl = naclinstance; // TODO: INSTANTIATION MUST BE SAVED SOMEWHERE NON-GLOBALLAY SO IT IS ACCESSABLE THROUGHOUT
    login(passcode, userID, sessionStep)
  }
}

function login (passcode, userID, sessionStep) {
  var nonce = nacl.crypto_box_random_nonce();
  var userKeys = generateKeys(passcode, userID, 0);
  var user_pubkey = nacl.to_hex(userKeys.boxPk);

  handleLogin(userKeys, nonce, userID, sessionStep)
}

function handleLogin (userKeys, nonce, userID, sessionStep) {
  dial_login(0); // Do some animation
  postSessionStep0Data(userKeys, nonce, sessionStep);
  continueSession(userKeys, nonce, userID, getSessionData, sessionContinuation(userKeys, nonce, userID));
}

// posts to server under session sign public key
function postSessionStep0Data (userKeys, nonce, sessionStep) {
  var initialSessionData = generateInitialSessionData(nonce);
  dial_login(1);
  $.ajax({
    url: path + 'x/' + initialSessionData.session_hexsign + '/' + sessionStep,
    dataType: 'json'
  })
    .done(processSessionStep0Reply(initialSessionData, nonce, userKeys));
}

function processSessionStep0Reply (sessionStep0Data, nonce, userKeys) {
  return function (nonce1Data) {
    const cleanNonceHasCorrectLength = clean(nonce1Data.nonce1).length === 48;
    if (cleanNonceHasCorrectLength) {
      session_step++; // next step, hand out nonce2
      const sessionStep = session_step;
      var sessionStep1Data = generateSecondarySessionData(nonce1Data, sessionStep0Data.session_hexkey, sessionStep0Data.session_signpair.signSk)
      $.ajax({
        url: path+'x/' + sessionStep0Data.session_hexsign + '/' + sessionStep + '/' + sessionStep1Data.crypt_hex,
        dataType: 'json'
      })
        .done(postSession1StepData(sessionStep0Data, sessionStep1Data, nonce, userKeys));
    }
  }
}

function setSessionDataInElement (sessionHex) {
  $('#session_data').text(sessionHex);
}

function postSession1StepData (initialSessionData, sessionStep1Data, nonce, userKeys) {
  return function (data) {
    var sessionData = Object.assign(initialSessionData, sessionStep1Data, { nonce }, { userKeys });
    dial_login(2);
    sessionStep1Reply(data, sessionData, setSessionDataInElement);
    dial_login(3);
  }
}

function maybeOpenNewWalletModal () {
  if (location.href.indexOf("#") != -1) {
    var locationHref = location.href.substr(location.href.indexOf("#"));
    if (locationHref === '#new') {
      PRNG.seeder.restart();
      document.getElementById('newaccountmodal').style.display = 'block';
    }
  }
}

function cannotSetUpEncryptedSessionAlert () {
  console.log('Error: Cannot set up encrypted session. Please check your connectivity!');
}

function sessionContinuation (user_keys, nonce, userid) {
  return function () {
    // use read_session(user_keys,nonce) to read out session variables
    if ( DEBUG ) { console.log(readSession(user_keys, nonce, sessionData, cannotSetUpEncryptedSessionAlert)) }
    // forward to the interface, session for the user starts
    setTimeout(function() { // added extra time to avoid forward to interface before x authentication completes!
      fetchview('interface',{
        user_keys,
        nonce,
        userid
      });
    }, 3000 );
  }
}

function getSessionData () {
  return $('#session_data').text()
}

function handleCtrlSKeyEvent (e) {
  var key = undefined;
  var possible = [ e.key, e.keyIdentifier, e.keyCode, e.which ];

  while (key === undefined && possible.length > 0)
  {
    key = possible.pop();
  }

  if (key && (key == '115' || key == '83' ) && (e.ctrlKey || e.metaKey) && !(e.altKey))
  {
    e.preventDefault();
    $('#loginbutton').removeAttr('disabled');
    return false;
  }
  return true;
}

function focusOnPasswordAfterReturnKeyOnID (e) {
  if (e.keyCode == 13) {
    $('#inputPasscode').focus();
  }
}
