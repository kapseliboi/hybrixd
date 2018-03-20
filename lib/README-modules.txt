Command list

command= asset|source/$ASSET/$COMMAND/$1/$2/...
$COMMAND = $0 = init|status|factor|fee|balance|transfer|test|history|unspent|contract

init
Syntax: a/$ASSET/init
Description: initialize the module. Setup REST client, confirm host is responding, unpack module-deterministic lmza
Input: none
Output: none
Result: log message whether initialization has succeeded or failed

status
Syntax: a/$ASSET/status
Description: check the status. Note: not used yet, needs standardization
Input: none (expected to be purely state)
Output: ?? Version, Up/Down/Error message/latency?

factor
Syntax: a/$ASSET/factor
Description: get the multiplication factor 10^n  (perhaps power or base would be more aptly named)
Input: none (expected to be constant)
Output: Number

fee
Syntax: a/$ASSET/fee
Description: transactie fee (for etheruem this is more complicated (“gas”) dus worst case guestimate) , later this should be updated with tick
Input: ???? TODO  (not constant, unclear which parameters could be used.)
Output: Number

balance
Syntax: a/$ASSET/balance/$SOURCE_ADDRESS
Description: account balance
Input: Address  (sourceaddress)
Output: Number (formatted using factor)

contract
Syntax a/$ASSET/contract/$SOURCE_ADDRESS
Description: Retrieve contract data
Input: Address  (sourceaddress)
Output: Contract data

push             iets pushen naar blockchain (meestal signed transaction) doorsturen (bij ethereum contracts)
Syntax: a/$ASSET/push/$TRANSACTION_STRING
Input:

transactionObject = {
  mode:assets.mode[p.asset].split('.')[1],
  source:p.source_address,
  target:p.target_address,
  amount:toInt(p.amount,assets.fact[p.asset]),
  fee:toInt(p.fee,assets.fact[p.base]),
  factor:assets.fact[p.asset],
  contract:assets.cntr[p.asset],
  keys:assets.keys[p.asset],
  seed:assets.seed[p.asset],
  unspent:unspent
}

Transformation: Modules deterministic is used to transform the transaction object into a string  (deterministic.transaction(transactionObject))

Output: Succes/Failure?

address
?? counterpart module


transfer
?? legacy?

test
?? debug?

unspent        “prepare” pre-transacties acties/informatie ophalen.Transactie voorbereiden. (Legacy van Bitcoin, maar ook bruikbaar voor anderen  )
Syntax: a/$ASSET/unspent/$SOURCE_ADDRESS/$TARGET_ADDRESS/$AMOUNT/$PUBLIC_KEY
Output:
For Blockexplorer (Bitcoin-like)
{
 unspents:[{txid:, txn:,script: $SCRIPT}],
 change:$CHANGE
}
with $SCRIPT the scriptPubKey  and $CHANGE een float.

For Ethereum:
{
 nonce:$NONCE
}
with $NONCE a number




history
?? TODO get transaction history

transferlist,confirm [Only for Meta Module]
??

get,set,pow,del,meta [Only for Storage Module]
