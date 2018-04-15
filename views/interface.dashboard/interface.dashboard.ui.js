// User interface transformations
UItransform = {
  formatFloat : function (n) {
    if(isNaN(n)) {
      output = '?';
    } else {
      var balance = bigNumberToString((toInt(n)));
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
          output+=size_open;
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
          output+=size_stop;
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
  $('.twitter').html(svg['twitter']);
  $('.telegram').html(svg['telegram']);
  $('.riot').html(svg['riot']);
  $('.slack').html(svg['slack']);
  $('.bitcointalk').html(svg['bitcointalk']);
  $('.chevron-right').html(svg['chevron-right']);
});
