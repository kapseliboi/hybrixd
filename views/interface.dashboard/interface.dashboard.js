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

function mkHybriddCallStream (url) {
  var hybriddCallStream = Rx.Observable
      .fromPromise(hybriddcall({r: url, z: true}))
      .filter(R.propEq('error', 0))
      .map(R.merge({r: url, z: true}));

  var hybriddCallResponseStream = hybriddCallStream
      .flatMap(function (properties) {
        return Rx.Observable
          .fromPromise(hybriddReturnProcess(properties));
      });

  return hybriddCallResponseStream;
}

function displayAssets () {
  var deterministicHashesUrl = '/s/deterministic/hashes';
  var deterministicHashesHybriddCallStream = mkHybriddCallStream(deterministicHashesUrl);

  deterministicHashesHybriddCallStream.subscribe(function (_) {
    GL.assets.forEach(initializeBalances);
    renderStarredAssets(GL.assets);
    setIntervalFunctions(balance, GL.assets);
  });
}

function renderStarredAssets (assets) {
    var hasStarredAssets = R.any(R.prop('starred'), assets);
    var renderAssets = hasStarredAssets || R.not(R.isEmpty(assets));

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
  var balanceStream = mkHybriddCallStream(url)
      .map(data => {
        if (R.isNil(data.stopped) && data.progress < 1) throw data;
        return data;
      })
      .retryWhen(function (errors) { return errors.delay(100); });

  balanceStream.subscribe(returnedObjectFromServer => {
    var sanitizedData = sanitizeServerObject(returnedObjectFromServer).data;
    renderDataInDom(element, 5, sanitizedData);
  });
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
function fetchAssetsViews (args) { return function () { fetchview('interface.assets', args); }; }
