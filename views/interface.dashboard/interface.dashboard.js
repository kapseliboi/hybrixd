var Utils = utils;

var noStarredAssetsHTML = '<p>No starred assets found. <br>You can star your favorite assets in the Asset tab to make them appear here. <br><br><a class="pure-button pure-button-primary" onclick="fetchview(\'interface.assets\', pass_args);"><span>Go to My Assets</span></a></p>';

init.interface.dashboard = function (args) {
  // TODO: Save in STATE
  document.querySelector('#userID').innerHTML = args.userid; // set user ID field in top bar
  topmenuset('dashboard'); // top menu UI change --> Sets element to active class
  clearInterval(intervals); // clear all active intervals
  loadinterval = ''; // F-ING GLOBAL BS

  // do stuff the dashboard should do...
  Utils.documentReady(main);
};

// function matchAssets () {
//   // Assets active
//   if (GL.assets === null || typeof GL.assets !== 'object') {
//     var initedAssets = [
//       {id: 'btc', starred: false},
//       {id: 'eth', starred: false}
//     ];

//     GL.assets = initedAssets;

//     storage.Set(userStorageKey('ff00-0034'), userEncode(initedAssets));
//   }
// }

var deterministicHashesStream = Rx.Observable
    .fromPromise(hybriddcall({r: '/s/deterministic/hashes', z: 1}))
    .filter(R.propEq('error', 0))
    .map(R.merge({r: '/s/deterministic/hashes', z: true}));

var deterministicHashesResponseStream = deterministicHashesStream
    .flatMap(function (properties) {
      return Rx.Observable
        .fromPromise(hybriddReturnProcess(properties));
    })

function displayAssets () {
  // matchAssets();
  // Below code does not work properly when GL.assetsActive has not been initialized properly.
  // For now, this fix: user can only go to Assets view when GL.assetsActive has been populated.
  document.querySelector('#topmenu-assets').onclick = fetchAssetsViews(pass_args);
  document.querySelector('#topmenu-assets').classList.add('active');

  deterministicHashesResponseStream.subscribe(function (_) {
    GL.assets.forEach(initializeBalances);
    renderStarredAssets();
    setIntervalFunctions(balance, GL.assets);
  });
}

function processDataAndRenderAndStuff (modeHashes, passdata) {
  // Needed to initialize addresses!!!!
  // initializeDeterministicEncryptionRoutines(entry, i);
  // renderStarredHTML(GL.assets); // if all assets inits are called run

  // Now loading nothing on first go, because assets haven't been retrieved from storage yet.
  GL.assets.forEach(initializeBalances);
  renderStarredAssets();
  setIntervalFunctions(balance, GL.assets);
}

function renderStarredAssets () {
    var hasStarredAssets = R.any(R.prop('starred'), GL.assets);
    var renderAssets = hasStarredAssets || R.not(R.isEmpty(GL.assets));

    var htmlToRender = renderAssets
        ? renderStarredHTML(GL.assets)
        : noStarredAssetsHTML;

    document.querySelector('.dashboard-balances .spinner-loader').classList.add('disabled-fast');
    setTimeout(() => { document.querySelector('.dashboard-balances > .data').innerHTML = htmlToRender; }, 500); // Render new HTML string in DOM. 500 sec delay for fadeout. Should separate concern!
  }

function setIntervalFunctions (balance, assets) {
  var retrieveBalanceStream = Rx.Observable
      .interval(60000)
      .map(getBalances(assets));

  // retrieveBalanceStream.subscribe()

  intervals = setInterval(function () { getBalances(assets); }, 60000); // regularly fill 5 asset elements with balances
  loadinterval = setInterval(checkIfAssetsAreLoaded(balance, assets), 500); // check if assets are loaded by hybriddcall
}

function initializeBalances (entry, i) {
  balance.asset[i] = entry;
  balance.amount[i] = 0;
  balance.lasttx[i] = 0;
}

function renderStarredHTML (starredAssets) {
  return R.compose(
    R.prop('str'),
    R.reduce(mkHtmlForStarredAssets, {i: 0, str: ''})
  )(starredAssets);
}

// TODO: Do this recursively???
function checkIfAssetsAreLoaded (balance, assets) {
  assets.forEach(function (asset, i) {
    var assetHasBalance = typeof balance.asset[i] !== 'undefined' && typeof window.assets.addr[asset] === 'undefined';
    if (assetHasBalance) {
      renderBalanceThroughHybridd(asset);
      clearInterval(loadinterval);
    }
  });
}

function renderBalanceThroughHybridd (asset) {
  var element = '.dashboard-balances > .data > .balance > .balance-' + asset.id.replace(/\./g, '-');

  var url = 'a/' + asset.id + '/balance/' + assets.addr[asset.id];
  var balanceStream = Rx.Observable
      .fromPromise(hybriddcall({r: url, z: 0}))
      .filter(R.propEq('error', 0))
      .map(R.merge({r: url, z: true}));

  var balanceResponseStream = balanceStream
      .flatMap(function (properties) {
        return Rx.Observable
          .fromPromise(hybriddReturnProcess(properties));
      })
      .map(data => {
        if (R.isNil(data.stopped) && data.progress < 1) {
          throw data; // error will be picked up by retryWhen
        }
        return data;
      })
      .retryWhen(function (errors) { return errors.delay(100); });

  balanceResponseStream.subscribe(returnedObjectFromServer => {
    var sanitizedData = sanitizeServerObject(returnedObjectFromServer).data;
    renderDataInDom(element, 5, sanitizedData);
  });
}

function renderBalanceWithSomeGlobalEntanglement (object) {
  if (typeof object.data === 'string') {
    object.data = formatFloatInHtmlStr(object.data, 5);
  }
  return object;
}

function main () {
  initializeBalanceGlobal();
  displayAssets();
}

function initializeBalanceGlobal () {
  balance = {
    asset: [],
    amount: [],
    lasttx: []
  };
}

function getBalances (assets) { assets.forEach(renderBalanceThroughHybridd); };
function initializeAsset (entry, passdata) { initAsset(entry, GL.assetmodes[entry]); }
function fetchAssetsViews (args) { return function () { fetchview('interface.assets', args); }; }
