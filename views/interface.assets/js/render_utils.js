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

function fillAction (asset) {
  var element = '.assets-main > .data .balance-'+asset.replace(/\./g,'-');
  $('#action-actions #ModalLabel').html(asset.toUpperCase());
  $('#action-actions .balance').html($(element).html().toUpperCase());
  var output = '';
  output+='<a onclick=\'fill_send("'+asset+'");\' href="#action-send" class="pure-button pure-button-large pure-button-fw pure-button-primary" role="button" data-dismiss="modal" data-toggle="modal">Send</a>';
  output+='<a onclick=\'fill_recv("'+asset+'");\' href="#action-receive" class="pure-button pure-button-large pure-button-fw pure-button-secondary" role="button" data-dismiss="modal" data-toggle="modal">Receive</a>';
  output+='<a href="#action-advanced" class="pure-button pure-button-grey pure-button-large pure-button-fw advanced-button" role="button" data-dismiss="modal" data-toggle="modal"><div class="advanced-icon">'+svg['advanced']+'</div>Advanced</a>';
  $('#action-actions .buttons').html(output);
}

function fillSend (asset) {
  var element = '.assets-main > .data .balance-'+asset.replace(/\./g,'-');
  var balance = $(element).attr('amount');
  if(balance && balance!=='?') {
    if(!isToken(asset)) {
      var spendable = toInt(balance).minus(toInt(assets.fees[asset]));
    } else {
      var spendable = toInt(balance);
    }
    if (spendable<0) { spendable=0; }
    $('#action-send .modal-send-currency').html(asset.toUpperCase());
    $('#action-send .modal-send-currency').attr('asset',asset);
    $('#action-send .modal-send-balance').html(formatFloat(spendable));
    $('#modal-send-target').val('');
    $('#modal-send-amount').val('');
    $('#action-send .modal-send-addressfrom').html(assets.addr[asset]);
    $('#action-send .modal-send-networkfee').html(formatFloat(assets.fees[asset])+' '+asset.split('.')[0].toUpperCase());
    check_tx();
  }
}

function receiveAction (asset) {
  $('#action-receive .modal-receive-currency').html(asset.toUpperCase());
  // after getting address from hybridd, set data-clipboard-text to contain it
  $('#action-receive .modal-receive-addressfrom').html(assets.addr[asset]);
  $('#modal-receive-button').attr('data-clipboard-text', $('#action-receive .modal-receive-addressfrom').html() ) // set clipboard content for copy button to address
  clipboardButton('#modal-receive-button', clipb_success, clipb_fail); // set function of the copy button
  $('#action-receive .modal-receive-status').attr('id','receivestatus-'+asset);
  $("#qrcode").html('').append( function() {
    new QRCode(document.getElementById("qrcode"),
               { text:assets.addr[asset],
                 width: 160,
                 height: 160,
                 colorDark : "#000000",
                 colorLight : "#ffffff",
                 correctLevel : QRCode.CorrectLevel.H
               });
  });
}

function checkTx () {
  var p = {};
  p.asset = $('#action-send .modal-send-currency').attr('asset');
  p.target_address = String($('#modal-send-target').val());
  p.amount = Number($("#modal-send-amount").val());
  p.available = Number($('#action-send .modal-send-balance').html());
  if(!isNaN(p.amount) && p.amount>0 && p.amount<=p.available && p.target_address) {
    $('#action-send .pure-button-send').removeClass('disabled');
  } else {
    $('#action-send .pure-button-send').addClass('disabled');
  }
}

function stopReceiveAction () {
  $('#action-receive .modal-receive-status').attr('id', 'receivestatus'); // reset status ID attribute to avoid needless polling
}

function scrollToAnchor  (args) {
  return function () {
    if (args.element !== null && args.element !== undefined) {
      $('html, body').animate({
        scrollTop: $('#' + args.element).offset().top - 250
      }, 500);
    }
  };
}
