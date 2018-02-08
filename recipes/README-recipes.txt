A recipe file is a json file describing the properties of a source or asset implementation

A recipe defines either an asset/token or a source. For assets a symbol is
required, for sources an id.

symbol                For assets
id                    For sources

name                  A string containing the display name
mode

module                The name of the server/node side code implementation
module-deterministic  The name of the client side code implementation

factor
fee                   A number representing the fee associated with transfering assets

host                  A string of array of strings containing the hosts.
[user]
[pass]
[proxy]
[cache]               The ammount of time in miliseconds that data should be cached (Defaults to 12000)
[throttle]            Defaults to 5
[retry]               Defaults to 3
[timeout]             Defaults to 15000
[interval]            Defaults to 2000

quartz
