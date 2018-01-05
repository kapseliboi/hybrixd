# hybridd documentation

## cryptography

hybridd employs industry-standard [nacl](https://nacl.cr.yp.to/) to encrypt and sign data packets.

A hybridd node will, upon request from a client, serve a login view. A view is a json array, containing an lzma-compressed payload (resulting in a pure hexadecimal string) that contains javascript functions and html code to provide functionality. Views can be independently verified by the client, as they are checksummed using sha256sum to allow testing their authenticity [STILL TO BE IMPLEMENTED!]. This allows hybridd to get around the conundrum of https, while at the same time not becoming vulnerable to man-in-the-middle attacks.

The login sequence starts with the client, who generates a double public/secret keypair for the session, one for encrypting (boxPk/boxSk) and one for signing (signPk/signSk), based on a 4096 bit session seed, generated with nacl.random_bytes, which in turns seeds itself from /dev/urandom (see https://www.2uo.de/myths-about-urandom/). The session encryption keypair (boxPk/boxSk) is based on the seed directly, the session signing keypair (signPk,signSk) is based on a sha256sum of the seed. Next to the session seed, the client generates a session nonce, using nacl.crypto_box_random_nonce. Note that every session's keys are uniquely generated upon first contact, affording an extra layer of security between client and server, as well as putting the computational burden on the client-side initially, causing a 'Proof of Work' effect that helps prevent easy Denial of Service attacks that spawn thousands of connections.

The hybridd node server is contacted by the client with a request to /x (the /xauth path) that has as its arguments the hexadecimal session public key and the step value of zero (0) to initiate contact.

