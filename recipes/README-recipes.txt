A recipe file is a json file describing the properties of a source or asset implementation

A recipe defines either an asset/token or a source. For assets a symbol is
required, for sources an id.


symbol
(Only required for assets)
Discription: A string containing the symbol. This is used as the main idenitfier.
Format: "$MainSymbol[.$TokenSymbol]"
Examples: "BTC", "ETH.SHIFT"

id
(Only required for sources)
Discription:
Format: "$BlockExplorerId.$modus"
Examaples: "abe.bitcoin", "insight.litecoin"

name
Discription: A string containing the display name (for pretty printing).
Example: "Bitcoin"

mode (TO BE RENAMED!)
Discription: A string containing the deterministic mode.
Format: "$DeterministicModule.$modus"
Example: "bitjoinjslib.bitcoin"

modus
Discription: A string containing the internal asset identifier.
Example: "bitcoin","ethereum"


type
(Only required for sources)
Examples: "blockexplorer","storage","deterministic", "meta(to be removed)"


module                The name of the server/node side code implementation
module-deterministic  The name of the client side code implementation

factor
fee                   A number representing the fee associated with transfering assets

host                  A string or array of strings containing the hosts.
[user]
[pass]
[proxy]
[cache]               The ammount of time in miliseconds that data should be cached (Defaults to 12000)
[throttle]            Defaults to 5
[retry]               Defaults to 3
[timeout]             Defaults to 15000
[interval]            Defaults to 2000

quartz
