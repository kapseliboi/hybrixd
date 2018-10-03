# hybridd documentation

## Getting started

### Operating systems

hybridd can be run on the following operating systems:

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
