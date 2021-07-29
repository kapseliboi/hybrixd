# v0.9.24
## Furry Indigo Goblin
## 29-07-2021

* Verify eth transaction after push
* Improve error feedback for signature troubles
* web-wallet: reduce calls when viewing single asset





# v0.9.23
## Happy Indigo Ogre
## 22-07-2021

* Fixed Ripple private key import. Thanks AltcoinAdoption!
* Disallow erroneous negative fees in nownodes engine. Keep things positive!
* Enable sending of Ripple even if remote account is not activated. 
* Link node binaries in update script.
* Sort hybrix-jslib live examples in documentation
* qrtz: implement rout to other host
* web-wallet: implement universal login. Next level deterministic! 
* web-wallet: improve fee calculations for unified asset swaps
* web-wallet: fixed send asset modal not closing on error
* web-wallet: cache valuation rates
* web-wallet: allow send to deterministic offset address
* swap: Add supported ledgers endpoint
* swap: Update sufficiency calculations 
* swap: Improvements to pair rebalance methods
* hybrix-jslib: implement deterministic offset
* hybrix-jslib: update pending on refreshAsset





# v0.9.22
## Sparkling Green Hobgoblin
## 09-07-2021

* hybrix-jslib: implement universal login in session method.


# v0.9.21
## Chirpy Fuchsia Pegasus
## 29-06-2021

* Added grape token, Thanks George! Gotta catch em all!
* Implement socks connector. This enables hosting on TOR. Private and secure.
* Curl connectors are modular and initialization is asynchronous. Who you gonna call? 
* Improve cli-wallet documentation. Added (allocation) module syntax to help out aspiring allocators.
* Handle sub properties for configuration values. Tweak everything to your heart's desire
* swap: Pair liquidity overview page at /e/deal/swap
* swap: Dispute handler
* swap: Implement user defined risk per swap





# v0.9.20
## Merry Yellow Noodlefish
## 10-06-2021

* Improve conf defaults
* Update transport and evm dependencies
* Improve conf defaults
* qrtz: Warn for missing labels and fixes for missing labels
* hybrix-jslib: Improve unified transaction feedback and performance
* swap: only count volume of completed swaps
* swap: handle sufficiency at zero




# v0.9.19
## Jolly Fuchsia Unicorn
## 05-06-2021

* Update web-wallet




# v0.9.18
## Cheery Yellow Phoenix
## 05-06-2021

* Add Clever (CLVA) token. Thanks Hero!
* Catch faulty 0x0 eth gasprice
* Auto stop after 5 seconds
* Improve restart
* Upgrade ws
* Init recipe vars on error
* Purge lingering processes
* Handle missing amount in xrp transaction
* Catch unknown value in xrp transaction
* Init log folder on first startup
* qrtz: Fix void with object compare
* qrtz: parse math results to proper types where possible




# v0.9.17
## Fluffy Pink Minotaur
## 22-05-2021

* Added Radix, thanks h0ll0wstick!
* Check for Ripple (XRP) target activation balance at unspent. 
* Updates to default fee configurations.
* qrtz: Add incl method to check array values or strings include needles.
* swap: Enable request pairs of single account
* swap: Implement ledger exceptions (handle activation balance of Ripple)
* swap: Upgraded liquity availability handler, security lock and claim status



# v0.9.16
## Shiny Fuchsia Sphinx
## 13-05-2021

* Fix to boot script to accommodate to the  jungle of linux, unix, bsd and macOs shells.



# v0.9.15
## Bouncy Fuchsia Owlbear
## 07-05-2021

* Add GET and Glitch tokens Thanks JerBot and JeanBuild!!
* Add uni and sand tokens. Thanks Bill Brown!
* Unified addition: BNB.HY
* Remove TomoDEX as valuation source as it has not enough liquidity.
* Handle bnb zero balances.
* Add option to curl to ignore 404 and errors
* Adapt tomo to have a default fee-symbol
* All eth-api engine assets now check native balance on unspent
* Adjusted gas settings for Binance Smart Chain
* Update ETH-API engine to support alternative unspent routines
* Simplify push tx, transaction hash always means Ripple host will attempt tx broadcast
* Increase default XRP fee
* Fix datestamp in startup log





# v0.9.14
## Tiny Bouncy Sasquatch
## 29-04-2021

