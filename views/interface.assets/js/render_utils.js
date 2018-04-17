function renderManageButton (element, asset, active) {
  var activeToggled = R.not(active);
  var btnText = active ? 'Remove' : 'Add';
  var btnClass = active ? 'pure-button-error selectedAsset' : 'pure-button-success';
  var svgName = active ? 'remove' : 'add';

  return '<a onclick="changeManageButton(\'' + element + '\',\'' + asset + '\',' + activeToggled + ');" class="pure-button ' + btnClass + '" role="button"><div class="actions-icon">' + svg[svgName] + '</div>' + btnText + '</a>';
}

function changeManageButton (element, asset, active) {
  GL.assetSelect[asset] = active;
  document.querySelector('#manage-assets .assetbuttons-' + element).innerHTML = renderManageButton(element, asset, active);
}

function fillSend (asset) {
  var element = '.assets-main > .data .balance-' + asset.replace(/\./g,'-');
  var balance = document.querySelector(element).getAttribute('amount');
  if (balance && balance !== '?') {
    if (!isToken(asset)) {
      var spendable = toInt(balance).minus(toInt(assets.fees[asset]));
    } else {
      var spendable = toInt(balance);
    }
    if (spendable < 0) { spendable = 0; }
    document.querySelector('#action-send .modal-send-currency').innerHTML = asset.toUpperCase();
    document.querySelector('#action-send .modal-send-currency').setAttribute('asset', asset);
    document.querySelector('#action-send .modal-send-balance').innerHTML = formatFloat(spendable);
    document.querySelector('#modal-send-target').value = '';
    document.querySelector('#modal-send-amount').value = '';
    document.querySelector('#action-send .modal-send-addressfrom').innerHTML = assets.addr[asset];
    document.querySelector('#action-send .modal-send-networkfee').innerHTML = formatFloat(assets.fees[asset]) + ' ' + asset.split('.')[0].toUpperCase();
    check_tx();
  }
}

function receiveAction (asset) {
  var assetAddress = assets.addr[asset];
  document.querySelector('#action-receive .modal-receive-currency').innerHTML = asset.toUpperCase(); // after getting address from hybridd, set data-clipboard-text to contain it
  document.querySelector('#action-receive .modal-receive-addressfrom').innerHTML = assetAddress;
  document.querySelector('#modal-receive-button').setAttribute('data-clipboard-text', document.querySelector('#action-receive .modal-receive-addressfrom').innerHTML); // set clipboard content for copy button to address
  clipboardButton('#modal-receive-button', clipb_success, clipb_fail); // set function of the copy button
  document.querySelector('#action-receive .modal-receive-status').setAttribute('id', 'receivestatus-' + asset);

  mkNewQRCode(assetAddress);
}

function mkNewQRCode (address) {
    new QRCode(document.getElementById('qrcode'), {
      text: address,
      width: 160,
      height: 160,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }

function checkTx () {
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
}

function stopReceiveAction () { document.querySelector('#action-receive .modal-receive-status').setAttribute('id', 'receivestatus'); }; // reset status ID attribute to avoid needless polling

function scrollToAnchor (args) {
  return function () {
    if (args.element !== null && args.element !== undefined) {
      $('html, body').animate({
        scrollTop: $('#' + args.element).offset().top - 250
      }, 500);
    }
  };
}
