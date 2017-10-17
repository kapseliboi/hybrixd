init.interface.dashboard = function(args) {
  // fill local usercrypto object with keys and nonce later on
  GL = {
    usercrypto:{ user_keys: args.user_keys, nonce: args.nonce }
  }
 
  $("#userID").html(args.userid); // set user ID field in top bar
  topmenuset('dashboard');  // top menu UI change
  clearInterval(intervals); // clear all active intervals
  
	// do stuff the dashboard should do...
	$(document).ready( function(){

		// element: TOP ACCOUNT BALANCES
		// functions: display account balances, and cache the deterministic encryption routines
		$('.dashboard-balances .spinner-loader').fadeOut('slow', function() {
      balance = {};
      balance.asset = [];
      balance.amount = [];
      GL.cur_step = next_step();
      $.ajax({ url: path+zchan(GL.usercrypto,GL.cur_step,'a'),
        success: function(object){
          object = zchan_obj(GL.usercrypto,GL.cur_step,object);
          //var callstates = [];


          // initialize all assets
          if( assets.count==0 ) { for (var entry in object.data) { assets.count++; } }

          var pass = object.data;
          hybriddcall({r:'/s/deterministic/hashes',z:1,pass:pass},null,
            function(object,passdata){
              assets.modehashes = object.data;
                        
              var output = '';
              
              var i = 0;
              for (var entry in passdata) {
                // load assets and balances into arrays
                balance.asset[i] = entry;
                balance.amount[i] = 0;
                // increment array counter
                i++;
                // get and initialize deterministic encryption routines for assets
                // timeout used to avoid double downloading of deterministic routines
                var defer = (assets.init.indexOf(passdata[entry].split('.')[0])==-1?0:3000);
                setTimeout(function(entry,passdata) {
                  init_asset(entry,passdata[entry]);
                },(100*i)+defer,entry,passdata);
                assets.init.push(passdata[entry].split('.')[0]);
                // if all assets inits are called run 
                if(i==assets.count) {
                  // create 5 asset elements
                  for (i = 0; i < 5; i++) {
                    if(typeof balance.asset[i] !== 'undefined') {
                      output+='<div onclick="fetchview(\'interface.assets\',{user_keys: pass_args.user_keys, nonce: pass_args.nonce, asset:\''+balance.asset[i]+'\'});" class="balance"><h5>'+balance.asset[i]+'</h5><div class="divider"></div><h3 class="balance-'+balance.asset[i]+'">'+progressbar()+'</h3></div>';
                    }
                  }
                  $('.dashboard-balances > .data').html(output);	// insert new data into DOM
                }
              }
              
              var getBalances = function (balance,assets) {
                for (i = 0; i < 5; i++) {
                  setTimeout(
                    function(i) {
                      if(typeof balance.asset[i] != 'undefined') {
                        if(typeof assets.addr[balance.asset[i]] != 'undefined') {
                          var element = '.dashboard-balances > .data > .balance > .balance-'+balance.asset[i];
                          hybriddcall({r:'a/'+balance.asset[i]+'/balance/'+assets.addr[balance.asset[i]],z:0},element,function(object){if(typeof object.data=='string') { object.data = formatFloat(object.data); } return object;});
                          // DEBUG: console.log('ASSET CALL: a/'+balance.asset[i]+'/balance/'+assets.addr[balance.asset[i]]);
                        }
                      }
                    }
                  ,i*500,i)
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
      });
		});

		// element: NETWORK
		var element = {};
		element.transactions = '.dashboard-transactions';
		$(element.transactions+' .spinner-loader').fadeOut('slow', function() {
			var output = '<div style="text-align: center; margin-left: auto; margin-right: auto; width: 30%; color: #CCC;">'+svg['cogs']+'<br><br>WORK IN PROGRESS</div>';
			$(element.transactions+' > .data').html(output);	// insert new data into DOM
      $(element.transactions+' > .data #path4155').attr('style','fill: #CCC');
      /*
			var cur_step = next_step();
			// DEBUG alert('Network step: '+cur_step);
			$.ajax({ url: path+zchan(usercrypto,cur_step,'a'), success: function(object){
				object = zchan_obj(usercrypto,cur_step,object);
				var output = '<p>A little example of dynamic data appearing!</p>';
				output+='<table class="pure-table pure-table-striped"><thead><tr><th>asset</th><th>balance</th></tr></thead><tbody>';
				for (var entry in object.data) {
          output+='<tr><td>'+entry+'</td><td>0</td></tr>';
        }
				output+='</tbody></table>';
				$(element.transactions+' > .data').html(output);	// insert new data into DOM
			} });
      */
		});

		element.trade = '.dashboard-trade';
		$(element.trade+' .spinner-loader').fadeOut('slow', function() {
			var output = '<div style="text-align: center; margin-left: auto; margin-right: auto; width: 30%; color: #CCC;">'+svg['cogs']+'<br><br>WORK IN PROGRESS</div>';
			$(element.trade+' > .data').html(output);	// insert new data into DOM
      $(element.trade+' > .data #path4155').attr('style','fill: #CCC');
		});
		
		element.chat = '.dashboard-chat';
		$(element.chat+' .spinner-loader').fadeOut('slow', function() {
			var output = '<div style="text-align: center; margin-left: auto; margin-right: auto; width: 30%; color: #CCC;">'+svg['cogs']+'<br><br>WORK IN PROGRESS</div>';
			$(element.chat+' > .data').html(output);	// insert new data into DOM
      $(element.chat+' > .data #path4155').attr('style','fill: #CCC');
		});
		
		element.apps = '.dashboard-apps';
		$(element.apps+' .spinner-loader').fadeOut('slow', function() {
			var output = '<div style="text-align: center; margin-left: auto; margin-right: auto; width: 30%; color: #CCC;">'+svg['cogs']+'<br><br>WORK IN PROGRESS</div>';
			$(element.apps+' > .data').html(output);	// insert new data into DOM
      $(element.apps+' > .data #path4155').attr('style','fill: #CCC');
		});

	});
}
