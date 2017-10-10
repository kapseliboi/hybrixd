<?php

// cr/login.php - register connecting client, hand out session hash and present login form

// TODO: autodetect dynamic ip by falling back to session_salt only if session_hash is not found
// TODO: show waiting spinner while JS is calculating PBKDF

// filter out POST requests
if ( isset($_POST['request']) ) {
	if ( isset($_POST['salt']) ) {
		// look up salt in DB
		$pure_salt = preg_replace("[^A-Za-z0-9]","",$_POST['salt']);
		$query = 'SELECT id, session_hash FROM Control WHERE session_salt = "'.$pure_salt.'";';
		$sql = mysqli_connect("localhost","control","Y3ll0wc0ntr0l.","control") or die("Error ".mysqli_error($sql));
		$result = $sql->query($query) or die("Error ".mysqli_error($sql)); 
		$row = $result->fetch_assoc();
		// use session_hash to decode client_seed and user
		$session_hash = $row['session_hash'];
		// TODO:insert check for same origin or dynamic ip
		// DEBUG
		echo 'Session hash found: '.$session_hash;
		 
		
	}
} else {

// LOGGING

// create string to randomize/salt session_hash and for the session itself
$hash_salt = bin2hex(openssl_random_pseudo_bytes(8, $strong)); // 64 bits (enough?)

//$session_salt = bin2hex(openssl_random_pseudo_bytes(8, $strong));
$iv_size = mcrypt_get_iv_size(MCRYPT_RIJNDAEL_128, MCRYPT_MODE_CBC);
$iv_key = mcrypt_create_iv($iv_size, MCRYPT_RAND);
$session_salt = bin2hex($iv_key); 

// user agent string, remote address and remote host must remain constant during login procedure
$session_hash = hash('sha256',$hash_salt);

// log data about connection request
$query = 'INSERT INTO Control SET timestamp = NOW(), request_time = "'.$_SERVER['REQUEST_TIME'].'", user_agent = "'.$_SERVER['HTTP_USER_AGENT'].'", remote_addr = "'.$_SERVER['REMOTE_ADDR'].'", remote_host = "'.$_SERVER['REMOTE_HOST'].'", remote_port = "'.$_SERVER['REMOTE_PORT'].'", query_string = "'.$_SERVER['QUERY_STRING'].'", session_hash = "'.$session_hash.'", session_salt = "'.$session_salt.'";';

$sql = mysqli_connect("localhost","control","Y3ll0wc0ntr0l.","control") or die("Error ".mysqli_error($sql));

$result = $sql->query($query) or die("Error ".mysqli_error($sql)); 

// DEBUG
//echo $query.'<br>';
echo 'Session hash (Key): '.$session_hash.'<br>';
echo 'Session salt (IV): '.$session_salt.' (strong:'.$strong.')<br>';
echo 'Connection was inserted as entry '.mysqli_insert_id($sql).'<br>';

// PAGE OUTPUT

// construct login form
$html = '';

// html header
$html .= '<html><head></head>';

// open html body
$html .= '<body>';

// page input elements
$html .= '<form id="login_form" name="login_form">';
$html .= '<input type="hidden" id="session" name="session" value="'.$session_hash.'">';
$html .= '<label>Login: <input type="text" id="u" name="u" required></label><br>';
$html .= '<label>Password: <input type="password" id="p" name="p" required></label><br>';
$html .= '</form>';

// action button
//$html .= '<input type="submit" value="OK" id="login_button" onclick="clickHandler(event)">';
$html .= '<input type="submit" value="OK" id="login_button">';

// php encryption
$enc_key = pack('H*', $session_hash);
$enc_txt = bin2hex(mcrypt_encrypt( MCRYPT_RIJNDAEL_128, $enc_key, "Message that is good.", MCRYPT_MODE_CBC, $iv_key ));

$html .= '<br>Enc (PHP): '.$enc_txt;

// php decryption of pure cipherstring from crypto-js (cr.ciphertext only!)
$dec_txt = mcrypt_decrypt( MCRYPT_RIJNDAEL_128, $enc_key, hex2bin($enc_txt), MCRYPT_MODE_CBC, $iv_key ); 

$html .= '<br>Dec (PHP): '.$dec_txt;

// password to key conversion (PHP)
$html .= '<br>Gen_key (PHP): '.pbkdf2('sha1', 'secret', $session_salt, 2000, 256/8).'<br>'; // keysize in bytes (8 bits)

// import crypto-js aes + zeropadding + pbkdf2 functions
$filename = 'aes.js';
$handle = fopen($filename, 'r');
$contents = fread($handle, filesize($filename));
fclose($handle);
$html .= '<script>'.$contents.'</script>';

$filename = 'pad-zeropadding-min.js';
$handle = fopen($filename, 'r');
$contents = fread($handle, filesize($filename));
fclose($handle);
$html .= '<script>'.$contents.'</script>';

$filename = 'pbkdf2.js';
$handle = fopen($filename, 'r');
$contents = fread($handle, filesize($filename));
fclose($handle);
$html .= '<script>'.$contents.'</script>';

// embed jquery minimal within page
$filename = 'jquery-1.11.1.min.js';
$handle = fopen($filename, 'r');
$contents = fread($handle, filesize($filename));
fclose($handle);
$html .= '<script>'.$contents.'</script>';

// javascript encryption
$html .= '<script>

	// password to key conversion (JS)
	var gen_key = CryptoJS.PBKDF2("secret", "'.$session_salt.'", { keySize: 256/32, iterations: 2000 }); // keysize in 32 bit words


	var key = CryptoJS.enc.Hex.parse("'.$session_hash.'");
	var ivs = CryptoJS.enc.Hex.parse("'.$session_salt.'");

	// encryption usage example
	var cr = CryptoJS.AES.encrypt( "Message that is good.", key, { iv: ivs, padding: CryptoJS.pad.ZeroPadding });

	// decrypt raw ciphertext using crypto-js	
	var cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Hex.parse("'.$enc_txt.'") }); 
	dec_str = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, cipherParams, key, { iv: ivs });
	dec_txt = CryptoJS.enc.Utf8.stringify(dec_str);

	// generate 64 chars client_seed hex (= 512 bits)
	client_seed = (Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2)).subjstr(0,64);

	// DEBUG
	document.write("JS Key: "+key+" / IV: "+ivs+"<br>Enc (JS): "+cr.ciphertext+"<br>Dec (JS): "+dec_txt+"<br>client_seed: "+client_seed+" l: "+client_seed.length+"<br>Gen_key (JS): "+gen_key+"<br>");
	
	$(document).ready(function() {
		$("#login_button").click(function() {
			//var key = CryptoJS.enc.Hex.parse("'.$session_hash.'");
			//var ivs = CryptoJS.enc.Hex.parse("'.$session_salt.'");
			
			// contact server (please pass the salt!)		
			var req_txt = client_seed + $("#u").val();
			alert(req_txt);
			var req_raw = CryptoJS.AES.encrypt( req_txt, key, { iv: ivs, padding: CryptoJS.pad.ZeroPadding });
			// explicitly cast ciphertext to string
			var req = ""+req_raw.ciphertext;
			var pw_salt = "";
			$.post( "login.php", { request: req, salt: "'.$session_salt.'" } );
			
			//var passkey = CryptoJS.PBKDF2($("#p").val(), pw_salt, { keySize: 256/32, iterations: 2000 }); // keysize in 32 bit words
		});
	});
	
