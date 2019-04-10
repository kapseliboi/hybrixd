** Introduction **

If the asset is a token based on an existing base asset only a simplified Node side
module needs to be defined. (Without qrtz / API endpoints definition
as those will already be defined in the base asset recipe.)

To add a new crypto currency as asset you will need a Client side
module for deterministic cryptography and a Node side module to handle information requests.

The Client side module will handle key generation and transaction
signing on the client side and is explained in the deterministic repository's
README.md .

The Node side module creates API endpoints in hybrixd that enables users and wallets to interact with
other blockchains by translating and relaying calls
to API endpoints from RPC's and block explorers for the given crypto
currency. Please see below for instructions.

The following files are associated with the modules:

- `modules/deterministic/$ASSET/deterministic.js.lmza` : The compiled
Client side module.
- `recipes/asset.$ASSET.json` : The definition of the asset details
  and Node side module.



** Node side module **

The node side module serves as a relay between APIs.

Example:

When you query hybrixd for the balance of your waves address:
`/asset/waves/$YOUR_ADDRESS` this will be routed to the Node side
module defined in `recipes/asset.waves.json`. The logic there (written
in Qrtz) will reformat the request to
`https://nodes.wavesplatform.com/addresses/balance/details/$YOUR_ADDRESS`
it will retrieve the result, reformat that and return it.

```
[user] -> [hybrixd] -> [node side module] -> [external api]
       query       route      qrtz       curl   |
                                                |
[user] <- [hybrixd] <- [node side module]     <-
    response      qrtz                     response
```

** Grocery List **

You will need the following information:

- Asset Details
- - Symbol : The symbol associated with the asset (Bitcoin has btc much like the US dollar has usd)
- - Factor : The factor determines the nr of digits after the dot. (The precision of the currency)
- - Fee : The transaction fee that is required as overhead payment for a transaction.
- - Fee-Symbol : The symbol that is used to pay fees. This is usually the same value as Symbol name.
- - Fee-Factor : The factor of the fee. This is usually the same value as Factor.

- API endpoints
- - Hosts : The url's of API endpoints. Searching for '$ASSETNAME
  block explorer api' , '$ASSETNAME rpc'. The goal is to find API's
  where we can send requests for balances etc.
- - Endpoints You will need api endpoints for the following. For example `https://nodes.wavesplatform.com`
- - - balance : The balance a given address. For example `/addresses/balance/$YOUR_ADDRESS`
- - - unspents : The unspents (pre-transactional data) for a given address.
- - - push : To submit a signed transaction to the blockchain.
- - - message/attachement : Retrieve the message, attachement or 'op_return'
  attached to an transaction.
- - - transaction : To retrieve details about a transaction
- - - history : To retrieve history for a given address.

Browse to `/api/help` and view `asset for more details on the API endpoints.

** Quartz **

The Node side module is defined using a json recipe containing the
asset properties and the logic implemented in Quartz.

Browse to `/api/help/qrtz` for more help on qrtz.

** Recipe **

See `recipes/README-recipes.md` for help on creating a recipe.
