// hy_login.js - contains javascript for login, encryption and session authentication

$(document).ready(function() {
  var clicked = false;

  maybeOpenNewWalletModal();

  function handleLogin() {
    if (!clicked && !$('#loginbutton').hasClass('disabled')) {
      var userid = $('#inputUserID').val().toUpperCase();
      var passcode = $('#inputPasscode').val();
      if ( userid.length == 16 && (passcode.length == 16 || passcode.length == 48) ) {
        clicked = true;
        session_step = 0;
        $('#arc0').css('background-color',$('#combinator').css('color'));
        $('#generatebutton').attr('disabled','disabled');
        $('#helpbutton').attr('disabled','disabled');
        $('#combinatorwrap').css('opacity',1);
        rotate_login(0);
        setTimeout(function() { main( userid,passcode ); },1000);
      }
    }
  }

  // handle login click
  $('#loginbutton').click( function() { handleLogin(clicked); });

  $('#inputUserID').keypress(function(e) {
    if (e.keyCode == 13) {
      $('#inputPasscode').focus();
    }
  });

  $('#inputPasscode').keypress(function(e) {
    if (e.keyCode == 13) {
      $('#loginbutton').focus();
      handleLogin(clicked);
    }
  });

  // for legacy wallets enable signin button on CTRL-S
  $(document).keydown(function(e) {

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
  });
});

init.login = function(args) {
  if ( DEBUG ) { console.log('init.login called with args: '+JSON.stringify(args)); }
  // do nothing
}

function validate_userid(userid) {
  var hxid = base32ToHex(userid).toUpperCase();
  return (DJB2.hash(hxid.substr(0,12)).substr(0,4)===hxid.substr(12,4)?true:false);
}

function validate_passwd(userid,passwd) {
  var hxid = base32ToHex(userid).toLowerCase();
  var entr = passwd.toUpperCase();
  return (DJB2.hash(hxid.substr(0,12)+entr).substr(4,4)===hxid.substr(16,4).toUpperCase()?true:false);
}

function main(userid,passcode) {
  // instantiate nacl
  blink('arc0');
  nacl = null; // TODO: make official global
  nacl_factory.instantiate(function (naclinstance) {

    nacl = naclinstance;

    var nonce = nacl.crypto_box_random_nonce();
    dial_login(0);
    var user_keys = generateKeys(passcode,userid,0);

    var user_pubkey = nacl.to_hex(user_keys.boxPk);
    if ( DEBUG ) { console.log('user_pubkey:'+user_pubkey+'('+user_pubkey.length+')/nonce:'+nonce); }

    do_login(user_keys,nonce);
    var sessionWatch = $('#session_data').text();
    function getSessionWatch () {
      return $('#session_data').text()
    }
    continueSession(user_keys, nonce, userid, getSessionWatch, sessionContinuation(user_keys, nonce, userid));
  });
}

function next_step() {
  // function to prevent mis-stepping by concurrent step calls
  var current_session = session_step;
  session_step++;
  return current_session+1;
}

function do_login(user_keys, nonce) {
  var initialSessionData = generateInitialSessionData(nonce)
  dial_login(1);
  // posts to server under session sign public key
  $.ajax({
    url: path + 'x/' + initialSessionData.session_hexsign + '/' + session_step,
    dataType: 'json'
  })
    .done(function(data) {
      // PROCESS REPLY TO SESSION_STEP 0 REQUEST
      // receive nonce1 back
      if ( clean(data.nonce1).length === 48 )	{
        session_step++; // next step, hand out nonce2
        var secondarySessionData = generateSecondarySessionData(data, initialSessionData.session_hexkey, initialSessionData.session_signpair.signSk)
  	$.ajax({
  	  url: path+'x/' + initialSessionData.session_hexsign + '/' + session_step + '/' + secondarySessionData.crypt_hex,
  	  dataType: 'json'
        })
          .done(function (data) {
            var sessionData = Object.assign(initialSessionData, secondarySessionData, { nonce }, { user_keys });
            function setSessionDataInElement (sessionHex) {
              $('#session_data').text(sessionHex);
            }

            dial_login(2);
            sessionStep1Reply(data, sessionData, setSessionDataInElement);
            dial_login(3);
          });
      }
    });
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
