## hybridd documentation

# cryptography

hybridd employs industry-standard [nacl](https://nacl.cr.yp.to/) to encrypt and sign data packets.

A hybridd node will, upon request from a client, serve a login view. A view is a json array, containing an lzma-compressed payload (resulting in a pure hexadecimal string) that contains javascript functions and html code to provide functionality. Views can be independently verified by the client, as they are checksummed using sha256sum to allow testing their authenticity [STILL TO BE IMPLEMENTED!]. This allows hybridd to get around the conundrum of https, while at the same time not becoming vulnerable to man-in-the-middle attacks.

The login
