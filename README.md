# hybridd documentation

## getting started

### installing hybridd

To get started with hybridd, perform the following steps on a GNU/Linux system (at the moment Debian 8 'jessie' is our reference system, but Debian 9 'stretch' should work also). To maintain security, we recommend to install the 'unattended-upgrades' package for automatic security updates. We are sorry that we cannot provide support for running on proprietary systems, but our build is compatible with the Darwin operating system (pilfered from FreeBSD) underneath Mac OS X. 

```
git clone https://github.com/internetofcoins/hybridd
```

### dependencies

Hybridd depends on [electrum client](https://download.electrum.org) to communicate with the Bitcoin blockchain (because why should we reinvent the wheel). The electrum download site provides the following build instructions.

Install dependencies for electrum:

```
sudo apt-get install python3-setuptools python3-pyqt5 python3-pip
```

Install electrum:

```
sudo pip3 install https://download.electrum.org/3.0.3/Electrum-3.0.3.tar.gz
```

It is not necessary to go through the electrum setup wizard and create any keys, since electrum is only used as an API and hybridd does not permanently store any keys. Hybridd expects electrum to run on 127.0.0.1:8338 by default. To configure electrum, create the required config file, the following commands should suffice.

```
mkdir ~/.electrum
echo '{ "rpcport":8338 }' > ~/.electrum/config
```
You can now start electrum in daemon mode, so it can serve API requests in the background.

```
electrum daemon &
```

### running hybridd

To fetch any missing nodejs runtime dependencies and (re)generate the views, start hybridd with the following command. 

```
cd hybridd
./coldstart_hybridd
```