* Added BEPRO token. Thanks Mihn!
* Added SingularityNET (AGI) token. Thanks Rasoul!
* Implement graceful shutdown. Finish all tasks before stopping daemon.
* Show ascii art splash logo on startup. Make terminal pretty :)  
* Hide log stream unless output = true is defined. 
* Add Ganache (ethereum test) connectors.
* Swap deal engine: caching of pair list, extended fee calculation change
* Swap deal engine: Handle reserve unlocking and rebalancing.




# v0.9.13
## Sparkling Rainbow Caticorn
## 22-04-2021

* Added wise token. Thanks icobird!!
* Handle plain text responses in cli.
* Activated option to store by POST method.
* Improved handling of outliers in valuations engine
* Improve valuation symbol sanitation
* Extend logging for local var. Disable async writes until improvements have been made to handle SIGINT.
* Cache xrp sequence numbers locally.
* Upgraded bitcore engine to properly filter change addresses, also in returned amount.
* Refactor qrtz tests to method files.
* Swap deal engine: unlimited deferral time on push failure for accepted swap deals.
* Swap deal engine: cache derived addresses.
* qrtz: Add variableName option to void.
* hybrix-jslib: Added data option to rout method for POST requests.
* hybrix-jslib: Use POST for large save requests.
* hybrix-jslib: Improvement to unified transaction fee feedback.



# v0.9.12
## Giant Yellow Leprechaun
## 16-04-2021

* Add Polygon Network (formerly Matic) token. Thanks Thomas Maij!
* Handle Ripple minimum activation balance. As you can't leave less than 20 XRP on an account.
* Waves: increase fee amount to account for smart accounts
* Add enable conf toggle to all sources and engines
* Improvements to recipe editor




# v0.9.11
## Furry Fuchsia Goblin
## 09-04-2021

* Add mechanism to trim logs. Keep things nice and tidy.
* Provide transaction-details without target.  
* Shortcut valuations for zero. Zero is zero
* Fix missing waves amount in transactions. 
* Sort xrp history. Top to bottom
* hybrix-jslib: Define specific hosts per pending transaction type
* hybrix-jslib:  Reset hosts on logout




# v0.9.10
## Happy Fuchsia Ogre
## 06-04-2021

* Add notes to asset details. To provide specifics about assets. 
* Add Ripple (xrp) destination tag note.
* Improvements to Ripple (xrp) tokens .
* Fix unified /confirm and /confirmed endpoint.
* hybrix-jslib: Smart handling of address prefixes. 
* hybrix-jslib: Prevent passing expanded unified addresses for transaction review.
* hybrix-jslib: Fix handling errors in decoding of unified addresses.
* explorer: Error in confirmed broke entire transaction displaying. Bad UX.
* Swap deal engine: Fully verify account ids.
* Swap deal engine: Remove account.




# v0.9.9
## Sparkling Crystal Mermaid
## 25-03-2021

* Handle when a broken regex is provided: Regex is hard enough as it is.
* Improve caching: No need to retrieve everything all the time.



# v0.9.8
## Chirpy Mustard Pegasus
## 19-03-2021

* Manage your configuration through ui instead of code. Making things easier.  /c/conf
* Implement local vars for custom exec scripts. More powerful quartz scripting /c/exec
* Extend api queue and process debug. Find out what went wrong quicker. /p/debug
* Swap deal engine : Reserve deposit on swap. Lock and load!




# v0.9.7
## Merry Cyan Noodlefish
## 11-03-2021


* Add tcps support. TLS over TCP is now supported. Nice and secure.
* Refactor valuations for resilience. 
* Swap deal engine : Improvements to sufficiency calculations
* Catch non illegal mockchain contracts for testing
* HY asset icon had wrong SVG format, compared to the other icons
* Relocate Namecoin, until we get ElectrumX hosts from the community
* Fix fee calculation edge cases.
* Add event hook introspection using /c/events for debug purposes




# v0.9.6
## Jolly Yellow Unicorn
## 27-02-2021

* Improve valuation engine. Added more sources, sanitize symbols.
* Tweaks to recipe editor 
* Fix to tomo token history and unified history
* Swap deal engine: validate proposal target address
* Swap deal engine: pair volume reporting and more statistics
* Swap deal engine: added general estimate endpoint. 




# v0.9.5
## Curly Auburn Fairy
## 11-02-2021

* Implement modified fees for TOMO tokens. Tomo chains allows fees to be paid in tokens themselves. A very nice feature that we're glad to support.
* Fix bitcoin cash test address prefix parsing. Enable TEST_BCH (TBCH) bitcoin cash testnet. 
* Add feature overview to list asset details. This will enable filtering assets in based on supported assets.
* NPM Audit improvements and dependency updates. Made it easier to maintain the npm dependencies in the hybrix code.




