# v0.6.4
## Furry Pink Sphinx
## 30-01-2020

* Fix parsing of huge hexadecimals
* Fix require statement in example
* Implement method to list stored items
* Update hybrix-jslib names in documentation
* Import recipes recursively from recipe folder
* Add byte folder to common on compile
* Add variable flow for command parameters
* Modify qrtz true to only do math comparisons
* Create preparational stub for asset confirmed endpoint
* Implement qrtz byte command for bit encoding
* Fix true fn in qrtz is evaluated as boolean when used within the with fn
* Improve mock chain
* Waves sample transaction does not handle symbol properly
* Put fork parameters in documented order
* Fix fuse method
* Continue with main process after childless fork




# v0.6.3
## Happy Pink Kobold
## 17-01-2020

* Fixed for hybrix-jslib: Cannot inititiate without session Thanks for reporting bartwr!
* Release to npm
* Release to github packages
* Implement daily asset status reports /report/assets
* Improve error handling for local variable storage and refactor to separate functions
* improve electrum transaction postprocessing
* Parse ubq balance (from hexadeximal)
* Hide proc calls from log /p/$PROCID
* Pass command line parameters to qrtz interactive
* Improve error handling for load, save, seek
* Handle command parameters in vars
* Improvements to qrtz math, fuse, rout, flow and rand functions
* qrtz flow based on a peek value
* Add contract check to mockchain
* Parse binary numbers
* Catch non existing module
* Fix qrtz data date documentation




# v0.6.2
## Fluffy Maroon Ogre
## 04-12-2019

* Fixed ark-to-many-requests
* Improved setup script
* Fix switch live example
* Added qrtz debug ui
* Added blockexplorer URL, removed donee from balance
* Removed logs and redundant code
* Transaction lookup works now
* Fix debug-access
* Fix xem-history-parsing
* Warn-error-handling-for-curl
* Curl upgrades
* Fix subcommand bug
* Qrtz debug ui
* Fix xrp transaction
* Retry websocket initialization
* Fix nxt token transaction
* remove broken bitcoin cash host
* remove the letter r from transferr in readme file recipes
* update sleep time
* handle tcp connection errors
* Disable transports by default
* Add start-up commands to hybrixd
* fix xem history parsing
* rename-refs-in-package-json-to-hybrix
* curl in push now on fail giving error msg
* fixed small bug in engine.synchronize quotes were missing, and btc recipe fix for the faulty tran
* Precompile-qrtz-recipes-in-memory

# v0.6.1
## Little Teal Sphinx
## 07-11-2019

* upgrade to Node JS 12 (version 12.13)
* fixes for tcp socket error
* type checks for flat and join
* buffer fixes
* integrate Windows Subsystem for Linux in documentation

# v0.5.20
## Happy Sienna Phoenix
## 19-10-2019

* ethereum gas calculation enhancements
* modified deterministic library to handle dynamic gas calculations
* add gaslimit to eth unspent
* added variable declaration for node in setup script
* added recipe for Circuits of Value (eth.coval)

# v0.5.19
## Fluffy Purple Sphinx
## 11-10-2019

* Add checks for file existance (fix for wallet-crashes)

# v0.5.18
## Cosy Purple Kobold
## 09-10-2019

* Source Code Pro font reference fixed
* Setup script fixed
* Check if file is a file and not a directory
* Fixed BNB-timestamp bug (was in miliseconds)
* Fixed Broken js-lib examples on docs page
* Removed html tags from exampleCode

# v0.5.17
## Little Purple Ogre
## 24-09-2019

* added history for BNB
* added "apk upgrade" as fix for failing curl

# v0.5.16
## Furry Purple Phoenix
## 11-09-2019

* recipe fixes for BTC and ARDR
* added extra host for BCH
* small fixes: scrollbar in sidebar, clickable menu items and qrtz link on introduction page
* qrtz indx() supports finding the location of a string
* fee-symbol now set according to variable, before defaulting to string split method
* add draft documentation for contributing to hybrix
* Update node readme and setup script.
* add-date-to-unix-conversion
* clarify hybrixd usage in readme.

# v0.5.15
## Happy Purple Sphinx
## 29-08-2019

* qrtz improved repl function for regex replacement
* upgrade client library docs
* add connector documentation
* APIqueue auto parse
* updated mockchain and update web-wallet
* add numeric sorting for debug
* added STL token from esaulkov/stablecoinswap
* fixed qrtz tran bug
* fix Bank Address Retrieve
* electrum Cache Improvement
* add symbol properly before address retrieval
* caching of calculated transaction results to increase performance of tx requests
* electrum cache improvement
* moved EXP out of maintenance
* remove hosts without history
* Add push for unified asset
* split Eth Recipe To Engine
* fix parsing bug for qrtz find
* fixed ETH asset support by splitting out to engine
* EXP put into maintenance
* add unified asset as recipe
* documentation changes to atom, bank, burn, call, case, code, copy, curl, data, date, done, drop, fork
* qrtz flow Improve handling of non string labels and edge cases
* catch parse bug
* fixed ardr + cli wallet issue

