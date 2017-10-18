// main asset management code
$(document).ready( function(){
  // fill advanced modal with work-in-progress icon
  var output = '<div style="text-align: center; margin-left: auto; margin-right: auto; width: 30%; color: #CCC;">'+svg['cogs']+'</div>';
  $('#advancedmodal').html(output);	// insert new data into DOM

  // attached buttons and actions
  $('#send-transfer').click(function() { send_tx(); });

  // are we sending a transaction?
  send_active=false;

  // elements: MAIN
  $('.assets-main .spinner-loader').fadeOut('slow', function() {
    balance = {}
    balance.asset = [];
    balance.amount = [];
    balance.lasttx = [];
    GL.cur_step = next_step();
    $.ajax({ url: path+zchan(GL.usercrypto,GL.cur_step,'a'),
      success: function(object){
        object = zchan_obj(GL.usercrypto,GL.cur_step,object);
        var i = 0;
        var output = '';
        // create asset table
        output+='<table class="pure-table pure-table-striped"><thead>';
        output+='<tr><th>Asset</th><th>Balance</th><th class="actions"></th></tr></thead><tbody>';
        for (var entry in object.data) {
          balance.asset[i] = entry;
          balance.amount[i] = 0;
          balance.lasttx[i] = 0;
          var element=balance.asset[i].replace(/\./g,'-');
          output+='<tr><td class="asset asset-'+element+'">'+entry+'</td><td><div class="balance balance-'+element+'">'+progressbar()+'</div></td><td class="actions"><div class="assetbuttons-'+element+' disabled">';
          output+='<a onclick=\'fill_send("'+balance.asset[i]+'",$(".assets-main > .data .balance-'+entry+'").html());\' href="#action-send" class="pure-button pure-button-primary" role="button" data-toggle="modal">Send</a>';
          output+='<a onclick=\'fill_recv("'+balance.asset[i]+'",$(".assets-main > .data .balance-'+entry+'").html());\' href="#action-receive" class="pure-button pure-button-secondary" role="button" data-toggle="modal">Receive</a>';
          output+='<a href="#action-advanced" class="pure-button pure-button-grey" role="button" data-toggle="modal">Advanced</a>';
          output+='</div></td></tr>';
          i++;
        }
        output+='</tbody></table>';
        // refresh assets
        ui_assets({i:i,balance:balance,path:path});
        intervals = setInterval( function(path) {
          ui_assets({i:i,balance:balance,path:path});
        },30000,path);
        $('.assets-main > .data').html(output);	// insert new data into DOM
      }
    });
  });
});
