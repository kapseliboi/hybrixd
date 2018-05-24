var Clipboard = clipboard;

// RENDERS THE RELEVANT INFORMATION IN THE TX MODAL
fillSend = function (assetID) {
  var asset = R.find(R.propEq('id', assetID))(GL.assets);
  var balance = R.path(['balance', 'amount'], asset);
  var address = R.prop('address', asset);
  var fee = R.prop('fee', asset);
  if (R.not(R.isNil(balance)) && balance !== '?') {
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
    checkTx();
  }
};

receiveAction = function (assetID) {
  var asset = R.find(R.propEq('id', assetID))(GL.assets);
  var assetAddress = R.prop('address', asset);
  document.querySelector('#action-receive .modal-receive-currency').innerHTML = assetID.toUpperCase(); // after getting address from hybridd, set data-clipboard-text to contain it
  document.querySelector('#action-receive .modal-receive-addressfrom').innerHTML = assetAddress;
  document.querySelector('#modal-receive-button').setAttribute('data-clipboard-text', document.querySelector('#action-receive .modal-receive-addressfrom').innerHTML); // set clipboard content for copy button to address
  clipboardButton('#modal-receive-button', Clipboard.clipboardSuccess, Clipboard.clipboardError); // set function of the copy button
  document.querySelector('#action-receive .modal-receive-status').setAttribute('id', 'receivestatus-' + assetID);

  mkNewQRCode(assetAddress);
};

function mkNewQRCode (address) {
  var qrCode = document.getElementById('qrcode');

  qrCode.innerHTML = ''; // Remove old QR code. HACKY!!!!

  var code = new QRCode(document.getElementById('qrcode'), {
    text: address,
    width: 160,
    height: 160,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });

  return qrCode;
}

function toggleSendTxButton (z) {
  var asset = R.nth(0);
  var amountToSend = R.nth(1);
  var targetAddress = R.nth(1);
  var availableBalance = null // SPENDABLE AMOUNT

  // TODO Validations
  var txDetailsAreValid = !isNaN(amountToSend) &&
      amountToSend > 0 &&
      amountToSend <= availableBalance &&
      targetAddress;

  var classListMethod = txDetailsAreValid ? 'remove' : 'add';
  document.querySelector('#action-send .pure-button-send').classList[classListMethod]('disabled');
};

checkTx = function () {
  var p = {
    asset: document.querySelector('#action-send .modal-send-currency').getAttribute('asset'),
    target_address: String(document.querySelector('#modal-send-target').value),
    amount: Number(document.querySelector('#modal-send-amount').value),
    available: Number(document.querySelector('#action-send .modal-send-balance').innerHTML)
  };
  // TODO Validations
  var txDetailsAreValid = !isNaN(p.amount) &&
      p.amount > 0 &&
      p.amount <=
      p.available &&
      p.target_address;

  var classListMethod = txDetailsAreValid ? 'remove' : 'add';
  document.querySelector('#action-send .pure-button-send').classList[classListMethod]('disabled');
};

stopReceiveAction = function () { document.querySelector('#action-receive .modal-receive-status').setAttribute('id', 'receivestatus'); }; // reset status ID attribute to avoid needless polling
