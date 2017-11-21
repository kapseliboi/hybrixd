init.interface.assets = function(args) {
  topmenuset('assets');  // top menu UI change
  clearInterval(intervals); // clear all active intervals

  clipb_success = function() { 
    console.log('Data copied to clipboard.'); 
    $('#action-receive .copied').html('Address copied to clipboard.');
    $('#action-receive .copied').fadeTo( "fast" , 1);
    $('#action-receive .copied').delay(1000).fadeTo( "fast" , 0);
  };
  clipb_fail = function(err) {
    alert("This browser cannot automatically copy to the clipboard! \n\nPlease select the text manually, and press CTRL+C to \ncopy it to your clipboard.\n");
  };
  
  // modal helper functions
  manage_assets = function() {
    var output = '';
    output+='<table class="pure-table pure-table-striped"><tbody>';
    output+='<tr><td class="icon">'+svg['circle']+'</td><td class="asset asset-btc">BTC</td><td class="full-name">Bitcoin</td>';
    output+='<td class="actions"><div class="assetbuttons assetbuttons-btc"><a onclick="generate_asset_button(\'btc\',1);" class="pure-button pure-button-error" role="button"><div class="actions-icon">'+svg['remove']+'</div>Remove</a></div></td></tr>';
    output+='<tr><td class="icon">'+svg['circle']+'</td><td class="asset asset-eth">ETH</td><td class="full-name">Ethereum</td>';
    output+='<td class="actions"><div class="assetbuttons assetbuttons-eth"><a onclick="generate_asset_button(\'eth\',1);" class="pure-button pure-button-error" role="button"><div class="actions-icon">'+svg['remove']+'</div>Remove</a></div></td></tr>';
    output+='<tr><td class="icon">'+svg['circle']+'</td><td class="asset asset-lsk">LSK</td><td class="full-name">Lisk</td>';
    output+='<td class="actions"><div class="assetbuttons assetbuttons-lsk"><a onclick="generate_asset_button(\'lsk\',1);" class="pure-button pure-button-error" role="button"><div class="actions-icon">'+svg['remove']+'</div>Remove</a></div></td></tr>';
    output+='</tbody></table>';
    $('#manage-assets .data').html(output); // insert new data into DOM
    generate_asset_button('btc','add');
  }
  generate_asset_button = function(asset,state) {
    if (state == '0') {
      $('#manage-assets .assetbuttons-'+asset).html('<a onclick="generate_asset_button(\''+asset+'\',1);" class="pure-button pure-button-error" role="button"><div class="actions-icon">'+svg['remove']+'</div>Remove</a>');
    } else if (state == '1') {
      $('#manage-assets .assetbuttons-'+asset).html('<a onclick="generate_asset_button(\''+asset+'\',0);" class="pure-button pure-button-success" role="button"><div class="actions-icon">'+svg['add']+'</div>Add</a>');
    }
  }
  fill_actions = function(asset,balance) {
    $('#action-actions #ModalLabel').html(asset.toUpperCase());
    $('#action-actions .balance').html(balance.toUpperCase());
    var output = '';
    output+='<a onclick=\'fill_send("'+asset+'","'+balance+'");\' href="#action-send" class="pure-button pure-button-primary" role="button" data-dismiss="modal" data-toggle="modal">Send</a>';
    output+='<a onclick=\'fill_recv("'+asset+'","'+balance+'");\' href="#action-receive" class="pure-button pure-button-secondary" role="button" data-dismiss="modal" data-toggle="modal">Receive</a>';
    output+='<a href="#action-advanced" class="pure-button pure-button-grey advanced-button" role="button" data-dismiss="modal" data-toggle="modal"><div class="advanced-icon">'+svg['advanced']+'</div>Advanced</a>';
    $('#action-actions .buttons').html(output); 
  }
  fill_send = function(asset,balance) {
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
  fill_recv = function(asset,balance) {
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

  ui_assets = function(properties) {
    var i = properties.i;
    var balance = properties.balance;
    // fill asset elements
    for (j = 0; j < i; j++) {
      setTimeout(
        function(j) {      
          if(typeof balance.asset[j] !== 'undefined') {
            var element = '.assets-main > .data .balance-'+balance.asset[j].replace(/\./g,'-');
            if((balance.lasttx[j]+120000)<(new Date).getTime()) {
              hybriddcall({r:'a/'+balance.asset[j]+'/balance/'+assets.addr[balance.asset[j]],z:0},element,
                function(object){
                  if(typeof object.data=='string') { object.data = formatFloat(object.data); }
                  var assetbuttons = '.assets-main > .data .assetbuttons-'+balance.asset[j].replace(/\./g,'-');
                  if(object.data!=null && !isNaN(object.data)){
                    $(assetbuttons).delay(1000).removeClass('disabled');
                    $(assetbuttons+' a').removeAttr('disabled');
                    $(assetbuttons+' a').attr('data-toggle', 'modal');
                  } else {
                    $(assetbuttons).addClass('disabled');
                    $(assetbuttons+' a').removeAttr('data-toggle');
                    $(assetbuttons+' a').attr("disabled", "disabled");
                  }
                  return object;
                }
              );
            }
          }
        }
      ,j*500,j);
    }
  }
}
