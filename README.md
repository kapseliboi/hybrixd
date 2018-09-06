# hybridd documentation

## Getting started

### Operating systems

- GNU/Linux
- macOS | Darwin


### Installing hybridd


To get started with hybridd, perform the following steps on a
(at the moment Debian 8 '


To install hybridd please clone the repository using the following command:

```
git clone https://github.com/internetofcoins/hybridd
```

Of download and extract the following zip file:

<https://github.com/internetofcoins/hybridd/archive/master.zip>

You can now start hybridd with

```
cd hybridd
./hybridd
```








### Dependencies

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
