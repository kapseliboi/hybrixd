var noStarredAssetsHTML = '<p>No starred assets found. <br>You can star your favorite assets in the Asset tab to make them appear here. <br><br><a class="pure-button pure-button-primary" onclick="fetchview(\'interface.assets\', pass_args);"><span>Go to My Assets</span></a></p>';

init.interface.dashboard = function (args) {
  $("#userID").html(args.userid); // set user ID field in top bar // Save in STATE
  topmenuset('dashboard'); // top menu UI change --> Sets element to active class
  clearInterval(intervals); // clear all active intervals
  loadinterval = ''; // F-ING GLOBAL BS

  // do stuff the dashboard should do...
  $(document).ready(main);
};

// TODO: This will mostly be obsolete with the new data model!
function matchAssets () {
  if (GL.assetsActive == null || typeof GL.assetsActive !== 'object') {
    GL.assetsActive = ['btc', 'eth'];
  }

  // Assets active in Dashboard
  if (GL.assetsStarred === null || typeof GL.assetsStarred !== 'object') {
    var initAssetsStarred = GL.assetsActive.map((asset) => ({id: asset, starred: false}));

    GL.assetsStarred = initAssetsStarred;

    storage.Set(userStorageKey('ff00-0034'), userEncode(initAssetsStarred));
  }

  // Finds any unmatched assets between active and starred and returns a starred object if any are found
  var unmatchedStarredAssets = GL.assetsActive.filter(function (asset) {
    return GL.assetsStarred.find(function (starred) {
      return starred.id === asset;
    }) === undefined;
  }).map(function (asset) {
    return {id: asset, starred: false};
  });

  GL.assetsStarred.concat(unmatchedStarredAssets);
}

function displayAssets () {
  matchAssets();
  // Below code does not work properly when GL.assetsActive has not been initialized properly.
  // For now, this fix: user can only go to Assets view when GL.assetsActive has been populated.
  document.querySelector('#topmenu-assets').onclick = fetchAssetsViews(pass_args);
  document.querySelector('#topmenu-assets').classList.add('active');

  hybriddcall({r: '/s/deterministic/hashes', z: 1}, null, processDataAndRenderAndStuff); // initialize all assets
};

function processDataAndRenderAndStuff (object, passdata) {
  assets.modehashes = object.data;
  GL.assetsActive.map(renderDOMStuff);
  setIntervalFunctions(balance, GL.assetsStarred);
}

function setIntervalFunctions (balance, assets) {
  intervals = setInterval(function () { getBalances(assets); }, 60000); // regularly fill 5 asset elements with balances
  loadinterval = setInterval(checkIfAssetsAreLoaded(balance, assets), 500); // check if assets are loaded by hybriddcall
}

function renderDOMStuff (entry, i) {
  balance.asset[i] = entry;
  balance.amount[i] = 0;

  // initializeDeterministicEncryptionRoutines(entry, i);
  // if all assets inits are called run
  if (i === GL.assetsActive.length - 1) { renderStarredHTML(GL.assetsStarred); }
}

// TODO Move this up to just after login, when retrieving hash, modes, etc
function initializeDeterministicEncryptionRoutines (entry, i) {
  // get and initialize deterministic encryption routines for assets
  // timeout used to avoid double downloading of deterministic routines
  var assetIsInitialized = assets.init.indexOf(GL.assetmodes[entry].split('.')[0]) === -1;
  var defer = (assetIsInitialized ? 0 : 3000);
  assets.init.push(GL.assetmodes[entry].split('.')[0]); // ASSETS.INIT IS NOT BEING USED!!!!!!!!
  setTimeout(initializeAsset, (100 * i) + defer, entry);
}

function renderStarredHTML (starredAssets) {
  // TODO R.all
  var hasStarredAssets = starredAssets.reduce(function (b, asset) {
    return asset.starred ? asset.starred : b;
  }, false);

  var starredAssetsHTML = GL.assetsStarred.reduce(mkHtmlForStarredAssets, {i: 0, str: ''}).str;

  $('.dashboard-balances .spinner-loader').fadeOut('slow', function () {
    $('.dashboard-balances > .data').html(hasStarredAssets
                                          ? starredAssetsHTML
                                          : noStarredAssetsHTML); // insert new data into DOM
  });
}

// TODO: Do this recursively???
function checkIfAssetsAreLoaded (balance, assets) {
  assets.forEach(function (asset, i) {
    var assetHasBalance = typeof balance.asset[i] !== 'undefined' && typeof window.assets.addr[asset] === 'undefined';
    if (assetHasBalance) {
      assets.forEach(renderBalanceThroughHybridd);
      clearInterval(loadinterval);
    }
  });
}

function getBalances (assets) {
  assets.forEach(renderBalanceThroughHybridd);
}

function renderBalanceThroughHybridd (asset, i) {
  var element = '.dashboard-balances > .data > .balance > .balance-' + asset.id.replace(/\./g, '-');
  setTimeout(function () {
    hybriddcall({r: 'a/' + asset.id + '/balance/' + window.assets.addr[asset.id], z: 0}, element, renderBalanceWithSomeGlobalEntanglement)
  }, i * 500);
}

function renderBalanceWithSomeGlobalEntanglement (object) {
  if (typeof object.data === 'string') {
    object.data = UItransform.formatFloat(object.data);
  }
  return object;
}

function main () {
  initializeBalanceGlobal();
  getActiveAndStarredAssetsFromStorage();
}

function getActiveAndStarredAssetsFromStorage () {
  if (typeof GL.assetsActive === 'undefined') {
    storage.Get( userStorageKey('ff00-0033'), function (crypted) {
      GL.assetsActive = userDecode(crypted);
      // query storage for dash assets
      if(typeof GL.assetsStarred === 'undefined') {
        storage.Get( userStorageKey('ff00-0034'), function (crypted) {
          GL.assetsStarred = userDecode(crypted);
          // init asset display
          displayAssets();
        });
      }
    });
  } else {
    displayAssets();
  }
}

function initializeBalanceGlobal () {
  balance = {
    asset: [],
    amount: [],
    lasttx: []
  };
}

function initializeAsset (entry, passdata) {
  initAsset(entry, GL.assetmodes[entry]);
}

function fetchAssetsViews (args) {
  return function () {
    fetchview('interface.assets', args);
  };
}