# v0.9.3
## Shiny Sapphire Sphinx
## 05-02-2021

* Asset features endpoint. Use /asset/SYMBOL/features to see which features an asset supports.
* Fixed: eth token fees use fee-factor precision.




# v0.9.2
## Bouncy Cyan Elf
## 30-01-2021

* Fix transaction-details for unified assets. Determine what amount you can transfer from complex unified addresses.
* Update download links and release locations to download.hybrix.io. A one stop shop for all your hybrix downloads.
* hybrix-jslib: Add encryption by default option to rout and addHost methods.
* hybrix-jslib: Add specialized hosts. These will only be used when specified.




# v0.9.1
## Fluffy White Gremlin
## 12-01-2021

* Enable inter module communication by safely exposing specific methods.
* Improve custom configuration: (partial) recipes in var/recipes/delta overwrite the base recipes
* Fix bug that prevented hybrixd cli command to connect to other hosts
* Allow higher NodeJS versions.
* qrtz: added hook without parameters to clear/reset hook
* hybrix-jslib: Track pending swap deals
* hybrix-jslib: Improve unified asset balance refresh






# v0.9.0
## Cosy Cyan Kobold
## 08-01-2021

* Modules for cross-ledger value swapping and allocation. 
* Automatic Ethereum nonce caching. Submit multiple transactions even when network is slow.
* Add nowNodes API connector.
* Add artificial delays to mockchain confirms for testing purposes.
* Conf overview. Check your node configuration at /c/conf.
* Improve module error feedback. Full stack trace to help with the bug hunting.
* Decode Ethereum transactions. 
* Add valuations for mockchain test coins.
* Limit logging of long routing request to prevent log clogging.
* hybrix-jslib: upgraded to webpack 5.
* hybrix-jslib: track pending transactions. Keep an overview of your pending transactions.
* hybrix-jslib: update session checks before methods.
* qrtz: bank method : secure handeling and delegated handling of transactions.
* qrtz: multi with : do more with less code.
* qrtz: you can now use tran to transform object values or keys.
* qrtz: form and atom by symbol. Easier to make prettier numbers.
* qrtz: multi step math. Handle complex math in multiple steps.
* qrtz: root method. Run code based on whether user has root access.




# v0.8.9
## Cosy Violet Sprite
## 26-11-2020

* Do not use btc unconfirmed balances as they provided wrong results. Thanks to mehrdd!
* qrtz: code browser. Browse to process/code on your local node and view and debug the qrtz 'api as code' methods.
* Add option to delay scheduled jobs for all you procrastinators
* Updated hy icon. New, nice and spiffy!
* Add cli quick test endpoint for assets /asset/SYMBOL/test-cli. 
* hybrix-jslib: add more hashing and encryption options.
* hybrix-jslib: add getBalance method and implement throttle for refreshAsset.
* hybrix-jslib: add file storage connector. Synchronize local and storages for nodejs projects.




# v0.8.8
## Little Violet Leprechaun
## 17-11-2020

* Add spends  to transaction. See all different target addresses in a multi spend transaction in /a/SYMBOL/transaction.
* Get the spend for a specific target with /a/SYMBOL/transaction/TARGET.
* Prevent duplicate default steps which could make processes slow. Made them mean and lean again.
* Remove broken zcash (ZEC) host
* explorer: Add value conversion method to search bar. 



# v0.8.7
## Furry Violet Goblin
## 11-11-2020

* Loading data from storage would fail if meta data was corrupt. Bad, made this more resilient.



# v0.8.6
## Happy Violet Ogre
## 06-11-2020

* Update bitcore engine
* Add bitcoin and bitcoincash testnet connectors. Test all the things!
* Improve valuation samples and api help copy




# v0.8.5
## Sparkling Turqoise Mermaid
## 27-10-2020

* Implement btc using bitcore engine. New and improved!
* handle prefixless unified asset validation.  #unify!
* Improve storage tests. Failing ain't bad, as long as you know what to do better.
* qrtz: skip empty lines instead of crashing, which is nice.




# v0.8.4
## Fluffy Magenta Pegasus
## 25-09-2020

