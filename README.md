# hybridd documentation

## getting started

### installing hybridd

To get started with hybridd, perform the following steps on a GNU/Linux system (at the moment Debian 8 'jessie' is our reference system, but Debian 9 'stretch' should work also). To maintain security, we recommend to install the 'unattended-upgrades' package for automatic security updates. We are sorry that we cannot provide support for running on proprietary systems, but our build is compatible with the Darwin operating system (pilfered from FreeBSD) underneath Mac OS X. 

```
git clone https://github.com/internetofcoins/hybridd
```

### dependencies

Hybridd depends on [electrum client](https://download.electrum.org) to communicate with the Bitcoin blockchain (because why should we reinvent the wheel). The electrum download site provides the following build instructions.

Install dependencies for electrum:

```
sudo apt-get install python3-setuptools python3-pyqt5 python3-pip
```

Install electrum:

```
sudo pip3 install https://download.electrum.org/3.0.3/Electrum-3.0.3.tar.gz
```

It is not necessary to go through the electrum setup wizard and create any keys, since electrum is only used as an API and hybridd does not permanently store any keys. Hybridd expects electrum to run on 127.0.0.1:8338 by default. To configure electrum, create the required config file, the following commands should suffice.

```
mkdir ~/.electrum
echo '{ "rpcport":8338 }' > ~/.electrum/config
```
You can now start electrum in daemon mode, so it can serve API requests in the background.

```
electrum daemon &
```

### running hybridd

To fetch any missing nodejs runtime dependencies and (re)generate the views, start hybridd with the following command. 

```
cd hybridd
./coldstart_hybridd
```

## coding standards

Our coding principles

*semicolons*

Use semicolons to end a statement

*double space indent*

Use a double space (not tabs) for one indent level

*functions embraced*

Embrace functions by opening them on line 1 and closing them at the correct indent level, including a comment what function is closed if the function cannot be fully read on one small screen

```
myfunction (myvar) {
  var pi = 'three point one four';
} // close myfunction
```

*strings literal*

Use single quotes for string evaluation, except when you really need escape sequence parsing (\n) and do not forget **var** to set the scope of your variable

*ternaries kissed*

Keep ternary notation simple. Be verbose if it makes things more easy to read

*multiline exceptional*

Avoid huge statements that spill over multiple line endings

*globals sparingly*

Do not introduce any new global variables without consulting the lead programmers

*perfect global future state*

Try to integrate variables for settings and configuration within the branching global var structure already in place

*research switch*

'If nesting' can sometimes become rather unwieldy, but be careful in using novel syntax because not all older browsers can handle it

*push laundromat*

Upon pushing the code will be linted (checked for minimal standards of beauty and clarity)

*styleful merge*

Only code that has been beautified will end up in final merges (only exception for now is modular self-contained third party libraries)

*documented functionality*

Place comments in your code liberally and document innovations in a README-myelement.md or write a paragraph on the wiki on github hybridd README.md or the repo your code is in

## cryptography

### establishing communication between client and node/server

hybridd employs industry-standard [nacl](https://nacl.cr.yp.to/) to encrypt and sign data packets. The implementation model of its encrypted channels is a uniquely robust one, that has been specially developed for the Internet of Coins project. The source code can be found in /lib/xauth.js (server-side) and /views/login/login.js (client-side) and utilises jQuery 1.12.x ajax calls for queries, because it is a robust and backwards compatible library that is usable in almost all browsers including Opera for mobile and IE7 (both still often used on legacy systems).

A hybridd node will, upon request from a client, serve a login view. A view is a json array, containing an lzma-compressed payload (resulting in a pure hexadecimal string) that contains javascript functions and html code to provide functionality. Views can be independently verified by the client, as they are checksummed using sha256sum to allow testing their authenticity [STILL TO BE IMPLEMENTED!]. This allows hybridd to get around the conundrum of https, while at the same time not becoming vulnerable to man-in-the-middle attacks.

The login sequence starts with the client, who generates a double public/secret keypair for the session, one for encrypting (boxPk/boxSk) and one for signing (signPk/signSk), based on a 4096 bit session seed, generated with nacl.random_bytes, which in turns seeds itself from /dev/urandom (see https://www.2uo.de/myths-about-urandom/). The session encryption keypair (boxPk/boxSk) is based on the seed directly, the session signing keypair (signPk,signSk) is based on a sha256sum of the seed. Next to the session seed, the client generates a session nonce, using nacl.crypto_box_random_nonce, that is only used privately to encrypt the session credentials cache, so that no session information is stored openly. 

Note that every session's keys are uniquely generated upon first contact, affording an extra layer of security between client and server, as well as putting the computational burden on the client side initially, causing a 'Proof of Work' effect that helps prevent easy Denial of Service attacks that spawn thousands of connections.

The hybridd node server is contacted by the client with a request to /x (the /xauth path) that has as its arguments the hexadecimal session public key and the step value of zero (0) to initiate contact.

The node server responds by returning the first half of the session /running/ nonce in plaintext (this nonce is incremented every step to prevent distinguishing the encrypted data from random noise and to prevent fishing for keys in multiple sequential packets).

The client takes the provided first half running nonce and generates a second half running nonce. Both first and second half running nonces are lowered so their sum can never exceed the bitspace for an nacl encryption nonce (48 bits). The first and second half nonces, together with the session public key are sent to the server, signed with the client-side session signing key. This way the server can verify, based on the public signing key (which is the first argument of the connection request), that the message has not changed during transport from the client. One may note the first and second half nonces are sent publicly, though obscured by signing, however this is not a security risk, since the nonce only adds a randomisation vector to subsequent encrypted packets and prevailing opinion is that it does not weaken confidentiality as long as keys are not exposed (see https://crypto.stackexchange.com/questions/24316/security-implications-of-public-nonce).

If the client has behaved well and the response checks out, the server records the client session public key, adds the two half /running/ nonces together and generates a server-side session private/public keypair, that is used to encrypt server responses. It then sends the server-side public encryption key (boxPk) and the server-side public signing key (signPk) to the client, signed with the server-side session signing key (signSk), so the client can verify that the server public signing key (signPk) that arrives at the client has not changed in transport, by comparing the signed version with the attached public sign key. If the public signing keys inside and outside the signed message match, then only the server could have signed the package with its corresponding server-side private signing key (signSk), and the authenticity of the communication channel is now guaranteed.

Note that the security of the model rests on the inherent proven connection between the boxPk/boxSk and signPk/signSk pairs, being derived from the same original seed and thus inherently related.

[TO BE IMPLEMENTED:] in the current code of xauth and login.js, there needs to be implemented encryption of the server public keys, targeted specifically for the client. This needs to happen in order that the server-provided public sign and encryption keys contained within the encrypted packet can be matched with the sign and encryption keys outside the packet, so the client can be absolutely sure these two server-side public keys belong together and only this particular client can verify this, by using his private session key to decode the encrypted version. That the server-side public keys are publicly known (merely obscured in the signed outer shell) is not a problem, since the client will always use their private encryption and signing key to hencefort send messages to the server and this public signing key is already associated with the session from step 0. These server-side public keys could be used by an assailant to verify signed messages as coming from the server or to send an encrypted session packets targeted to the server, however since the private encryption keys of both client and server are unknown to an assailant, the server, upon authenticating the message using the public sign key associated since step 0, can know it could only originate from the original client in step 0, for only he could have signed it. In turn, the client, able to authenticate and decrypt a packet coming from the server, knows this server owns the private sign and encrypt keys associated with its original server-side session public sign key.

