var TxValidations = transactionValidations;

sendAsset = {
  // RENDERS THE RELEVANT INFORMATION IN THE TX MODAL
  renderAssetDetailsInModal: function (assetID) {
    var asset = R.find(R.propEq('id', assetID))(GL.assets);
    var balance = R.path(['balance', 'amount'], asset);
    var address = R.prop('address', asset);
    var fee = R.prop('fee', asset);
    if (R.not(R.isNil(balance)) && balance !== 'n/a') {
      var spendable = !isToken(assetID) ? toInt(balance).minus(toInt(fee)) : toInt(balance); // Make into function!
      if (spendable < 0) { spendable = 0; }
      var fixedSpendable = spendable.toFixed(21).replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1');
      document.querySelector('#action-send .modal-send-currency').innerHTML = assetID.toUpperCase();
      document.querySelector('#action-send .modal-send-currency').setAttribute('asset', assetID);
      document.querySelector('#action-send .modal-send-balance').innerHTML = fixedSpendable;
      document.querySelector('#modal-send-target').value = '';
      document.querySelector('#modal-send-amount').value = '';
      document.querySelector('#action-send .modal-send-addressfrom').innerHTML = address;
      document.querySelector('#action-send .modal-send-networkfee').innerHTML = formatFloat(fee) + ' ' + R.prop('fee-symbol', asset).toUpperCase();

      TxValidations.toggleSendButtonClass();
    }
  }
};

var txAmountStream = Rx.Observable
    .fromEvent(document.querySelector('#modal-send-amount'), 'input')
    .map(U.getTargetValue);

var txTargetAddressStream = Rx.Observable
    .fromEvent(document.querySelector('#modal-send-target'), 'input')
    .map(U.getTargetValue);
// .map(validateAddress) // ENTER ADDRESS VALIDATIONS

var validatedTxDetailsStream = Rx.Observable
    .combineLatest(
      txAmountStream,
      txTargetAddressStream
    );

var sendTxButtonStream = Rx.Observable.fromEvent(document.querySelector('#send-transfer'), 'click')
    .filter(U.btnIsNotDisabled);

var transactionDataStream = Rx.Observable
    .combineLatest(
      txAmountStream,
      txTargetAddressStream,
      sendTxButtonStream
    );

function sendTransfer (z) {
  var symbol = document.querySelector('#action-send .modal-send-currency').getAttribute('asset');
  var asset = R.find(R.propEq('id', symbol), GL.assets); // TODO: Factor up
  var globalAssets = GL.assets; // TODO: Factor up
  var modeHashes = R.prop('modehashes', assets); // TODO: Factor up
  var txData = {
    element: '.assets-main > .data .balance-' + symbol.replace(/\./g, '-'),
    asset,
    amount: Number(R.nth(0, z)),
    source: R.prop('address', asset).trim(),
    target: String(R.nth(1, z)).trim()
  };

  sendTransaction(txData, globalAssets, modeHashes, hideModal, alertError);
}

function hideModal (z) {
  var txData = R.nth(0, z);
  var transactionID = R.nth(1, z);
  UItransform.deductBalance(
    R.prop('element', txData),
    R.path(['asset', 'symbol'], txData),
    R.prop('balanceAfterTransaction', txData)
  );
  UItransform.txStop();
  UItransform.txHideModal();
  console.log(transactionID);
}

function alertError (err) {
  if (err !== 'Handling in deterministic.') {
    UItransform.txStop();
    alert('Error: ' + err);
    console.log('err = ', err);
  }
}

validatedTxDetailsStream.subscribe(function (_) {
  TxValidations.toggleSendButtonClass();
});

transactionDataStream.subscribe(function (z) {
  loadSpinner();
  sendTransfer(z);
});
