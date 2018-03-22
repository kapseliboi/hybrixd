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
        var maxlen = 11;   // amount of digits
        output = balance.substr(0, maxlen);

        if (balance.length > maxlen) {
          output += '<span>&hellip;</span>';
        }
      }
    }
    return output;
  },
  txStart : function() {
    loadSpinner();
    $('#action-send .pure-button-send').addClass('pure-button-disabled').removeClass('pure-button-primary');
    $('#action-send').css('opacity', '0.7');
  },
  txStop : function() {
    stopSpinner();
    $('#action-send .pure-button-send').removeClass('pure-button-disabled').addClass('pure-button-primary');
    $('#action-send').css('opacity', '1');
  },
  txHideModal : function() {
    $('#action-send').modal('hide').css('opacity', '1');
  },
  setBalance : function(element,setBalance) {
    $(element).html(setBalance);
  },
  deductBalance : function(element,newBalance) {
    $(element).html('<span style="color:#D77;">'+String(newBalance))+'</span>';
  }
}

$(".clearable").each(function() {

  var $inp = $(this).find("input:text"),
      $cle = $(this).find(".clearable__clear");

  $inp.on("input", function(){
    $cle.toggle(!!this.value);
  });

  $cle.on("touchstart click", function(e) {
    e.preventDefault();
    $inp.val("").trigger("input");
  });

});

displayAssets = function displayAssets() {
  balance = {}
  balance.asset = [];
  balance.amount = [];
  balance.lasttx = [];

  // create mode array of selected assets
  var activeAssetsObj = {};
  var i = 0;
  for(i = 0; i < GL.assetsActive.length; ++i) {
    if(typeof GL.assetmodes[GL.assetsActive[i]] !== 'undefined') {
      activeAssetsObj[GL.assetsActive[i]] = GL.assetmodes[GL.assetsActive[i]];
    }
  }

  var i = 0;
  var output = '';
  // create asset table
  output+='<div class="table">';
  output+='<div class="thead">';
  output+='<div class="tr">';
  output+='<div class="th col1 asset-title">Asset</div>';
  output+='<div class="th col2">Balance</div>';
  output+='<div class="th col3 actions"></div>';
  output+='</div>';
  output+='</div>';
  output+='<div class="tbody">';
  for (var entry in activeAssetsObj) {
    balance.asset[i] = entry;
    balance.amount[i] = 0;
    balance.lasttx[i] = 0;

    var maybeAsset = GL.assetsStarred.find(function (starred) {
      return starred.id === balance.asset[i]
    })

    var element=balance.asset[i].replace(/\./g,'-');
    var maybeStarActive = maybeAsset === undefined ? '' : ' id="' + maybeAsset['id'].replace(/\./g, '_') + '" onclick=toggle_star(' + i + ') '

    // var starIsToggled=storage.Get(userStorageKey('ff00-0033'));
    output+='<div class="tr">';
    output+='<div class="td col1 asset asset-'+element+'"><div class="icon">'+svg['circle']+'</div>'+entry+'<div class="star"><a' + maybeStarActive + 'role="button">'+ svg['star'] + '</a></div></div>';
    output+='<div class="td col2 "><div class="balance balance-'+element+'">'+progressbar()+'</div></div>';
    output+='<div class="td col3 actions">';
    output+='<div class="assetbuttons assetbuttons-'+element+' disabled">';
    output+='<a onclick=\'fill_send("'+entry+'");\' href="#action-send" class="pure-button pure-button-primary" role="button" data-toggle="modal" disabled="disabled">Send</a>';
    output+='<a onclick=\'fill_recv("'+entry+'");\' href="#action-receive" class="pure-button pure-button-secondary" role="button" data-toggle="modal" disabled="disabled">Receive</a>';
    output+='<a href="#action-advanced" class="pure-button pure-button-grey advanced-button" role="button" disabled="disabled"><div class="advanced-icon">'+svg['advanced']+'</div><span class="button-label">Advanced</span></a>';
    output+='</div>'
    output+='<div class="assetbutton-mobile assetbuttons-'+element+' disabled">'
    output+='<a onclick=\'fill_actions("'+entry+'");\' href="#action-actions" class="pure-button pure-button-grey actions-button" role="button" data-toggle="modal" disabled="disabled">Actions</a>';
    output+='</div></div></div>';
    i++;
  }

  output+='</div></div>';
  // refresh assets
  ui_assets({i:i,balance:balance,path:path});
  intervals = setInterval( function(path) {
    ui_assets({i:i,balance:balance,path:path});
  },30000,path);
  $('.assets-main > .data').html(output);	// insert new data into DOM

  // render starred assets svgs
  for (var i=0; i < GL.assetsStarred.length; i++) {
    setStarredAssetClass(i, GL.assetsStarred[i]['starred']);
  }
}

// main asset management code
$(document).ready( function(){
  // fill advanced modal with work-in-progress icon
  var output = '<div style="text-align: center; margin-left: auto; margin-right: auto; width: 30%; color: #CCC;">'+svg['cogs']+'</div>';
  $('#advancedmodal').html(output);	// insert new data into DOM

  // add icon
  $('.manage-icon').html(svg['edit']);

  // elements: MAIN
  $('.assets-main .spinner-loader').fadeOut('slow', function() {
    displayAssets();
  });
});

function loadSpinner () {
  document.querySelector('#action-send .spinner').classList.add('active');
}

function stopSpinner () {
  document.querySelector('#action-send .spinner').classList.remove('active');
}
