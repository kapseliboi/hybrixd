import R from 'ramda';

export var transactionUtils = {
  mkTransactionData: function (zippedTxDetails, globalAssets) {
    var symbol = document.querySelector('#action-send .modal-send-currency').getAttribute('asset');
    var asset = R.find(R.propEq('id', symbol), globalAssets);

    return {
      element: '.assets-main > .data .balance-' + symbol.replace(/\./g, '-'),
      asset,
      amount: Number(R.nth(0, zippedTxDetails)),
      source: R.prop('address', asset).trim(),
      target: String(R.nth(1, zippedTxDetails)).trim()
    };
  }
};
