# hybrixd documentation

## Getting started

### Operating systems

hybrixd can be run on the following operating systems:

- GNU/Linux
- macOS (Darwin)

### Installing hybrixd
#### Prerequisites
The hybrixd node depends on several other Hybrix libraries. To keep everything organized, we advise you create and change into a new directory before installing it:

```
mkdir hybrix
cd hybrix
```
#### Installation
To install hybrixd please clone the repository using the following command:

```
git clone https://github.com/hybrix-io/hybrixd-node
```

Or download our distributable here: <https://api.hybrix.io/help/hybrixd>

#### Dependencies
Change into the hybrix-node directory to download and install necessary dependencies and Hybrix libraries. To install, run:

```
cd hybrix-node
npm run setup
```
#### Running hybrixd
After extracting the archive and running setup, you can now start hybrixd in the same directory using the command:

```
./hybrixd
```

## Using hybrixd

### Command line interface
**Usage**
Command line / terminal commands can be accessed in the following manner:

`.\hybrixd /$cmd` where `$cmd` refers to the endpoints you wish to access. The requests are formatted as forward-slash ('/') separated commands.

**Example endpoints**
`.\hybrixd /asset` returns a list of all the available assets in hybrixd.
`./hybrixd /command/apiqueue/status` returns the status of the API queue.

**Available endpoints**
You can find all the available endpoints here at <http://localhost:1111> or <http://localhost:8080/api> to view locally or browse to  <https://api.hybrix.io/help/api> to view it online.

**Command line options** :
Use `.\hybrixd --help` to view all command line options.

### REST API
Use <http://localhost:1111> or <http://localhost:8080/api> to access the REST API. Browse to <http://localhost:8080/api/help> for documentation.

### JavaScript API Library
Import hybrix.lib, a Javascript library file for NodeJS and browsers, to create applications or websites that can connect to hybrixd.

### Webwallet
Browse to <http://localhost:8080> to access the web wallet.

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

More information about how to create recipe files to add your own assets can be found in the the readme file README-add-asset.md .
