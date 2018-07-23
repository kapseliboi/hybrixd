import { transactionValidations } from '../Transaction/validations.js';
import { transactionUtils } from '../Transaction/utils.js';
import { utils_ } from '../../../index/utils.js';

import * as R from 'ramda';

import { fromEvent } from 'rxjs/observable/fromEvent';
import { combineLatest } from 'rxjs/observable/combineLatest';
import { map, filter, withLatestFrom } from 'rxjs/operators';

export var sendAsset = {
  // RENDERS THE RELEVANT INFORMATION IN THE TX MODAL
  renderAssetDetailsInModal: function (assetID) {
    var asset = R.find(R.propEq('id', assetID))(GL.assets);
    var balance = R.path(['balance', 'amount'], asset);
    var address = R.prop('address', asset);
    var fee = R.prop('fee', asset);
    var ethTokenFactoredBufferOrZeroAmount = zeroOrEthTokenBufferAmount(asset);

    if (R.not(R.isNil(balance)) && balance !== 'n/a') {
      var spendable = !isToken(assetID)
        ? toInt(balance).minus(toInt(fee))
        : toInt(balance).minus(toInt(ethTokenFactoredBufferOrZeroAmount));
      if (spendable < 0) { spendable = 0; }
      var fixedSpendable = spendable.toFixed(21).replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1');

      renderAssetDetails(asset, assetID, address, fixedSpendable, fee);
    }
  }
};

function zeroOrEthTokenBufferAmount (asset) {
  var factor = Number(R.prop('factor', asset));
  var keybase = R.prop('keygen-base', asset);
  var smallestUnit = 10 / Math.pow(10, R.inc(factor));
  return R.equals(keybase, 'eth')
    ? smallestUnit
    : 0;
}

var txAmountStream = fromEvent(document.querySelector('#modal-send-amount'), 'input')
  .pipe(
    map(utils_.getTargetValue)
  );

var txTargetAddressStream = fromEvent(document.querySelector('#modal-send-target'), 'input')
  .pipe(
    map(utils_.getTargetValue)
  );
// .map(validateAddress) // ENTER ADDRESS VALIDATIONS

var validatedTxDetailsStream = combineLatest(
  txAmountStream,
  txTargetAddressStream
);

var sendTxButtonStream = fromEvent(document.querySelector('#send-transfer'), 'click')
  .pipe(
    filter(utils_.btnIsNotDisabled)
  );

var transactionDataStream = sendTxButtonStream
  .pipe(
    withLatestFrom(validatedTxDetailsStream)
  );

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

function renderAssetDetails (asset, assetID, address, spendable, fee) {
  document.querySelector('#action-send .modal-send-currency').innerHTML = assetID.toUpperCase();
  document.querySelector('#action-send .modal-send-currency').setAttribute('asset', assetID);
  document.querySelector('#action-send .modal-send-balance').innerHTML = spendable;
  document.querySelector('#send-transfer').classList.add('disabled');
  document.querySelector('#modal-send-target').value = '';
  document.querySelector('#modal-send-amount').value = '';
  utils_.triggerEvent(document.querySelector('#modal-send-target'), 'input');
  utils_.triggerEvent(document.querySelector('#modal-send-amount'), 'input');
  document.querySelector('#action-send .modal-send-addressfrom').innerHTML = address;
  document.querySelector('#action-send .modal-send-networkfee').innerHTML = formatFloat(fee) + ' ' + R.prop('fee-symbol', asset).toUpperCase();
}

validatedTxDetailsStream.subscribe(function (z) {
  var amount = R.nth(0, z);
  var targetAddress = R.nth(1, z);
  transactionValidations.toggleSendButtonClass(amount, targetAddress);
});

transactionDataStream.subscribe(function (z) {
  var userInput = R.nth(1, z);
  var globalAssets = GL.assets; // TODO: Factor up
  var txData = transactionUtils.mkTransactionData(userInput, globalAssets);
  var modeHashes = R.prop('modehashes', assets); // TODO: Factor up

  var amount = R.nth(0, userInput);
  var targetAddress = R.nth(1, userInput);
  var isValid = transactionValidations.toggleSendButtonClass(amount, targetAddress);

  if (isValid) {
    loadSpinner();
    sendTransaction(txData, globalAssets, modeHashes, hideModal, alertError);
  }
});