//	// raw JS click handler
//	function clickHandler(e) {
//    	var target = (e.target) ? e.target : e.srcElement;
//    	var u_ref = login_form.elements["u"];
//    	var p_ref = login_form.elements["p"];
//    	console.log(target.id+" / "+u_ref.value+" / "+p_ref.value);
//    	
//	}

</script>';

// close html body
$html .= '</body></html>';

// output html
echo $html;

} // closes POST if handler

// php helper functions
function pbkdf2($algorithm, $password, $salt, $count, $key_length, $raw_output = false)
{
    $algorithm = strtolower($algorithm);
    if(!in_array($algorithm, hash_algos(), true))
        trigger_error('PBKDF2 ERROR: Invalid hash algorithm.', E_USER_ERROR);
    if($count <= 0 || $key_length <= 0)
        trigger_error('PBKDF2 ERROR: Invalid parameters.', E_USER_ERROR);

    if (function_exists("hash_pbkdf2")) {
        // The output length is in NIBBLES (4-bits) if $raw_output is false!
        if (!$raw_output) {
            $key_length = $key_length * 2;
        }
        return hash_pbkdf2($algorithm, $password, $salt, $count, $key_length, $raw_output);
    }

    $hash_length = strlen(hash($algorithm, "", true));
    $block_count = ceil($key_length / $hash_length);

    $output = "";
    for($i = 1; $i <= $block_count; $i++) {
        // $i encoded as 4 bytes, big endian.
        $last = $salt . pack("N", $i);
        // first iteration
        $last = $xorsum = hash_hmac($algorithm, $last, $password, true);
        // perform the other $count - 1 iterations
        for ($j = 1; $j < $count; $j++) {
            $xorsum ^= ($last = hash_hmac($algorithm, $last, $password, true));
        }
        $output .= $xorsum;
    }

    if($raw_output)
        return subjstr($output, 0, $key_length);
    else
        return bin2hex(subjstr($output, 0, $key_length));
}

?>
