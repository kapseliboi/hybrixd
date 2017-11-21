init.interface.assets = function(args) {
  topmenuset('assets');  // top menu UI change
  clearInterval(intervals); // clear all active intervals

  clipb_success = function() { console.log('Data copied to clipboard.'); $('#action-receive .modal-receive-addressfrom').pulse({times: 5, duration: 250}) };
  clipb_fail = function(err) {
    alert("This browser cannot automatically copy to the clipboard! \n\nPlease select the text manually, and press CTRL+C to \ncopy it to your clipboard.\n");
  };
  
  // modal helper functions
  fill_send = function(asset) {
    var element = '.assets-main > .data .balance-'+asset.replace(/\./g,'-');
    var balance = $(element).attr('amount');
    if(balance && balance!=='?') {
      if(!isToken(asset)) {
        var spendable = toInt(balance).minus(toInt(assets.fees[asset]));
      } else {
        var spendable = toInt(balance);
      }
      if(spendable<0) { spendable=0; }
      $('#action-send .modal-send-currency').html(asset.toUpperCase());
      $('#action-send .modal-send-currency').attr('asset',asset);
      $('#action-send .modal-send-balance').html(formatFloat(spendable));
      $('#modal-send-target').val('');
      $('#modal-send-amount').val('');
      $('#action-send .modal-send-addressfrom').html(assets.addr[asset]);
      $('#action-send .modal-send-networkfee').html(String(assets.fees[asset]).replace(/0+$/, '')+' '+asset.split('.')[0].toUpperCase());
      check_tx();
    }
  }
  fill_recv = function(asset) {
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
  stop_recv = function() {
    $('#action-receive .modal-receive-status').attr('id','receivestatus'); // reset status ID attribute to avoid needless polling
  }
  check_tx = function() {
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

  // fill asset elements
  ui_assets = function(properties) {
    var i;
    for (i = 0; i < GL.assetsActive.length; i++) {
      setTimeout(
        function(i) {      
          if(typeof balance.asset[i] !== 'undefined') {
            var element = '.assets-main > .data .balance-'+balance.asset[i].replace(/\./g,'-');
            if((balance.lasttx[i]+120000)<(new Date).getTime()) {
              hybriddcall({r:'a/'+balance.asset[i]+'/balance/'+assets.addr[balance.asset[i]],z:0},element,
                function(object){
                  if(typeof object.data=='string') { object.data = UItransform.formatFloat(object.data); }
                  var assetbuttons = '.assets-main > .data .assetbuttons-'+balance.asset[i].replace(/\./g,'-');
                  if(object.data!=null && !isNaN(object.data)){
                    $(assetbuttons).delay(1000).removeClass('disabled');
                    $(assetbuttons+' a').attr('data-toggle', 'modal');
                    $(element).attr('amount',object.data);
                  } else {
                    $(assetbuttons).addClass('disabled');
                    $(assetbuttons+' a').removeAttr('data-toggle');
                    $(element).attr('amount','?');
                  }
                  return object;
                }
              );
            }
          }
        }
      ,i*500,i);
    }
  }
}
