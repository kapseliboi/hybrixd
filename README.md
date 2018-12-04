# hybrixd documentation

## Getting started

### Operating systems

hybrixd can be run on the following operating systems:

- GNU/Linux
- macOS (Darwin)

### Installing hybrixd

To install hybrixd please clone the repository using the following command:

```
git clone https://github.com/internetofcoins/hybrixd
```

Or download and extract the following zip file:

<https://github.com/internetofcoins/hybrixd/archive/master.zip>

You can now start hybrixd using the following command:

```
./hybrixd
```

## Using hybrixd

**Webwallet** : Browse to <http://localhost:8080> to access the web wallet.

**Command line interface** : Use `.\hybrixd --help` to view all command line options.

**REST API** : Use  <http://localhost:1111> or <http://localhost:8080/api> to access the REST API. Browse to <http://localhost:1111/help> for documentation.

**JavaScript API Library** : Import hybrixd.client, a Javascript library file for NodeJS and browsers,  to create applications or websites that can connect to hybrixd.

## Configuring hybrixd

General settings for hybrixd can be configured using the configuration file:

```
hybrixd.conf
```

See `hybrixd.conf.example` for more information.

For the configuration and addition of tokens please see the recipe folder located in:

```
recipes/
```
