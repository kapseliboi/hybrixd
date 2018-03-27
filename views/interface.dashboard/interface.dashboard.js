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
    balance = {};
    balance.asset = [];
    balance.amount = [];
    balance.lasttx = [];

    // query storage for active assets
    if(typeof GL.assetsActive === 'undefined') {
      storage.Get( userStorageKey('ff00-0033') , function(crypted) {
        GL.assetsActive = userDecode(crypted);
        ;
        ;
        // query storage for dash assets
        if(typeof GL.assetsStarred === 'undefined') {
          storage.Get( userStorageKey('ff00-0034') , function(crypted) {
            GL.assetsStarred = userDecode(crypted);
            // init asset display
            displayAssets();
          });
        }
      });
    } else {
      displayAssets();
    }
  });
}

function displayAssets() {

  if(GL.assetsActive == null || typeof GL.assetsActive !== 'object') {
    GL.assetsActive = ["btc","eth"];
  }

  // Assets active in Dashboard
  if(GL.assetsStarred === null || typeof GL.assetsStarred !== 'object') {
    var initAssetsStarred = GL.assetsActive.map((asset) => ({id: asset, starred: false}));

    GL.assetsStarred = initAssetsStarred;

    storage.Set(userStorageKey('ff00-0034'), userEncode(initAssetsStarred));
  }

  // Finds any unmatched assets between active and starred and returns a starred object if any are found
  var unmatchedStarredAssets = GL.assetsActive.filter(function (asset) {
    return GL.assetsStarred.find(function (starred) {
      return starred.id === asset
    }) === undefined;
  }).map((asset) => ({id: asset, starred: false}));

  GL.assetsStarred.concat(unmatchedStarredAssets)

  // Below code does not work properly when GL.assetsActive has not been initialized properly.
  // For now, this fix: user can only go to Assets view when GL.assetsActive has been populated.
  $('#topmenu-assets').click(function () {
    fetchview('interface.assets', pass_args);
  })

  $('#topmenu-assets').addClass('active');

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
                    initAsset(entry,GL.assetmodes[entry]);
                  },(100*i)+defer,entry);
                  // if all assets inits are called run
                  if(i===GL.assetsActive.length) {
                    // create asset elements that are selected to show in dashboard
                    var hasStarredAssets = GL.assetsStarred.reduce(function (b, asset) {
                      return asset.starred ? asset.starred : b;
                    }, false)

                    var starredAssetsHTML = GL.assetsStarred.reduce(mkHtmlForStarredAssets, {i: 0, str: ''}).str
                    var noStarredAssetsHTML = '<p>No starred assets found. <br>You can star your favorite assets in the Asset tab to make them appear here. <br><br><a class="pure-button pure-button-primary" onclick="fetchview(\'interface.assets\', pass_args);"><span>Go to My Assets</span></a></p>';

                    function mkHtmlForStarredAssets (acc, asset) {
                      var index = acc.i;
                      var hyphenizedID = asset.id.replace(/\./g,'-');
                      var assetElementID = 'asset-' + hyphenizedID;
                      var str = asset.starred
                          ? acc.str + '<div onclick="fetchview(\'interface.assets\',{user_keys: pass_args.user_keys, nonce: pass_args.nonce, asset:\'' + asset.id + '\', element: \'' + assetElementID + '\'});" class="balance"><h5>'+ asset.id + '</h5><div class="divider"></div><h3 class="balance balance-' + hyphenizedID + '">' + progressbar()+'</h3></div>'
                          : acc.str;
                      return {i: acc.i + 1, str: str};
                    }

                    $('.dashboard-balances .spinner-loader').fadeOut('slow', function () {
                      $('.dashboard-balances > .data').html(hasStarredAssets
                                                            ? starredAssetsHTML
                                                            : noStarredAssetsHTML)// insert new data into DOM
                    })
                  }
                }

                var getBalances = function (balance, assets) {
                  // This would depend on the viewpath --> Why would you want to load all of a users'
                  // assets when you only display starred ones?
                  var assetsToCheck = false ? 'assetsActive' : 'assetsStarred';
                  GL[assetsToCheck].forEach(function (asset) {
                    var element = '.dashboard-balances > .data > .balance > .balance-' + asset.id.replace(/\./g, '-');
                    setTimeout(function () {
                      hybriddcall({r: 'a/' + asset.id + '/balance/' + assets.addr[asset.id], z: 0}, element, function (object) {
                        if(typeof object.data === 'string') {
                          object.data = UItransform.formatFloat(object.data);

                        }
                        return object;
                      })
                    }, i*500);
                    // DEBUG: console.log('ASSET CALL: a/'+balance.asset[i]+'/balance/'+assets.addr[balance.asset[i]]);
                  })
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
