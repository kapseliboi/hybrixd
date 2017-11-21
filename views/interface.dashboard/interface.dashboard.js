init.interface.dashboard = function(args) {
 
  $("#userID").html(args.userid); // set user ID field in top bar
  topmenuset('dashboard');  // top menu UI change
  clearInterval(intervals); // clear all active intervals
  
  // modal helper functions
  manage_favourites = function() {
    var output = '';
    output+='<table class="pure-table pure-table-striped"><tbody>';
    output+='<tr><td class="icon">'+svg['circle']+'</td><td class="asset asset-btc">BTC</td><td class="full-name">Bitcoin</td>';
    output+='<td class="actions"><div class="assetbuttons assetbuttons-btc"><a onclick="" class="pure-button pure-button-grey button-unfavourite" role="button"><div class="actions-icon">'+svg['star-o']+'</div>Remove star</a></div></td></tr>';
    output+='<tr><td class="icon">'+svg['circle']+'</td><td class="asset asset-eth">ETH</td><td class="full-name">Ethereum</td>';
    output+='<td class="actions"><div class="assetbuttons assetbuttons-eth"><a onclick="" class="pure-button pure-button-warning button-favourite" role="button"><div class="actions-icon">'+svg['star']+'</div>Add star</a></div></td></tr>';
    output+='<tr><td class="icon">'+svg['circle']+'</td><td class="asset asset-lsk">LSK</td><td class="full-name">Lisk</td>';
    output+='<td class="actions"><div class="assetbuttons assetbuttons-lsk"><a onclick="" class="pure-button pure-button-warning button-favourite" role="button"><div class="actions-icon">'+svg['star']+'</div>Add star</a></div></td></tr>';
    output+='</tbody></table>';
    $('#manage-favourites .data').html(output); // insert new data into DOM
  }

	// do stuff the dashboard should do...
	$(document).ready( function(){

		// element: TOP ACCOUNT BALANCES
		// functions: display account balances, and cache the deterministic encryption routines
		$('.dashboard-balances .spinner-loader').fadeOut('slow', function() {

      balance = {};
      balance.asset = [];
      balance.amount = [];
      balance.lasttx = [];

      // query storage for active assets
      if(typeof GL.assetsActive === 'undefined') {
        storage.Get( nacl.to_hex(GL.usercrypto.user_keys.boxPk)+'.assets.list.user' , function(list) {
          try { list = JSON.parse(list); } catch (err) { list = null; }
          GL.assetsActive = list;
          // query storage for dash assets
          if(typeof GL.assetsDash === 'undefined') {
            storage.Get( nacl.to_hex(GL.usercrypto.user_keys.boxPk)+'.assets.dash.user' , function(list) {
              try { list = JSON.parse(list); } catch (err) { list = null; }
              GL.assetsDash = list;
              // init asset display
              displayAssets();
            });
          }
        });
      } else {
        displayAssets();
      }

		});

	});

}

function displayAssets() {

      if(GL.assetsActive == null || typeof GL.assetsActive !== 'object') {
        GL.assetsActive = ["btc","eth"];
      }

      if(GL.assetsDash == null || typeof GL.assetsDash !== 'object') {
        GL.assetsDash = ["btc","eth"];
      }
    
      // initialize all assets
      hybriddcall({r:'/s/deterministic/hashes',z:1},null,
        function(object,passdata){
          assets.modehashes = object.data;

          // create mode array of selected assets
          var activeAssetsObj = {};
          var i = 0;
          for(i = 0; i < GL.assetsActive.length; ++i) {
            if(typeof GL.assetmodes[GL.assetsActive[i]] !== 'undefined') {
              activeAssetsObj[GL.assetsActive[i]] = GL.assetmodes[GL.assetsActive[i]];
            }
          }
        
          var output = '';
          
          var i = 0;
          for (var entry in activeAssetsObj) {
            // load assets and balances into arrays
            balance.asset[i] = entry;
            balance.amount[i] = 0;
            // increment array counter
            i++;
            // get and initialize deterministic encryption routines for assets
            // timeout used to avoid double downloading of deterministic routines
            var defer = (assets.init.indexOf(GL.assetmodes[entry].split('.')[0])==-1?0:3000);
            assets.init.push(GL.assetmodes[entry].split('.')[0]);
            setTimeout(function(entry,passdata) {
              init_asset(entry,GL.assetmodes[entry]);
            },(100*i)+defer,entry);
            // if all assets inits are called run 
            if(i==GL.assetsActive.length) {
              // create asset elements that are selected to show in dashboard
              for (i = 0; i < GL.assetsActive.length; i++) {
                if(GL.assetsDash.indexOf(GL.assetsActive[i])!==-1 && typeof balance.asset[i] !== 'undefined') {
                  output+='<div onclick="fetchview(\'interface.assets\',{user_keys: pass_args.user_keys, nonce: pass_args.nonce, asset:\''+balance.asset[i]+'\'});" class="balance"><h5>'+balance.asset[i]+'</h5><div class="divider"></div><h3 class="balance-'+balance.asset[i].replace(/\./g,'-')+'">'+progressbar()+'</h3></div>';
                }
              }
              $('.dashboard-balances > .data').html(output);	// insert new data into DOM
            }
          }
          
          var getBalances = function (balance,assets) {
            for (i = 0; i < GL.assetsActive.length; i++) {
              if(GL.assetsDash.indexOf(GL.assetsActive[i])!==-1 && typeof balance.asset[i] !== 'undefined') {
                setTimeout(
                  function(i) {
                    if(typeof assets.addr[balance.asset[i]] != 'undefined') {
                      var element = '.dashboard-balances > .data > .balance > .balance-'+balance.asset[i].replace(/\./g,'-');
                      hybriddcall({r:'a/'+balance.asset[i]+'/balance/'+assets.addr[balance.asset[i]],z:0},element,function(object){if(typeof object.data=='string') { object.data = UItransform.formatFloat(object.data); } return object;});
                      // DEBUG: console.log('ASSET CALL: a/'+balance.asset[i]+'/balance/'+assets.addr[balance.asset[i]]);
                    }
                  }
                ,i*500,i)
              }
            }
          }
          // regularly fill 5 asset elements with balances
          intervals = setInterval(
            function() {
              getBalances(balance,assets);
            }
          ,60000);
          // fill the same elements when dashboard has just loaded
          loadinterval = setInterval(
            // check if assets are loaded by hybriddcall
            function() {
              var assetsloaded = true;
              for (i = 0; i < 5; i++) {
                if(typeof balance.asset[i] != 'undefined' && typeof assets.addr[balance.asset[i]] == 'undefined') {
                  assetsloaded = false;
                }
              }
              if(assetsloaded) {                          
                getBalances(balance,assets);
                clearInterval(loadinterval);
              }
            }
          ,500);          
        }
      );

}
