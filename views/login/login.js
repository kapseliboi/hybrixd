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
    continue_session(user_keys,nonce,userid);

  });
}

function next_step() {
  // function to prevent mis-stepping by concurrent step calls
  var current_session = session_step;
  session_step++;
  return current_session+1;
}

function read_session(user_keys,nonce) {
  // decrypt session data (so that it does not lie around but is only 'known' upon decrypt)
  var sess_bin = nacl.from_hex($('#session_data').text());
  // user's session nonce is used for session_data
  var session_data = nacl.crypto_box_open(sess_bin,nonce,user_keys.boxPk,user_keys.boxSk);
  var session_string = nacl.decode_utf8(session_data);

  return JSON.parse(session_string);
}

function continue_session(user_keys,nonce,userid) {
  var session_watch = $('#session_data').text();
  if ( session_watch == '' ) {
    setTimeout( function() { continue_session(user_keys,nonce,userid); }, 1000 );
  } else {
    // use read_session(user_keys,nonce) to read out session variables
    if ( DEBUG ) { console.log(read_session(user_keys,nonce)); }
    // forward to the interface, session for the user starts
    setTimeout(function() { // added extra time to avoid forward to interface before x authentication completes!
      fetchview('interface',{'user_keys':user_keys,'nonce':nonce,'userid':userid});
    }, 3000 );
  }
}

function do_login(user_keys,nonce) {
  // post session_pubkey to server + receive server_pubkey back
  // generate random session_seed
  var session_seed = nacl.random_bytes(4096);
  // generate new session keypair
  var session_keypair = nacl.crypto_box_keypair_from_seed(session_seed);
  // generate new session signpair
  var session_sign_seed = nacl.crypto_hash_sha256(session_seed);
  var session_signpair = nacl.crypto_sign_keypair_from_seed(session_sign_seed);
  // convert nonce to hex representation for urlsafe transport
  var session_nonce = nacl.to_hex(nonce);
  // convert pubkeys to hex representation for urlsafe transport
  var session_hexkey = nacl.to_hex(session_keypair.boxPk);
  var session_hexsign = nacl.to_hex(session_signpair.signPk);
  // convert seckeys to hex for storage in key_array
  var session_seckey = nacl.to_hex(session_keypair.boxSk);
  var session_secsign = nacl.to_hex(session_signpair.signSk);

  if ( DEBUG ) { console.log('session_seed:'+session_seed+'('+session_seed.length+')'); }
  if ( DEBUG ) { console.log('session_hexkey:'+session_hexkey+'('+session_hexkey.length+')'); }
  if ( DEBUG ) { console.log('session_sign_seed:'+session_sign_seed+'('+session_sign_seed.length+')'); }
  if ( DEBUG ) { console.log('session_hexsign:'+session_hexsign+'('+session_hexsign.length+')'); }

  dial_login(1);
  // posts to server under session sign public key
  $.ajax({
    url: path + 'x/' + session_hexsign + '/' + session_step,
    dataType: 'json'
  })
    .done(function(data) {
      // PROCESS REPLY TO SESSION_STEP 0 REQUEST
      // receive nonce1 back
      if ( clean(data.nonce1).length === 48 )	{
        session_step++; // next step, hand out nonce2
  	var nonce2 = nacl.crypto_box_random_nonce();
  	var nonce2_hex = nacl.to_hex(nonce2);
  	// change first character to 0-7 if it is 8,9,a-f to keep sum nonce within 32 bytes
  	var nonce2_hex = nonce2_hex.replace(/^[8-9a-f]/,function(match){var range=['8','9','a','b','c','d','e','f']; return range.indexOf(match);});
  	var nonce1_hex = clean(data.nonce1);
  	var nonce1_hex = nonce1_hex.replace(/^[8-9a-f]/,function(match){var range=['8','9','a','b','c','d','e','f']; return range.indexOf(match);});
  	var secrets_json = { 'nonce1':nonce1_hex, 'nonce2':nonce2_hex, 'client_session_pubkey':session_hexkey };
  	var session_secrets = JSON.stringify(secrets_json);

  	// using signing method to prevent in transport changes
  	var crypt_bin = nacl.encode_utf8(session_secrets);
  	var crypt_response = nacl.crypto_sign(crypt_bin,session_signpair.signSk);
  	var crypt_hex = nacl.to_hex(crypt_response);

  	if ( DEBUG ) { console.log('CR:'+crypt_hex); }
  	$.ajax({
  	  url: path+'x/'+session_hexsign+'/'+session_step+'/'+crypt_hex,
  	  dataType: 'json'
        })
          .done(function (data) {
            var sessionData = {
              nonce1_hex,
              nonce2_hex,
              session_keypair,
              session_nonce,
              session_secsign,
              session_seckey,
              session_hexsign,
              session_hexkey,
              nonce,
              user_keys
            }
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
