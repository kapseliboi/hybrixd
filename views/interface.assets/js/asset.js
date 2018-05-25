asset = {
  mkAssetHTML: function  (str, asset) {
    var assetID = R.prop('id', asset);
    var symbolName = R.prop('symbol', asset);

    var element = assetID.replace(/\./g, '-');
    var maybeStarActive = ' id="' + assetID.replace(/\./g, '_') + '" onclick=toggleStar("' + assetID + '") ';
    var icon = R.prop('icon', asset);

    var assetInfoHTMLStr = '<div id="asset-' + element + '" class="td col1 asset asset-' + element + '"><div class="icon">' + icon + '</div>' + assetID + '<div class="star"><a' + maybeStarActive + 'role="button">' + R.prop('star', Svg) + '</a></div></div>';
    var assetBalanceHtmlStr = '<div class="td col2"><div class="balance balance-' + element + '">' + progressbar() + '</div></div>';
    var assetDollarValuationHtmlStr = '<div class="td col3"><div id="' + symbolName + '-dollar" class="dollars" style="color: #AAA;">n/a</div></div>';
    var assetSendBtnHtmlStr = '<a onclick=\'fillSend("' + assetID + '");\' href="#action-send" class="pure-button pure-button-large pure-button-primary" role="button" data-toggle="modal" disabled="disabled"><div class="icon">' + R.prop('send', Svg) + '</div>Send</a>';
    var assetReceiveBtnHtmlStr = '<a onclick=\'receiveAction("' + assetID + '");\' href="#action-receive" class="pure-button pure-button-large pure-button-secondary" role="button" data-toggle="modal" disabled="disabled"><div class="icon">' + R.prop('receive', Svg) + '</div>Receive</a>';

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
};
