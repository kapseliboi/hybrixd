# hybrix-jslib

This library can be used to connect software to leverage the
capabilities of the hybrix platform. It serves two purposes: first to
facilitate the logistics of interfacing with the hybrixd REST API,
secondly to handle all client-side operations securely and
privately. This ensures that keys required for transaction never leave
the users device and communication over an encrypted channel.

# Installation

`$ npm install hybrix-jslib`

# Usage

```
const Hybrix = require('./hybrix-jslib.js');
const hybrix = new Hybrix.Interface({http:require('http')});
hybrix.sequential(
  [
    'init',                                                       // Initialize hybrix
  ],
  ()=>{console.log('Hello World!');},                             // Define action to execute on successfull completion
  error=>{console.log('Oops, something went wrong: '+error);}     // Define action to exectue when an error is encountered
);
```

# Documentation

Library documentation: https://api.hybrix.io/help/hybrix-jslib.js

REST API reference: https://api.hybrix.io/help/api