# v0.5.14
## Fluffy Pink Kobold
## 06-08-2019

* final changes to Ardor and Ignis recipes
* update ignis recipe

# v0.5.13
## Cosy Pink Ogre
## 25-07-2019
* #782 Clean up unused npm modules
* #781 Fix burst transaction and history
* qrtz bank()
* Fix-default-module
* Set default module to quartz
* Introduce force test mode, remove redundant debug logs
* Update asset.eth.json (fix-typo-in-eth-recipe)
* Update pipeline steps
* #768 Improve timeout handling
* Fix waves transaction
* temporary fix to dysfunctional hcmd
* #71-add-Ignis
* disabled unhandled error variable for ESlint
* properly working Ignis and NXT recipes
* Fix waves transaction
* Improve timout handling
* fixes to NXT, Ardor, Ignis recipes
* Ardor recipe amended: symbol and sample
* return short hashes on status
* Improve testing
* Use test mode
* Coin fixes
* Update asset.dgb.json
* Issue/765 headers and options not passed properly for electrum
* #71-Add Ignis and Ardor recipes.
* Fix scheduler timeout bug
* Implement APIqueue test mode
* #759-tx selected for validated
* Eth (electrum/insight?) details not available
* increased timeout for Electrum engine for miner transactions
* fixed timeout issue qrtz with()
* increased storage limit to 128k for large size transactions
* fix to JSON splitting mechanism
* Update tcp handling using a buffer and backlog to parse messages
* Improve nem validation
* Fix augur token
* enable op returns for xrp
* Improve compile speed using rsync
* Refactor the pipeline scripts into separate shell scripts.
* fix legacy math strings to use new simplified format
* Add fallback parameter to peek, use for insight fee fallback
* #137 fix failing nxt txs
* make sure defaults are aligned
* default to get on unknown method
* ignore empty synchronization lists
* #167-Update flow with contract.

# v0.5.12
## Little Pink Phoenix
## 26-06-2019

* Upgraded helm and kubernetes versions for deployment improvements

# v0.5.11
## Furry Pink Sphinx
## 26-06-2019

* Point-Math-common-for-compiled-version
* Update math.js
* select peer fix
* Update test paths
* Add test.sh to compile
* Fix qrtz documentation, update explorer
* ESlinted changes
* increased verbosity on send/read errors for transports
* wallet-users-cannot-seen-NXT-token-balance
* fix for retriving asset balance
* refactor qrtz into methods
* xrp-faulty-qrtz typo in jump rectified
* ESlinted
* Improve testing for interface and qaurtz
* save and sync bug fixed: return no error on non-sync save
* catch attempted reads and sends to closed handles
* disabled debug message
* ESlinted
* fixStorage
* fix possible issue with set/get
* implement eth token history
* Fix routetree
* implement-messages-for-nxt
* final fixes to storage
* storage command interpretation fixed to allow arguments and data
* check for handle before action
* avoid duplicate handles (test)
* announce bug due to linting
* linting problem with()
* Issue/709 xcp sample transaction

# v0.5.10
## Happy Pink Kobold
## 18-06-2019

* enable-transactions-for-xem
* fix qrtz documentation
* major update to transaction information interpretation for proper spend value, fee value calculation and correct source, target addresses
* fix-info-in-recipes
* opdate information for DGD
* added information for augur
* end paragraph before wiki link
* update-poke-and-peek-for-arrays
* update-documentation-for-interface
* fix-history-for-ark
* Update error handling for insight engine
* incorrect-timestamp-retrieved-for-transactions
* fixed incorrect timestamp for nxt burst and ark
* explorer fixes
* ubq-hist-and-tx-warning
* history now working for 5 txs
* increase storage limit per key to 64kb
* make storage limit non-breaking
* EVM dependencies and audited security fixes
* Ethereum Virtual Machine interpreter and decompiler module
* fix waves history pagination
* implement burst history
* hide debug logging from lisk
* rate limit info added to recipes, xrp, xlm and omni
* Asset fixes for rise, xcp and electrum and insight engines
* Fix history for xrp,xem, omni, Transaction for ubq, Fee for bch
* History fixed for eth,lsk,nxt,waves,btc   Qrtz poke updated, vars removed
* typos-in-ripple-recipe
* Cannot-get-address-history
* Modify teletype to retrieve cummulative data, disable broken electrum hosts
* Fix-zcash-recipe
* Fix routing for root, update xhy tokens, add block explorer
* Router,-dummy,-mock-fixes
* Fix-Some-nxt-servers-give-a-incorrect-Unknown-account-response
* Update nxt hosts

# v0.5.9
## Fluffy Maroon Ogre
## 15-05-2019

