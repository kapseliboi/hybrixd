# hybrixd

The hybrix platform environment can be run on your own personal
computer or server by downloading the daemon called hybrixd. This
makes it possible to host your own wallet, be your own bank and have a
powerful multi-blockchain system at your fingertips.

## Install using NPM

To install hybrixd using npm:

```
$ npm install hybrixd
```

To then start hybrixd

```
./node_modules/hybrixd/hybrixd
```

This will start the hybrixd node. Note that if you close the terminal
session or press control+c the hybrixd will be terminated.

The hybrix web-wallet will now be available on:

http://localhost:8080

The local REST api will now be available on:

http://localhost:1111

Browse to http://localhost:1111/help for more information.

## Getting started

Check out our site for the latest versions and information about
running and configuring your node.

https://api.hybrix.io/help/hybrixd

## hybrix-jslib

To connect your node-js and web applications to the hybrix platform
you can use the Javascript interface library:

https://api.hybrix.io/help/hybrix-jslib

## Requirements

hybrixd can be run on the following operating systems:

- GNU/Linux
- macOS (Darwin)
- [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10)

Furthermore, hybrixd requires [NodeJS](https://nodejs.org). We recommend using NodeJS version 12.
