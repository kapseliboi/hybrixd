// User interface transformations
UItransform = {
  formatFloat : function(n) {
    if(isNaN(n)) {
      output = '?';
    } else {
      var balance = String(Number(n));
      if (balance === "0") {
        output = '0';
      } else {
        var maxlen = 5;   // amount of significant digits
        var output = '';
        var zeros = 0;
        var i;
        var size_open = '<span class="mini-balance">';
        var size_stop = '</span>';
        if (balance[0] === "0") {
          output+='<span>'+size_open;
          for(i = 0; i < balance.length && i <= maxlen; i+=1) {
            if (balance[i] === "0" || balance[i] === ".") {
              zeros += 1;
              if(balance[i] === ".") {
                output += balance.substr(i, 1);
              } else {
                output += balance.substr(i, 1);
              }
            } else {
              i = balance.length;
            }
          }
          output+=size_stop+'</span>';
        }
        output += balance.substr(zeros,(i > maxlen?maxlen:i));
        if ((balance.length-zeros) > maxlen) {
          output += '<span class="balance-end mini-balance">&hellip;</span>'; 
        }
      }
    }
    return output;
  }
}

// do stuff the dashboard should do...
$(document).ready( function(){
  
  // add icon
  $('.manage-icon').html(svg['edit']);

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