* Use cached as fallback for history and improve hook
* Pass timeout to all child and parent processes
* transport: ignore bad requests
* transport: remove any characters that are not properly routable
* Tomoscan history and throttle fix
* Add confirmed threshold for xem
* Fix eth history throttle issues
* Let debug wait for process to finish
* Fix list failure and on empty
* Confirmed endpoint for unified asset
* Improve debug
* Add update mechanism
* Add history to unified assets
* Add extend documentation
* qrtz: Make jpar failure non silent
* qrzt: remove sort from uniq
* qrzt: fail each if any fails
* web-wallet: add unified asset ui extensions



# v0.8.3
## Cosy Magenta Unicorn
## 17-09-2020

* hybrixd.conf is now optional
* Add confirmed to details endpoint
* Deprecation of XHY tokens in favor of HY token
* web-wallet: Removed JQuery dependencies
* web-wallet: Improve QR address scanning



# v0.8.2
## Little Green Fairy
## 14-09-2020

* web-wallet: fix local storage bug




# v0.8.1
## Furry Magenta Sphinx
## 12-09-2020

* web-wallet : unified assets




# v0.8.0
## Happy Magenta Elf
## 11-09-2020

* Ripple: use x addresses and dash seperated tags
* Update unified assets
* Automatically import base asset recipes for tokens
* Fix duplicate PIDs
* Add messages for eth and tomo tokens
* qrtz : add option parameters for unpk
* web-wallet: improve login speed
* web-wallet: notify errors during login
* web-wallet: improve logout speed




# v0.7.33
## Little Turquoise Griffin
## 03-09-2020

* Implement transaction-details endpoint
* Add list endpoint for storage
* Improve sample and transaction for unified assets
* Update documentation




# v0.7.32
## Furry Purple Elf
## 02-09-2020

* Patch to ship




# v0.7.31
## Happy Purple Gremlin
## 01-09-2020

* Added syscoin token, thanks LucidLunacy!
* Added support for tomo
* Added support for Folgory exchange
* Remove standalone sync command
* Update to /confirmed and /confirm endpoints
* Added /block endpoint
* Added history tests
* Added storage tests
* qrtz: Add help and import to qrtz cli
* qrtz: type flow
* qrtz: improve find for string
* qrzt: Handle empty string not as number
* qrtz: ship with variable name





# v0.7.30
## Curly Green Leprechaun
## 20-08-2020

* Added fee-balance endpoint to determine available fee balance
* Use stack trace in logs and return to root callers
* Added a work in progress mock exchange (sandbox) module
* Updated dependencies
* hybrix-jslib: Add option for partial source address
* hybrix-jslib: Updated dependencies
* qrtz: improve math error handling
* qrtz: improve sort for arrays of arrays
* qrtz: test by variable or multiple variables
* qrtz: dollar and peek property parse methods
* qrtz: fix flip for string (remove commas)
* qrtz: fail rout if no onFail is defined




# v0.7.29
## Shiny Pink Ogre
## 13-08-2020

* Do not expose processIds for other sessions
* Add stop command to daemon control
* Improve error message on port already in use.
* Catch connection reset error in hcmd
* Improvements to host reports
* Remove faulty xem host
* Improve subbalances
* Upgrade session using token
* add login using token to report pages
* return html 403/404 error pages for html endpoints
* qrtz: add fork and rout for javascript modules
* hybrix-jslib: refreshAsset now automatically adds the asset if required
* web-wallet: do not wait for balances during load
* web-wallet: view sub balances for multi assets


# v0.7.28
## Bouncy Pink Unicorn
## 30-07-2020

* Improve local var loading
* Improve parsing error messages.
* qrtz: shuffle elements left or right
* qrtz: desc sort for properties





# v0.7.27
## Merry Pink Pixie
## 29-07-2020

* Handle numeric fee in transaction
* Hide web-wallet ychan clutter in log
* Restore default port values
* fix web-wallet/api alias to help page
* qrtz: add shell to release version
* hybrix-jslib: ensure proper urls (no double slashes)
* hybrix-jslib: improve session restore
* web-wallet: catch malfunctioning local storage
* web-wallet: handle multi addresses in transaction history
* web-wallet: use encrypted y channel communication (to ensure encryption even on http connections)



# v0.7.26
## Cosy Pink Griffin
## 17-07-2020

