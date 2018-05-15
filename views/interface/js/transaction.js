sendTransaction = function (properties) {
  var H = hybridd;
  var asset = R.prop('asset', properties);
  var assetID = R.path(['asset', 'symbol'], properties);
  var transactionData = {
    asset_: asset,
    fee: Number(R.path(['asset', 'fee'], properties)),
    amount: Number(R.prop('amount', properties)),
    source_address: String(R.prop('source', properties)).trim(),
    target_address: String(R.prop('target', properties)).trim()
  };

  var publicKey = R.path(['asset', 'keys', 'publicKey'], properties);
  var assetHasValidPublicKey = typeof publicKey === 'undefined';
  var emptyOrPublicKeyString = assetHasValidPublicKey ? '' : '/' + publicKey;

  var factor = R.path(['asset', 'factor'], properties);
  var totalAmount = fromInt(
    toInt(R.prop('amount', transactionData), factor)
      .plus(toInt(R.prop('fee', transactionData), factor), factor)
    , factor).toString();
  // prepare universal unspent query containing: source address / target address / amount / public key
  var unspentUrl = 'a/' +
      assetID +
      '/unspent/' +
      R.prop('source_address', transactionData) +
      '/' +
      totalAmount +
      '/' +
      R.prop('target_address', transactionData) +
      emptyOrPublicKeyString;

  var assetMode = R.path(['asset', 'mode'], properties).split('.')[0];
  var modeStr = assets.modehashes[assetMode] + '-LOCAL';
  var modeFromStorageStream = storage.Get_(modeStr);
  var transactionDataStream = Rx.Observable.of(transactionData);
  var feeBaseStream = Rx.Observable.of(asset).map(checkBaseFeeBalance);
  var unspentStream = H.mkHybriddCallStream(unspentUrl) // Filter for errors
      .map(function (processData) {
        if (R.isNil(R.prop('data', processData)) && R.equals(R.prop('error', processData), 0)) throw processData;
        return processData;
      })
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

function onSucces (data) {
  UItransform.txStop();
  UItransform.txHideModal();
  console.log(data);
}

function onError (err) {
  UItransform.txStop();
  alert('Error: ' + err);
  console.log("err = ", err);
}

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
      if (R.isNil(R.prop('data', processData)) && R.equals(R.prop('error', processData), 0)) throw processData;
      return processData;
    })
    .retryWhen(function (errors) { return errors.delay(500); });
}

function handleTransactionPushResult (res) {
  if (R.not(R.equals(typeof R.prop('data', res), 'undefined')) &&
      R.equals(R.prop('error', res), 0)) {
    return 'Node sent transaction ID: ' + R.prop('data', res);
  } else if (R.equals(R.prop('error', res), 1)) {
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
