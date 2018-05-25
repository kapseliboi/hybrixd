var U = utils;
var Icons = black;
var Svg = svg
var A = asset;
// User interface transformations
UItransform = {
  txStart: function () {
    loadSpinner();
    document.querySelector('#action-send .pure-button-send').classList.add('pure-button-disabled');
    document.querySelector('#action-send .pure-button-send').classList.remove('pure-button-primary');
    document.querySelector('#action-send').style.opacity = '0.7';
  },
  txStop: function () {
    stopSpinner();
    document.querySelector('#action-send .pure-button-send').classList.remove('pure-button-disabled');
    document.querySelector('#action-send .pure-button-send').classList.add('pure-button-primary');
    document.querySelector('#action-send').style.opacity = '1';
  },
  txHideModal: function () {
    document.querySelector('#action-send').style.opacity = 1;
    $('#action-send').modal('hide');
  },
  setBalance: function (element, setBalance) { document.querySelector(element).innerHTML = setBalance; },
  deductBalance: function (element, assetID, newBalance) {
    document.querySelector(element).innerHTML = ('<span style="color:#6B6;">' + String(newBalance)) + '</span>';
    renderDollarPriceInAsset(assetID, newBalance);
  }
};

// Render sequence
displayAssets = function (args) {
  return function () {
    var globalAssets = GL.assets;
    document.querySelector('.assets-main > .data').innerHTML = mkHtmlToRender(GL.assets);
    globalAssets.forEach(function (asset) { setStarredAssetClass(R.prop('id', asset), R.prop('starred', asset)); });
    U.scrollToAnchor(args);
    retrieveBalanceStream.subscribe(function (_) { renderBalances(globalAssets); });
  };
};

var stopBalanceStream = Rx.Observable
    .fromEvent(document.querySelector('#topmenu-dashboard'), 'click');

var retrieveBalanceStream = Rx.Observable
    .interval(30000)
    .startWith(0)
    .takeUntil(stopBalanceStream);

function mkHtmlToRender (assets) {
  return R.compose(
    mkAssetsInterfaceHtmlStr,
    R.reduce(A.mkAssetHTML, '')
  )(assets);
}

function mkAssetsInterfaceHtmlStr (assetsHTMLStr) {
  return '<div class="table">' +
    '<div class="thead">' +
    '<div class="tr">' +
    '<div class="th col1 asset-title">Asset</div>' +
    '<div class="th col2">Balance</div>' +
    '<div class="th col3">Valuation</div>' +
    '<div class="th col4 actions"></div>' +
    '</div>' +
    '</div>' +
    '<div class="tbody">' +
    assetsHTMLStr +
    '</div>' +
    '</div>';
}

function loadSpinner () { document.querySelector('#action-send .spinner').classList.add('active'); }
function stopSpinner () { document.querySelector('#action-send .spinner').classList.remove('active'); }
