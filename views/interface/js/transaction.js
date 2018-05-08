sendTransaction = function (properties) {
  var H = hybridd;
  var assetID = R.path(['asset', 'symbol'], properties);
  var base = R.path(['asset', 'fee-symbol'], properties);
  var transactionData = {
    asset_: R.prop('asset', properties),
    fee: R.path(['asset', 'fee'], properties),
    amount: Number(R.prop('amount', properties)),
    source_address: String(R.prop('source', properties)).trim(),
    target_address: String(R.prop('target', properties)).trim()
  };

  var publicKey = R.path(['asset', 'keys', 'publicKey'], properties);
  var assetHasValidPublicKey = typeof publicKey === 'undefined';
  var emptyOrPublicKeyString = assetHasValidPublicKey ? '' : '/' + publicKey;

  var factor = R.path(['asset_', 'factor'], transactionData);
  var totalAmount = fromInt(
    toInt(R.prop('amount', transactionData), factor)
      .plus(toInt(R.prop('fee', transactionData), factor), factor)
  ).toString();
  // prepare universal unspent query containing: source address / target address / amount / public key
  var unspentUrl = 'a/' +
      assetID +
      '/unspent/' +
      transactionData.source_address +
      '/' +
      totalAmount +
      '/' +
      R.prop('target_address', transactionData) +
      emptyOrPublicKeyString;

  var transactionDataStream = Rx.Observable.of(transactionData);
  var unspentStream = H.mkHybriddCallStream(unspentUrl); // Filter for errors
  var modeStr = assets.modehashes[ assets.mode[assetID].split('.')[0] ] + '-LOCAL';
  var modeFromStorageStream = storage.Get_(modeStr);

  var doTransactionStream = Rx.Observable
      .combineLatest(
        unspentStream,
        modeFromStorageStream,
        transactionDataStream
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
  console.log("data = ", data);
}

function onError (err) {
  UItransform.txStop();
  alert(err);
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
  var deterministic_ = R.nth(3, z);
  var factor = R.path(['asset_', 'factor'], transactionData);

  var checkTransaction = deterministic_.transaction({
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
  });

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
  return H.mkHybriddCallStream(url);
}

function handleTransactionPushResult (res) {
  if (R.equals(typeof R.prop('data', res), 'undefined') &&
      R.not(R.equals(typeof R.prop('error', res), 0))) {
    return 'SUCCESS!';
  } else {
    throw 'The transaction could not be sent by the hybridd node! Please try again.';
  }
}
