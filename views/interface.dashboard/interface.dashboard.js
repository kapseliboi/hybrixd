var Utils = utils;
var H = hybridd;

init.interface.dashboard = function (args) {
  document.querySelector('#userID').innerHTML = args.userid; // set user ID field in top bar
  topmenuset('dashboard'); // top menu UI change --> Sets element to active class
  Utils.documentReady(main);
};

function main () {
  var deterministicHashesUrl = '/s/deterministic/hashes';
  var deterministicHashesHybriddCallStream = H.mkHybriddCallStream(deterministicHashesUrl);

  deterministicHashesHybriddCallStream.subscribe(function (_) {
    renderStarredAssets(GL.assets);
    setIntervalFunctions(GL.assets);
  });
}

function renderStarredAssets (assets) {
  var hasStarredAssets = R.any(R.prop('starred'), assets);
  var renderAssets = hasStarredAssets || R.not(R.isEmpty(assets));
  var starredAssetsHTML = R.reduce(mkHtmlForStarredAssets, '', assets);

    var htmlToRender = renderAssets
        ? starredAssetsHTML
        : noStarredAssetsHTML;

    document.querySelector('.dashboard-balances .spinner-loader').classList.add('disabled-fast');
    setTimeout(() => { document.querySelector('.dashboard-balances > .data').innerHTML = htmlToRender; }, 500); // Render new HTML string in DOM. 500 sec delay for fadeout. Should separate concern!
  }

function setIntervalFunctions (assets) {
  var retrieveBalanceStream = Rx.Observable
      .interval(60000)
      .startWith(0);

  retrieveBalanceStream.subscribe(function (_) {
    assets.forEach(renderBalanceThroughHybridd);
  });
}

function renderBalanceThroughHybridd (asset) {
  var assetID = asset.id;
  var assetAddress = asset.address;
  var hypenizedID = assetID.replace(/\./g, '-');
  var element = '.dashboard-balances > .data > .balance > .balance-' + hypenizedID;
  var url = 'a/' + asset.id + '/balance/' + assetAddress;

  var balanceStream = H.mkHybriddCallStream(url)
      .map(data => {
        if (R.isNil(data.stopped) && data.progress < 1) throw data;
        return data;
      })
      .retryWhen(function (errors) { return errors.delay(100); });

  balanceStream.subscribe(function (balanceData) {
    var sanitizedData = R.compose(
      R.prop('data'),
      sanitizeServerObject
    )(balanceData);

    renderDataInDom(element, 5, sanitizedData);
  });
}
