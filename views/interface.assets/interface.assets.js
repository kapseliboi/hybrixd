init.interface.assets = function(args) {
  topmenuset('assets');  // top menu UI change
  clearInterval(intervals); // clear all active intervals

  scrollToAnchor = function  () {
    if (args.element !== null) {
      $('html, body').animate({
        scrollTop: $('#' + args.element).offset().top
      }, 500);
    }
  }

  clipb_success = function() {
    $('#action-receive .copied').fadeTo( "fast" , 1);
    $('#action-receive .copied').delay(10).fadeTo( "fast" , 0.3);
    $('#action-receive .copied').delay(10).fadeTo( "fast" , 1);
    $('#action-receive .copied').delay(800).fadeTo( "fast" , 0);
  };
  clipb_fail = function(err) {
    alert("This browser cannot automatically copy to the clipboard! \n\nPlease select the text manually, and press CTRL+C to \ncopy it to your clipboard.\n");
  };

  //
  // attached modal buttons and actions
  //

  $('#send-transfer').click(function() {
    if ($("#send-transfer").hasClass("disabled")) {
      // cannot send transaction
    } else {
      // send transfer
      var symbol = $('#action-send .modal-send-currency').attr('asset');
      sendTransaction({
        element:'.assets-main > .data .balance-'+symbol.replace(/\./g,'-'),
        asset:symbol,
        amount:Number($("#modal-send-amount").val().replace(/\,/g,'.')),
        source:String($('#action-send .modal-send-addressfrom').html()).trim(),
        target:String($('#modal-send-target').val()).trim()
      });
    }
  });

  $('#save-assetlist').click(function() {
    // push selected assets to active stack
    var array = [];
    for(var entry in GL.assetnames) {
      if(GL.assetSelect[entry]) {
        array.push(entry);
        initAsset(entry,GL.assetmodes[entry]);
      }
    }
    GL.assetsActive = array;

    var newAssetsToStar = GL.assetsActive.filter(function (asset) {
      var foundOrUndefinedId = GL.assetsStarred.find(function (starred) {
        return starred.id === asset;
      })
      return foundOrUndefinedId === undefined;
    })

    GL.assetsStarred = GL.assetsActive.map(function (asset) {
      var foundOrUndefinedId = GL.assetsStarred.find(function (starred) {
        return asset === starred.id;
      })
      return foundOrUndefinedId === undefined ? {id: asset, starred: false} : foundOrUndefinedId;
    })

    // store selected assets
    storage.Set(  userStorageKey('ff00-0033') , userEncode(array) );
    storage.Set(  userStorageKey('ff00-0034') , userEncode(GL.assetsStarred) );
    displayAssets();
  });

  GL.searchingactive = false;
  GL.searchval = '';
  $('#search-assets').on('change keydown paste input', function(){
    if(!GL.searchingactive) {
      GL.searchingactive = true;
      // delay the search to avoid many multiple spawns of renderManageAssetsList
      setTimeout( function() {
        if($('#search-assets').val()!==GL.searchval) {
          renderManageAssetsList(GL.assetnames,$('#search-assets').val());
          GL.searchval = $('#search-assets').val();
        }
        GL.searchingactive = false;
      },250);
    }
  });

  // modal helper functions
  manageAssets = function manageAssets() {
    GL.assetSelect = [];
    renderManageAssetsList(GL.assetnames);
  }
  renderManageAssetsList = function renderManageAssetsList(list,search) {
    if(typeof search !== 'undefined') {
      search = search.toLowerCase();
    }
    for(var entry in GL.assetnames) {
      if(GL.assetsActive.indexOf(entry) === -1) {
        if(typeof GL.assetSelect[entry]==='undefined') {
          GL.assetSelect[entry] = false;
        }
      } else {
        if(typeof GL.assetSelect[entry]==='undefined') {
          GL.assetSelect[entry] = true;
        }
      }
    }
    var output = '<div class="table">';
    output += '<div class="thead">';
    output +='<div class="tr">';
    output += '<div class="th col1">Asset</div>';
    output += '<div class="th col2" style="text-align:right;">Add / remove</div>';
    output += '</div>';
    output += '</div>';
    output += '<div class="tbody">';
    var element;
    for (var entry in list) {
      if(typeof search === 'undefined' || entry.toLowerCase().indexOf(search) !== -1 || list[entry].toLowerCase().indexOf(search) !== -1 ) {
        element = entry.replace('.','-');
        output += '<div class="tr">';
        output += '<div class="td col1"><div class="icon">'+svg['circle']+'</div><div class="asset">'+entry.toUpperCase()+'</div><div class="full-name">'+list[entry]+'</div></div>';
        output += '<div class="td col2 actions"><div class="assetbuttons assetbuttons-'+element+'">'+renderManageButton(element,entry,(GL.assetSelect[entry]?1:0))+'</div></div>';
        output += '</div>';
      }
    }
    output+='</div></div>';
    $('#manage-assets .data').html(output); // insert new data into DOM
  }
  renderManageButton = function renderManageButton(element,asset,active) {
    return '<a onclick="changeManageButton(\''+element+'\',\''+asset+'\','+(active?0:1)+');" class="pure-button '+(active?'pure-button-error selectedAsset':'pure-button-success')+'" role="button"><div class="actions-icon">'+(active?svg['remove']:svg['add'])+'</div>'+(active?'Remove':'Add')+'</a>';
  }
  changeManageButton = function changeManageButton(element,asset,active) {
    if(active) {
      GL.assetSelect[asset] = true;
    } else {
      GL.assetSelect[asset] = false;
    }
    $('#manage-assets .assetbuttons-'+element).html( renderManageButton(element,asset,active) );
  }

  setStarredAssetClass = function(i, isStarred) {
    var id = '#' + GL.assetsStarred[i]['id'].replace(/\./g, '_');
    $(id).children('svg').toggleClass('starred', isStarred);
  }

  toggle_star = function(i) {
    var isStarred = GL.assetsStarred[i]['starred'] = !GL.assetsStarred[i]['starred'];

    storage.Get(userStorageKey('ff00-0034'), function (assetsStarred) {
      var newAssetsStarred = userDecode(assetsStarred).map(function (asset) {
        var sameOrModifiedStarredAsset = asset.id === GL.assetsStarred[i]['id']
            ? {id: GL.assetsStarred[i]['id'], starred: isStarred}
            : asset
        return sameOrModifiedStarredAsset;
      })
      storage.Set(userStorageKey('ff00-0034'), userEncode(newAssetsStarred));
    });

    setStarredAssetClass(i, isStarred);
    // storage.Set(userStorageKey('ff00-0034'), userEncode(initAssetsStarred));
  }

  fill_actions = function(asset) {
    var element = '.assets-main > .data .balance-'+asset.replace(/\./g,'-');
    $('#action-actions #ModalLabel').html(asset.toUpperCase());
    $('#action-actions .balance').html($(element).html().toUpperCase());
    var output = '';
    output+='<a onclick=\'fill_send("'+asset+'");\' href="#action-send" class="pure-button pure-button-large pure-button-fw pure-button-primary" role="button" data-dismiss="modal" data-toggle="modal">Send</a>';
    output+='<a onclick=\'fill_recv("'+asset+'");\' href="#action-receive" class="pure-button pure-button-large pure-button-fw pure-button-secondary" role="button" data-dismiss="modal" data-toggle="modal">Receive</a>';
    output+='<a href="#action-advanced" class="pure-button pure-button-grey pure-button-large pure-button-fw advanced-button" role="button" data-dismiss="modal" data-toggle="modal"><div class="advanced-icon">'+svg['advanced']+'</div>Advanced</a>';
    $('#action-actions .buttons').html(output);
  }
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
      $('#action-send .modal-send-networkfee').html(formatFloat(assets.fees[asset])+' '+asset.split('.')[0].toUpperCase());
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
                  var assetbuttons = '.assets-main > .data .assetbuttons-'+balance.asset[i].replace(/\./g,'-');
                  if(object.data!==null && !isNaN(object.data)){
                    $(assetbuttons).delay(1000).removeClass('disabled');
                    $(assetbuttons+' a').removeAttr('disabled');
                    $(assetbuttons+' a').attr('data-toggle', 'modal');
                    $(element).attr('amount',object.data);
                    object.data = UItransform.formatFloat(object.data);
                  } else {
                    $(assetbuttons).addClass('disabled');
                    $(assetbuttons+' a').removeAttr('data-toggle');
                    $(element).attr('amount','?');
                    object.data = '?';
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
