sendTransaction = function (properties, onSucces, onError) {
  var H = hybridd; // TODO: Factor up

  var asset = R.prop('asset', properties);
  var assetID = R.prop('symbol', asset);
  var factor = R.prop('factor', asset);

  var transactionData = mkTransactionData(properties);
  var totalAmountStr = mkTotalAmountStr(transactionData, factor);
  var emptyOrPublicKeyString = mkEmptyOrPublicKeyString(asset);
  var unspentUrl = mkUnspentUrl(assetID, totalAmountStr, emptyOrPublicKeyString, transactionData);

  var assetMode = R.path(['asset', 'mode'], properties).split('.')[0];
  var modeStr = R.path(['modehashes', assetMode], assets) + '-LOCAL'; // Factor assets up

  var modeFromStorageStream = storage.Get_(modeStr);
  var transactionDataStream = Rx.Observable.of(transactionData);
  var feeBaseStream = Rx.Observable.of(asset).map(checkBaseFeeBalance);
  var unspentStream = H.mkHybriddCallStream(unspentUrl)
      .map(checkProcessProgress)
      .retryWhen(function (errors) { return errors.delay(500); });

  var doTransactionStream = Rx.Observable
      .combineLatest(
        unspentStream,
        modeFromStorageStream,
        transactionDataStream,
        feeBaseStream
      )
      .map(getDeterministicData)
      .map(getDeterministicTransactionData)
      .flatMap(doPushTransactionStream)
      .map(handleTransactionPushResult);

  UItransform.txStart();
  doTransactionStream.subscribe(onSucces, onError);
};

function getDeterministicData (z) {
  var decodedData = R.nth(1, z);
  var deterministicData = R.compose(
    activate,
    LZString.decompressFromEncodedURIComponent
  )(decodedData);

  if (typeof deterministicData !== 'object' || deterministicData === {}) {
    throw 'Sorry, the transaction could not be generated! Deterministic code could not be initialized!';
  } else {
    return R.append(deterministicData, z);
  }
}

function getDeterministicTransactionData (z) {
  var unspent = R.prop('data', R.nth(0, z));
  var transactionData = R.nth(2, z);
  var deterministic_ = R.nth(4, z);
  var factor = R.path(['asset_', 'factor'], transactionData);
  var data = {
    mode: R.path(['asset_', 'mode'], transactionData).split('.')[1],
    symbol: R.path(['asset_', 'symbol'], transactionData),
    source: R.prop('source_address', transactionData),
    target: R.prop('target_address', transactionData),
    amount: toInt(R.prop('amount', transactionData), factor),
    fee: toInt(R.prop('fee', transactionData), factor),
    factor: factor,
    contract: R.path(['asset_', 'contract'], transactionData),
    keys: R.path(['asset_', 'keys'], transactionData),
    seed: R.path(['asset_', 'seed'], transactionData),
    unspent
  };

  var checkTransaction = deterministic_.transaction(data);

  if (R.isNil(checkTransaction)) {
    throw 'Sorry, the transaction could not be generated! Check if you have entered the right address.';
  } else {
    return [checkTransaction, R.path(['asset_', 'symbol'], transactionData)];
  }
}

function doPushTransactionStream (z) {
  var transaction = R.nth(0, z);
  var assetID = R.nth(1, z);
  var url = 'a/' + assetID + '/push/' + transaction;
  return H.mkHybriddCallStream(url)
    .map(function (processData) {
      var isProcessInProgress = R.isNil(R.prop('data', processData)) &&
          R.equals(R.prop('error', processData), 0);
      if (isProcessInProgress) throw processData;
      return processData;
    })
    .retryWhen(function (errors) { return errors.delay(500); });
}

function handleTransactionPushResult (res) {
  var transactionHasError = R.equals(R.prop('error', res), 1);
  var transactionIsValid = R.not(R.equals(typeof R.prop('data', res), 'undefined')) &&
      R.equals(R.prop('error', res), 0);
  if (transactionIsValid) {
    return 'Node sent transaction ID: ' + R.prop('data', res);
  } else if (transactionHasError) {
    throw R.prop('data', res);
  } else {
    throw 'The transaction could not be sent by the hybridd node! Please try again.';
  }
}

function checkBaseFeeBalance (asset) {
  var assetID = R.prop('id', asset);
  var feeBase = R.prop('fee-symbol', asset);
  var fee = R.prop('fee', asset);
  var baseBalance = R.compose(
    R.defaultTo(0),
    R.path(['balance', 'amount']),
    R.find(R.propEq('id', feeBase))
  )(GL.assets);

  if (baseBalance > fee) {
    return true;
  } else {
    throw '<br><br>You do not have enough ' + R.toUpper(feeBase) + ' in your wallet to be able to send ' + R.toUpper(assetID) + ' tokens! Please make sure you have activated ' + R.toUpper(feeBase) + ' in the wallet.<br><br>';
  }
}

function mkTransactionData (p) {
  var asset = R.prop('asset', p);
  return {
    asset_: asset,
    fee: Number(R.prop('fee', asset)),
    amount: Number(R.prop('amount', p)),
    source_address: String(R.prop('source', p)).trim(),
    target_address: String(R.prop('target', p)).trim()
  };
}

function mkEmptyOrPublicKeyString (asset) {
  return R.compose(
    R.when(
      function (key) { return R.not(R.equals('', key)); },
      R.concat('/')
    ),
    R.defaultTo(''),
    R.path(['keys', 'publicKey'])
  )(asset);
}

function mkTotalAmountStr (t, factor) {
  var amountBigNumber = toInt(R.prop('amount', t), factor);
  var feeBigNumber = toInt(R.prop('fee', t), factor);
  var amountWithFeeBigNumber = amountBigNumber.plus(feeBigNumber, factor);

  return fromInt(amountWithFeeBigNumber, factor).toString();
}

// prepare universal unspent query containing: source address / target address / amount / public key
function mkUnspentUrl (id, amount, publicKey, t) {
  return 'a/' +
    id +
    '/unspent/' +
    R.prop('source_address', t) + '/' +
    amount + '/' +
    R.prop('target_address', t) +
    publicKey;
}

function checkProcessProgress (processData) {
  var isProcessInProgress = R.isNil(R.prop('data', processData)) &&
                            R.equals(R.prop('error', processData), 0);
  if (isProcessInProgress) throw processData;
  return processData;
}
