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
  var hasStarredAssets = R.any(R.propEq('starred', true), assets);
  var renderAssets = hasStarredAssets && R.not(R.isEmpty(assets));
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
    assets.forEach(U.retrieveBalance(renderDataInDom, 5, '.dashboard-balances > .data > .balance > .balance-'));
  });
}
