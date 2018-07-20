import utils_ from '../index/utils.js';
import asset from './js/Asset/asset';

import R from 'ramda';

// User interface transformations
UItransform = {
  txStart: function () {
    loadSpinner();
    document.querySelector('#action-send .pure-button-send').classList.add('pure-button-disabled');
    document.querySelector('#action-send .pure-button-send').classList.remove('pure-button-primary');
    document.querySelector('#action-send .pure-button-cancel-tx').classList.add('pure-button-disabled');
    document.querySelector('#action-send').style.opacity = '0.7';
  },
  txStop: function () {
    stopSpinner();
    document.querySelector('#action-send .pure-button-send').classList.remove('pure-button-disabled');
    document.querySelector('#action-send .pure-button-send').classList.add('pure-button-primary');
    document.querySelector('#action-send .pure-button-cancel-tx').classList.remove('pure-button-disabled');
    document.querySelector('#action-send').style.opacity = '1';
  },
  txHideModal: function () {
    document.querySelector('#action-send').style.opacity = 1;
    $('#action-send').modal('hide');
  },
  deductBalance: function (element, assetID, newBalance) {
    // TODO: Validate balance String here.
    document.querySelector(element).innerHTML = '<span style="color:#6B6;">' + utils_.formatFloatInHtmlStr(String(newBalance), 11) + '</span>';
    renderDollarPriceInAsset(assetID, newBalance); // TODO: export!
    R.compose(
      utils_.updateGlobalAssets,
      R.reduce(R.curry(updateAssetBalanceData)(assetID, newBalance), [])
    )(GL.assets);
  }
};

function updateAssetBalanceData (id, amount, newAssets, a) {
  var lastTxLens = R.lensPath(['balance', 'lastTx']);
  var newBalanceLens = R.lensPath(['balance', 'amount']);
  return R.compose(
    R.flip(R.append)(newAssets),
    R.when(
      R.propEq('id', id),
      R.compose(
        R.set(lastTxLens, Date.now()),
        R.set(newBalanceLens, amount)
      )
    )
  )(a);
}

export function mkHtmlToRender (assets) {
  return R.compose(
    mkAssetsInterfaceHtmlStr,
    R.reduce(asset.mkAssetHTML, '')
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
