var Valuations = valuations;

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
  txHideModal: function () { $('#action-send').css('opacity', '1').modal('hide'); }, // TODO: REMOVE JQUERY HERE. SOMEWHAT ANNOYING!!!! Modal refers to jquery plugin
  setBalance: function (element, setBalance) { document.querySelector(element).innerHTML = setBalance; },
  deductBalance: function (element, newBalance) { document.querySelector(element).innerHTML = ('<span style="color:#6B6;">' + String(newBalance)) + '</span>'; }
};

displayAssets = function () {
  // Render sequence
  document.querySelector('.assets-main > .data').innerHTML = mkHtmlToRender(GL.assets);
  GL.assets.forEach(function (asset) { setStarredAssetClass(R.prop('id', asset), R.prop('starred', asset)); });
  scrollToAnchor();
  retrieveBalanceStream.subscribe(function (_) { uiAssets(); });
};

function mkHtmlToRender (assets) {
  return R.compose(
    mkAssetsInterfaceHtmlStr,
    R.reduce(mkHtmlForAssets, '')
  )(assets);
}

var stopBalanceStream = Rx.Observable
  .fromEvent(document.querySelector('#topmenu-dashboard'), 'click');

var retrieveBalanceStream = Rx.Observable
  .interval(30000)
  .startWith(0)
  .takeUntil(stopBalanceStream);

function mkHtmlForAssets (str, asset) {
  var assetID = R.prop('id', asset);
  var symbolName = assetID.slice(assetID.indexOf('.') + 1);

  var element = assetID.replace(/\./g, '-');
  var maybeStarActive = ' id="' + assetID.replace(/\./g, '_') + '" onclick=toggleStar("' + assetID + '") ';
  var icon = (symbolName in black.svgs) ? black.svgs[symbolName] : mkSvgIcon(symbolName);

  var assetInfoHTMLStr = '<div id="asset-' + element + '" class="td col1 asset asset-' + element + '"><div class="icon">' + icon + '</div>' + assetID + '<div class="star"><a' + maybeStarActive + 'role="button">' + svg['star'] + '</a></div></div>';
  var assetBalanceHtmlStr = '<div class="td col2"><div class="balance balance-' + element + '">' + progressbar() + '</div></div>';
  var assetDollarValuationHtmlStr = '<div class="td col3"><div id="' + symbolName + '-dollar" class="dollars" style="color: #AAA;">n/a</div></div>';
  var assetSendBtnHtmlStr = '<a onclick=\'fillSend("' + assetID + '");\' href="#action-send" class="pure-button pure-button-large pure-button-primary" role="button" data-toggle="modal" disabled="disabled"><div class="icon">' + svg['send'] + '</div>Send</a>';
  var assetReceiveBtnHtmlStr = '<a onclick=\'receiveAction("' + assetID + '");\' href="#action-receive" class="pure-button pure-button-large pure-button-secondary" role="button" data-toggle="modal" disabled="disabled"><div class="icon">' + svg['receive'] + '</div>Receive</a>';

  var htmlToRender = '<div class="tr">' +
                          assetInfoHTMLStr +
                          assetBalanceHtmlStr +
                          assetDollarValuationHtmlStr +
                          '<div class="td col4 actions">' +
                            '<div class="assetbuttons assetbuttons-' + element + ' disabled">' +
                               assetSendBtnHtmlStr +
                               assetReceiveBtnHtmlStr +
                            '</div>' +
                          '</div>' +
                       '</div>';

  return str + htmlToRender;
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

function loadSpinner () { document.querySelector('#action-send .spinner').classList.add('active'); };
function stopSpinner () { document.querySelector('#action-send .spinner').classList.remove('active'); };

$(document).ready(function () {
  displayAssets();
});