* Update hystat to get current HY data
* Prevent node crash on faulty proc commands
* Hide internal routing calls in logs
* Improve fee computation.
* Disable idex and waves exhanges engines
* add non debug requests for ui, remove console log
* Fix error response for non standalone api endpoints
* Add biki exchange connector
* Prettify multi fees in transactions
* Debug ui rendering of undefineds
* Fix xem and ubq tokens
* Add asset host test endpoints
* Depreciate exp (no stable hosts)
* Update testdata
* qrtz: add drop for objects
* qrtz: improve find
* qrtz: Allow import and command parameters for exec
* qrtz: pick and code
* qrtz: use fallback for proc.peek for javascript modules
* qrtz: Fallback to undefined for undefined named parameters
* qrtz: precompile named vars
* qrtz: fix jumplabels for filt
* qrtz: Add PATCH method to curl
* qrtz : extend join to merge array of objects
* qrtz: add meta data for each
* qrtz: add more hash methods
* web-wallet: fix send to contact from address book
* web-wallet: fix transaction history mixing up ingoing and outgoing transactions





# v0.7.25
## Little Blue Mermaid
## 25-06-2020

* New ETH token: Tokentuber
* Added Biki trade engine
* Fix unspents for uninitialized burst addresses
* Fixes for NXT tokens
* Autofocus for debug ui
* Fix searching beyond cached history
* docs: fix folding items.
* Update several hosts (DGB,ETC)
* Fix Rise and Shift
* Update test data for assets
* qrtz: Remove eval from scan, add NaN check and consts, fix BCH unspents
* qrtz: add zip functionality to tran




# v0.7.24
## Furry Purple Owlbear
## 18-06-2020

* Update ark to newest sdk
* Added new bitcore engine for bitcoin cash
* Fixes for insight and florin coin history
* qrtz: fix parsing of certain number went wrong
* updated styling and added links to docs in debug ui
* Fixes for omni history
* Fixed problems with serving binary (image) files




# v0.7.23
## Happy Pink Leprechaun
## 11-06-2020

* Added 'check for update' endpoint. Use /e/update/check to see if you're running the latest version
* Improve configuration handling of hybrixd.conf.
* Add y and z channel tests. These channels can be used as (extra) encryption layer. For example when http instead of https is used.
* Return errors if session creation fails.
* SEO/metadata improvements for html endpoints
* hybrix-jslib : Reconnect session if lost
* hybrix-jslib : Improve import/export of deterministic code
* web-wallet: add headless browser tests
* web-wallet: add missing font



# v0.7.22
## Curly Maroon Ogre
## 04-06-2020

* Remove duplicate transaction caching in electrum engine
* Verbose logging on host error
* Deployment improvements
* Update etc host
* Enable multi fee mockchain




# v0.7.21
## Happy Violet Sphinx
## 02-06-2020


* Fix qrtz sort for empty arrays
* ethereum throttle adjustments




# v0.7.20
## Fluffy Orange Gnome
## 28-05-2020

* Handle undefined values in debug ui
* Update download links
* Display eth fee's with correct factor in transaction history
* hybrix-jslib: update asset test overview
* hybrix-jslib: on refresh use current balance value as fallback




# v0.7.19
## Cosy Turqoise Ogre
## 26-05-2020

* Add HY to valuations engine.
* Add endpoints for HY supply, volume and price.
* Add logs to init functions.
* Fix mockchain test mining.
* Web-wallet: improve address validation.
* Web-wallet: continuously update balance in single asset view.



# v0.7.18
## Little Blue Fairy
## 22-05-2020

* Web-wallet : Show message if there's insufficient base balance for fee.




# v0.7.17
## Furry Turqoise Sphinx
## 20-05-2020

* Web-wallet: option to export your private keys from within the wallet.
* Web-wallet: improve loading speed by postponing balance calls till after loading.
* Web-wallet: fix logging in after a logout.
* Web-wallet: more verbose message on successfull push transaction
* Web-wallet: display transaction and browser details in error message. Makes supporting based on screenshots easier.
* Web-wallet: display transaction id after push
* Web-wallet: fixed undefined address bug
* hybrix-jslib : add fallback value for rout calls
* hybrix-jslib : prevent failure for single asset refreshAsset calls
* qrtz : fix sort function for arrays of objects




# v0.7.16
## Happy Turqoise Kobold
## 19-05-2020

* Web-wallet: ensure version display on all browsers
* Web-wallet: fix computation of fee total
* Handle api asset report failure




# v0.7.15
## Fluffy Teal Ogre
## 18-05-2020

* Update eth fee calculation




# v0.7.14
## Cosy Rose Phoenix
## 14-05-2020

* Fixed hcmd stopped listening when progress reported 100%, not waiting for actual process completion.
* Recipe editor: fix parsing
* Reinstate ychan communication (hybrix-jslib and web-wallet upgrades underway)





