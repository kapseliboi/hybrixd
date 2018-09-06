# hybridd documentation

## Getting started

### Operating systems

hybridd is can be run on the following operating systems:

- GNU/Linux
- macOS (Darwin)

### Installing hybridd

To install hybridd please clone the repository using the following command:

```
git clone https://github.com/internetofcoins/hybridd
```

Or download and extract the following zip file:

<https://github.com/internetofcoins/hybridd/archive/master.zip>

You can now start hybridd using the following command:

```
./hybridd
```

## Using hybridd

**Webwallet** : Browse to <http://localhost:8080> to access the web wallet.

**Command line interface** : Use `.\hybridd --help` to view all command line options.

**REST API** : Use  <http://localhost:1111> or <http://localhost:8080/api> to access the REST API. Browse to <http://localhost:1111/help> for documentation.

**JavaScript API Library** : Import hybridd.client, a Javascript library file for NodeJS and browsers,  to create applications or websites that can connect to hybridd.  

## Configuring hybridd

General settings for hybridd can be configured using the configuration file:

```
hybridd.conf
```

See `hybridd.conf.example` for more information.

For the configuration and addition of tokens please see the recipe folder located in:

```
recipes/
```

## Installing electrum [optional]

hybridd depends on [electrum client](https://download.electrum.org) to communicate with the Bitcoin blockchain. The electrum download site provides the following build instructions.

Install dependencies for electrum:

```
sudo apt-get install python3-setuptools python3-pyqt5 python3-pip
```

Install electrum:

```
sudo pip3 install https://download.electrum.org/3.0.3/Electrum-3.0.3.tar.gz
```

Note: It is not necessary to go through the electrum setup wizard and create any keys, since electrum is only used as an API and hybridd does not permanently store any keys. Hybridd expects electrum to run on 127.0.0.1:8338 by default. To configure electrum, create the required config file, the following commands should suffice.

```
mkdir ~/.electrum
echo '{ "rpcport":8338 }' > ~/.electrum/config
```
You can now start electrum in daemon mode, so it can serve API requests in the background.

```
electrum daemon &
```
