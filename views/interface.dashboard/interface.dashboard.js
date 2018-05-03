var U = utils;
var H = hybridd;

init.interface.dashboard = function (args) {
  document.querySelector('#userID').innerHTML = args.userid; // set user ID field in top bar
  topmenuset('dashboard'); // top menu UI change --> Sets element to active class
  U.documentReady(main);
};

function main () {
  var deterministicHashesUrl = '/s/deterministic/hashes';
  var deterministicHashesHybriddCallStream = H.mkHybriddCallStream(deterministicHashesUrl);

  deterministicHashesHybriddCallStream.subscribe(function (_) {
    console.log("_ = ", _);
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

var stopBalanceStream = Rx.Observable
    .fromEvent(document.querySelector('#topmenu-assets'), 'click');

var retrieveBalanceStream = Rx.Observable
    .interval(60000)
    .startWith(0)
    .delay(500) // HACK! Delay balance retrieval somewhat. Retrieval is sometimes faster than DOM rendering, so can't render right away.....
    .takeUntil(stopBalanceStream);

function setIntervalFunctions (assets) {
  retrieveBalanceStream.subscribe(function (_) {
    assets.forEach(U.retrieveBalance(renderDataInDom, 5, '.dashboard-balances > .data > .balance > .balance-'));
  });
}