* Update dist/release process
* Fix burst and nxt unspents
* Fix websocket calls
* Gracefull stop hybrixd
* Fix balance for nxt tokens
* Fixes for xem and xcp

# v0.5.8
## Cosy Maroon Phoenix
## 08-05-2019

* integration with deterministic module 1.0.1
* fix ubq balance
* recipe fixes, clean each command, add type command
* disable history for eth tokens
* reorder start up for conf
* rename label @returnCache
* make sure asset cache is prefixed with tx (outside of hash)
* cache history for electrum and insight
* update web wallet, interface, remove bts tokens
* merge branch 'agent725-recipeRepairs' into 'master'
* better transaction error handling and caching
* auto create storage directory if non-existant
* added have()
* changed transaction cache storage
* avoid double route logging at console
* include latest deterministic
* store transaction data separated by symbol
* implement new balance API, history, and transaction fixes
* fixes to BTC recipe
* transaction confirmations fix
* LSK addresses allowed to be 20 digits long
* unspent change now uses atomics
* small adjustment to scan()
* unspent: no reverse atom on change output
* return txid proper with insight
* fix valuations bug
* converted Electrum and Insight engines to return unspents in atomic values
* fix of valuations engine
* update import keys, swap, fix qrtz func
* upgrade ethereum module
* fix lisk balance issue
* fix xrp history.
* clean cache globals
* shorthand calls and non-repetitive logging
* merge branch 'issue/xrp-history-hash-fix' into 'master'
* merge branch 'master' into 'issue/xrp-history-hash-fix'
* xrp hash in history fix
* Merge branch 'agent725-moreFixes' into 'master'
* hide /attachment, fix history/balance/status for many coins
* fix math sum and e-notation handling
* serialized and compressed transaction storage
* cache electrum transaction information
* better readability
* transaction data is now stored long-term for fast retrieval
* handle JSON parsing properly
* make sure jsonfix does not misinterpret '-' in key values
* update engine.storage.json
* removed unnecessary done from end of transaction
* fix nacl bug
* corrected timestamp according to genesis block time
* xrp tx hash visibility
* update transaction for omni and dummy
* enable conf per module
* initialize qrtz modules
* update module.js
* prototype of curl call before alternative routing
* shorthand calls produce a lot of data
* initialize static endpoints when module is loaded
* add slash to curl path
* attempt to handle direct calls in transports
* clean up global functions
* update mock history
* updated lib interface compilation for PoW
* Fix ellipsis routing and sync module
* Create sync modern modules, fix redirect module
* changed retention time calculations
* added list of currencies to valuations (hardcoded for now)
* proof of Work seems to fail when used in web-wallet
* upgrade mimetype handling
* fix help output, remove blockexplorer module (replaced by insights engine) add module documentation
* reading namespace entries support added to namecoin
* added support for Namecoin
* fee handling fixed for engine.insight, engine.electrum-tcp, bch, flo

# v0.5.7
## Little Maroon Sphinx
## 11-04-2019

* Implement pow queue
* Recipe for BCH using the insight engine
* Update interface for pow queueing
* Unspents for BCH now working
* Upgrade storage
* Download latest versions of packages straight from GitHub
* Update lzma's
* Added du and async
* hybrixd configuration and example updated for maxstorage size
* Storage to retain all data until maxstorage size is breached
* Added du module + fix of NPM vulnerabilities
* Proper fee calculation in tx history for TRX
* Tron transaction,history,status,attachment,message
* Add nonzero example

# v0.5.6
## Furry Maroon Kobold
## 04-04-2019

* New Insight engine for adding more obscure coins
* Added FLO coin recipe
* Moved XEL recipe to recipes.EXTRA
* History added for many coins
* Status added for many coins
* Transaction added for many coins
* Attachment/OP_RETURN reading added for many coins
* Message reading added for many coins
* Added Code of Conduct
* Update to CI/CD process
* Merge pull request #2 from MickdeGraaf: PEP token


# v0.5.5
## Happy Maroon Ogre
## 04-04-2019

* Implement qrtz flat
* ETH balance formatting
* ETC Token  fix


# v0.5.4
## Fluffy Turqoise Griffin
## 03-04-2019

* Add option to add test data for asset

# v0.5.3
## Cosy Magenta Gremlin
## 03-04-2019

* Fix balance formatting
* added js-sha256 module
* Add support for importing keys
* Add support for Florincoin (FLO)
* Fix qrtz atom
* Fix Bitcoin sample in recipe
* Implement address validation
* ETH improvements
* NXT improvements
* Fixed standard fee handling for Electrum


# v0.5.2
## Little Lavender Goblin
## 03-04-2019

* Implement history
* Update to node.js 8.15.0
* XEM improvements
* Add support for Tron (TRX)
* Documentation update


# v0.5.1
## Furry Lime Unicorn
## 16-03-2019


# v0.5.0
## Happy Pink Leprechaun
## 08-03-2019
