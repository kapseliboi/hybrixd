# hybridd documentation

## cryptography

hybridd employs industry-standard [nacl](https://nacl.cr.yp.to/) to encrypt and sign data packets.

A hybridd node will, upon request from a client, serve a login view. A view is a json array, containing an lzma-compressed payload (resulting in a pure hexadecimal string) that contains javascript functions and html code to provide functionality. Views can be independently verified by the client, as they are checksummed using sha256sum to allow testing their authenticity [STILL TO BE IMPLEMENTED!]. This allows hybridd to get around the conundrum of https, while at the same time not becoming vulnerable to man-in-the-middle attacks.

The login sequence starts with the client, who generates a double public/secret keypair for the session, one for encrypting (boxPk/boxSk) and one for signing (signPk/signSk), based on a 4096 bit session seed, generated with nacl.random_bytes, which in turns seeds itself from /dev/urandom (see https://www.2uo.de/myths-about-urandom/). The session encryption keypair (boxPk/boxSk) is based on the seed directly, the session signing keypair (signPk,signSk) is based on a sha256sum of the seed. Next to the session seed, the client generates a session nonce, using nacl.crypto_box_random_nonce, that is only used privately to encrypt the session credentials cache, so that no session information is stored openly. 

Note that every session's keys are uniquely generated upon first contact, affording an extra layer of security between client and server, as well as putting the computational burden on the client side initially, causing a 'Proof of Work' effect that helps prevent easy Denial of Service attacks that spawn thousands of connections.

The hybridd node server is contacted by the client with a request to /x (the /xauth path) that has as its arguments the hexadecimal session public key and the step value of zero (0) to initiate contact.

The node server responds by returning the first half of the session /running/ nonce in plaintext (this nonce is incremented every step to prevent distinguishing the encrypted data from random noise and to prevent fishing for keys in multiple sequential packets).

The client takes the provided first half running nonce and generates a second half running nonce. Both first and second half running nonces are lowered so their sum can never exceed the bitspace for a crypto_box encryption nonce. The first and second half nonces as well as the session public key are sent to the server, signed with the session signing key. This way the server can verify that the message has not changed during transport from the client. One may note the first and second half nonces are sent publicly, however this is not a security risk, since the nonce only adds a randomisation vector to subsequent encrypted packets and prevailing opinion is that it does not weaken confidentiality as long as keys are not exposed.

