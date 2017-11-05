// User interface transformations
UItransform = {
  formatFloat : function(n) {
    var balance = String(Number(n));
    var length = balance.length;
    
    if (balance[0] == "0") { var start = 1 } else { var start = 0 }
    var output = balance.slice(start, 10);
    if (length > 10) {
      var output = balance.slice(start, 9);
      output += "<span class='balance-end'>&hellip;</span>"  
    }
    return output;
  }
}

// do stuff the dashboard should do...
$(document).ready( function(){
  
  // element: NETWORK
  var element = {};
  element.transactions = '.dashboard-transactions';
  $(element.transactions+' .spinner-loader').fadeOut('slow', function() {
    var output = '<div class="cogs">'+svg['cogs']+'<br><br>WORK IN PROGRESS</div>';
    $(element.transactions+' > .data').html(output);	// insert new data into DOM
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
    var output = '<div class="cogs">'+svg['cogs']+'<br><br>WORK IN PROGRESS</div>';
    $(element.trade+' > .data').html(output);	// insert new data into DOM
  });
  
  element.chat = '.dashboard-chat';
  $(element.chat+' .spinner-loader').fadeOut('slow', function() {
    var output = '<div class="cogs">'+svg['cogs']+'<br><br>WORK IN PROGRESS</div>';
    $(element.chat+' > .data').html(output);	// insert new data into DOM
  });
  
  element.apps = '.dashboard-apps';
  $(element.apps+' .spinner-loader').fadeOut('slow', function() {
    var output = '<div class="cogs">'+svg['cogs']+'<br><br>WORK IN PROGRESS</div>';
    $(element.apps+' > .data').html(output);	// insert new data into DOM
  });

});