# v0.7.13
## Curly Blue Pegasus
## 07-05-2020


* Upgrade bitcoin-jslib to 5.7.1
* qrtz: Catch errors in javascript modules
* Documentation: SEO improvements
* web-wallet: mention wallet and hybrixd versions before login (Thanks George!)
* web-wallet: /version endpoint


# v0.7.12
## Bouncy Yellow Gremlin
## 30-04-2020
* Fix login example in hybrix-jslib documentation
* Add missing glob dependency
* web-wallet : implement multi asset fees
* hybrix-jslib : finalize multi asset fees
* explorer: SEO improvements



# v0.7.11
## Happy Teal Ogre
## 23-04-2020

* Add Ethereum test net connectors
* Update to euro stablecoins





# v0.7.10
## Fluffy Green Kraken
## 16-04-2020

* Catch tcp errors during closing
* Implement cli calls to external http(s) hosts
* Improve error handling in valuation engine
* Added new Litecoin hosts
* Upgrade documentation menus
* web-wallet: Improve client side caching



# v0.7.9
## Beautiful Lavender Sphinx
## 09-04-2020

* Schedule session/api reports generation for public endpoints.
* Ensure transports does not retain event listeners and processes after shutdown
* Add bigint support to byte command
* Handle none json responses in hcmd
* web-explorer: added multi fee support
* hybrix-jslib: added multi fee support



# v0.7.8
## Tiny Sienna Kobold
## 02-04-2020

* Improved history and transaction caching engine
* Separate confirmed from transaction
* Transports: cron decreased to for faster data propagation (tested)
* Transports: more lenient timeout to account for noisy DHT to prevent incorrect offline messages
* Expose version through version endpoint
* Expose rout tree through meta endpoint




# v0.7.7
## Cuddly Blueish Ogre
## 31-03-2020

* Reports for node operators sessions, api call and log statistics via /report endpoint (public reports will follow)
* Enable staggered cronjobs for reporting
* Include error output in test reports
* Extend logging improvements to storage module
* Improve storage sync module integration
* Improve error response for assets
* Reduce eth token fee updates per token to single approach
* web-wallet : Extend headless browser tests
* web-wallet : Fix bug with address book
* web-wallet : Extend error and validation feedback
* hybrix-jslib : Added option to parallel processes to return error instead of result upon failure


# v0.7.6
## Shiny Orange Dragon
## 19-03-2020

* Added functionality to search hybrixd logs
* Improvements REST engine
* Implemented report endpoints for logging
* Hidden process ids for non root users
* Fixes for ZEC empty unspents
* qrtz math handle empty summation
* Fixed qrtz shell could crash node (root only)
* Upgrade to NEM address parsing
* Removed malfunctioning valuations




# v0.7.5
## Fluffy Yellow Sphinx
## 12-03-2020

* Added isct method to qrtz
* Updated address validation to include newer BTC addresses
* Improve error responses for insight
* Update flo/insight engine (Thanks to Bitspill)
* Improve error responses for ethereum api
* web-wallet : improve error responses
* web-wallet : add option to bypass address validation



# v0.7.4
## Cosy Purple Kobold
## 05-03-2020

* Retrieve eth token details using hybrixd internal evm module
* Ensure push returns a string transaction id for flo/insight
* Improve storage syncing
* Fix qrtz each for arrays
* qrtz logs and warn to use data stream if no parameters were provided
* Prepare separate endpoint and caching for confirmations
* Improve logging with timestamps and categories





# v0.7.3
## Little Purple Ogre
## 27-02-2020

* Update xel hosts
* Add operator, dev and npm specific readme's




# v0.7.2
## Furry Purple Phoenix
## 20-02-2020

* now utilizing own ETH nodes
* Fix to synchronization failure.
* Added wallet faq to documentation
* Fix for failing ethereum token balance
* Expand report endpoint documentation
* Implement address validation for ardor and ignis
* Fix for lisk balance calls



# v0.7.1
## Happy Purple Sphinx
## 13-02-2020

* Fix ardor transacton date is incorrect
* web-wallet: fix favorite assets settings
* web-wallet: add extra notifications on errors
* web-wallet: fix insufficient fee messages



# v0.7.0
## Fluffy Pink Kobold
## 12-02-2020

* Rebuild qrtz scheduler engine for performance
* Copy to clipboard error in api documentation
* Update fix for eth huge hexadecimals
* Improve testing for pow and qrtz
* Rebuild rest call for stability



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
