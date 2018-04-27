var Valuations = valuations;

// User interface transformations
UItransform = {
  formatFloat : function (amount, maxLengthSignificantDigits) {
    if(isNaN(amount)) {
      return '?';
    } else {
      var balance = bigNumberToString((toInt(amount)));
      var trailingHtmlStr = balance.length > maxLengthSignificantDigits ? '<span>&hellip;</span>' : '';
      var normalizedBalanceStr = balance === "0" ? '0' : balance.substr(0, maxLengthSignificantDigits) + trailingHtmlStr
      return normalizedBalanceStr;
    }
  },
  txStart : function() {
    loadSpinner();
    document.querySelector('#action-send .pure-button-send').classList.add('pure-button-disabled')
    document.querySelector('#action-send .pure-button-send').classList.remove('pure-button-primary');
    document.querySelector('#action-send').style.opacity = '0.7';
  },
  txStop : function() {
    stopSpinner();
    document.querySelector('#action-send .pure-button-send').classList.remove('pure-button-disabled')
    document.querySelector('#action-send .pure-button-send').classList.add('pure-button-primary');
    document.querySelector('#action-send').style.opacity = '1';
  },
  txHideModal : function () { $('#action-send').css('opacity', '1').modal('hide') }, // TODO: REMOVE JQUERY HERE. SOMEWHAT ANNOYING!!!! Modal refers to jquery plugin
  setBalance : function (element, setBalance) { document.querySelector(element).innerHTML = setBalance; },
  deductBalance : function (element,newBalance) { document.querySelector(element).innerHTML = ('<span style="color:#6B6;">' + String(newBalance)) + '</span>';
  }
}

$(".clearable").each(function() {

  var $inp = $(this).find("input:text"),
      $cle = $(this).find(".clearable__clear");

  $inp.on("input", function(){
    $cle.toggle(!!this.value);
  });

  $cle.on("touchstart click", function(e) {
    e.preventDefault();
    $inp.val("").trigger("input");
  });

});

displayAssets = function displayAssets() {
  balance = {}
  balance.asset = [];
  balance.amount = [];
  balance.lasttx = [];

  // create asset table
  function mkDashboardHtmlStr (assetsHTMLStr) {
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

  var htmlToRender = R.compose(
    mkDashboardHtmlStr,
    R.prop('str'),
    R.reduce(mkHtmlForAssets, {i: 0, str: ''}),
    R.map(R.prop('id'))
  )(GL.assets);

  function mkHtmlForAssets (acc, assetID) {
    var symbolName = assetID.slice(assetID.indexOf('.') + 1);
    balance.asset[acc.i] = assetID;
    balance.amount[acc.i] = 0;
    balance.lasttx[acc.i] = 0;

    var maybeAsset = GL.assets.find(function (starred) {
      return starred.id === balance.asset[acc.i];
    });

    var element = balance.asset[acc.i].replace(/\./g,'-');
    var maybeStarActive = maybeAsset === undefined ? '' : ' id="' + maybeAsset['id'].replace(/\./g, '_') + '" onclick=toggle_star(' + acc.i + ') ';
    var balanceInDollars = Valuations.renderDollarPrice(symbolName, balance.amount[acc.i]);
    var icon = (symbolName in black.svgs) ? black.svgs[symbolName] : mkSvgIcon(symbolName);

    var assetInfoHTMLStr = '<div id="asset-' + element + '" class="td col1 asset asset-' + element + '"><div class="icon">' + icon + '</div>' + assetID + '<div class="star"><a' + maybeStarActive + 'role="button">' + svg['star'] + '</a></div></div>';
    var assetBalanceHtmlStr = '<div class="td col2"><div class="balance balance-' + element + '">' + progressbar() + '</div></div>';
    var assetDollarValuationHtmlStr = '<div class="td col3"><div id="' + symbolName + '-dollar" class="dollars" style="color: #AAA;">n/a</div></div>';
    var assetSendBtnHtmlStr = '<a onclick=\'fill_send("' + assetID + '");\' href="#action-send" class="pure-button pure-button-large pure-button-primary" role="button" data-toggle="modal" disabled="disabled"><div class="icon">' + svg['send'] + '</div>Send</a>'
    var assetReceiveBtnHtmlStr = '<a onclick=\'fill_recv("' + assetID + '");\' href="#action-receive" class="pure-button pure-button-large pure-button-secondary" role="button" data-toggle="modal" disabled="disabled"><div class="icon">' + svg['receive'] + '</div>Receive</a>'

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

    return { i: R.add(acc.i, 1), str: R.concat(acc.str, htmlToRender) };
  }
  // refresh assets
  var assetDetail = {
    i: i,
    balance: balance,
    path: path
  }

  uiAssets(balance)(assetDetail);
  intervals = setInterval(function () { uiAssets(balance)(assetDetail); }, 30000); // TODO: Replace this with Rx interval. Now it breaks sometimes.....

  document.querySelector('.assets-main > .data').innerHTML = htmlToRender; // insert new data into DOM
  GL.assets.forEach(function (asset, i) { setStarredAssetClass(i, R.prop('starred', asset)); });
  scrollToAnchor();
};

// main asset management code
$(document).ready(function () {
  document.querySelector('.assets-main .spinner-loader').classList.add('disabled-fast');
  setTimeout(displayAssets, 500); // Render new HTML string in DOM. 500 sec delay for fadeout. Should separate concern!
});

function loadSpinner () { document.querySelector('#action-send .spinner').classList.add('active'); };
function stopSpinner () { document.querySelector('#action-send .spinner').classList.remove('active'); };
