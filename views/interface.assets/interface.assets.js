import { balance } from './../interface/js/Balance/balance.js';
import { generateAddress } from './js/GenerateAddress/generateAddress.js';
import { interfaceStreams } from './../interface/interface.js';
import { receiveAsset } from './js/ReceiveAsset/receiveAsset.js';
import { sendAsset } from './js/SendAsset/sendAsset.js';
import { transactionValidations } from './js/Transaction/validations.js';
import { valuations } from './../interface/js/valuations.js';
import { manageAssets } from './js/ManageAssets/manageAssets.js';
import { utils_ } from './../index/utils.js';
import { asset } from './js/Asset/asset.js';
import { setStarredAssetClass } from './js/StarredAsset/starredAssets.js';
import { mkHtmlToRender } from './interface.assets.ui.js';
import { searchBar } from './js/SearchBar/searchBar.js';

import { from } from 'rxjs/observable/from';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { interval } from 'rxjs/observable/interval';
import { merge } from 'rxjs/observable/merge';
import { map, startWith, takeUntil, tap } from 'rxjs/operators';

import * as R from 'ramda';

var BALANCE_RETRIEVAL_INTERVAL_MS = 30000;
var AMOUNT_OF_SIGNIFICANT_DIGITS = 11;

init.interface.assets = function (args) {
  // Expose functions globally
  manageAssets.changeManageButton(manageAssets.renderManageButton);
  window.changeManageButton = manageAssets.changeManageButton(manageAssets.renderManageButton); // TODO: Remove messy callback structure...... // TODO: STREAMIFY!
  window.manageAssets = manageAssets.manageAssets; // TODO: STREAMIFY!
  utils_.setViewTab('assets'); // top menu UI change
  utils_.documentReady(main(args));
};

function main (args) {
  return function () {
    var globalAssets = GL.assets;
    document.querySelector('.assets-main > .data').innerHTML = mkHtmlToRender(globalAssets);
    globalAssets.forEach(function (asset) { setStarredAssetClass(R.prop('id', asset), R.prop('starred', asset)); });
    utils_.scrollToAnchor(args);
    initializeAssetsInterfaceStreams(globalAssets);
  };
}

function initializeAssetsInterfaceStreams (assets) {
  var assetsIDs = R.map(R.prop('id'), assets);
  var sendAssetButtonStream = mkAssetButtonStream('sendAssetButton');
  var receiveAssetButtonStream = mkAssetButtonStream('receiveAssetButton');
  var generateAddressButtonStream = mkAssetButtonStream('generateAddressButton');
  var saveAssetListStream = fromEvent(document.querySelector('#save-assetlist'), 'click');
  var maxAmountButtonStream = fromEvent(document.querySelector('.max-amount-button'), 'click');
  var stopBalanceStream = fromEvent(document.querySelector('#topmenu-dashboard'), 'click');
  var retrieveBalanceStream = interval(BALANCE_RETRIEVAL_INTERVAL_MS)
    .pipe(
      startWith(0),
      takeUntil(merge(
        stopBalanceStream,
        interfaceStreams.logOutStream
      ))
    );
  var renderBalancesStream = balance.mkRenderBalancesStream(retrieveBalanceStream, '.assets-main > .data .balance-', AMOUNT_OF_SIGNIFICANT_DIGITS, assetsIDs);
  renderBalancesStream.subscribe();
  renderBalancesStream
    .pipe(
      tap(updateGlobalAssetsAndRenderDataInDOM)
    )
    .subscribe();
  maxAmountButtonStream.subscribe(function (_) {
    var sendBalance = document.querySelector('#action-send .modal-send-balance').innerHTML;
    document.querySelector('#modal-send-amount').value = sendBalance;
  });
  saveAssetListStream.subscribe(manageAssets.saveAssetList(main()));
  sendAssetButtonStream.subscribe(function (assetID) {
    sendAsset.renderAssetDetailsInModal(assetID);
    transactionValidations.toggleSendButtonClass();
  });
  receiveAssetButtonStream.subscribe(function (assetID) {
    receiveAsset.renderAssetDetailsInModal(assetID);
  });
  generateAddressButtonStream.subscribe(function (assetID) {
    generateAddress.render(assetID);
  });
  searchBar.clearSearchBarStream.subscribe();
  searchBar.searchBarStream.subscribe(searchBar.renderManageAssets);
  searchBar.searchAssetsStream.subscribe(searchBar.clearInputBtn);
}

function mkAssetButtonStream (query) {
  var queries = document.querySelectorAll('.' + query);
  return R.equals(R.length(queries), 0)
    ? from([])
    : fromEvent(queries, 'click')
      .pipe(
        map(R.path(['target', 'attributes', 'data', 'value']))
      );
}

function updateGlobalAssetsAndRenderDataInDOM (balanceData) {
  var elem = R.prop('element', balanceData);
  var id = R.prop('assetID', balanceData);
  var n = R.prop('amountStr', balanceData);
  asset.toggleAssetButtons(elem, id, Number(n));
  renderDollarPriceInAsset(id, Number(n));
}

window.renderDollarPriceInAsset = function (asset, amount) {
  var symbolName = asset.slice(asset.indexOf('.') + 1);
  var assetDollarPrice = valuations.renderDollarPrice(symbolName, amount);
  var query = document.getElementById(symbolName + '-dollar');
  if (query !== null) { query.innerHTML = assetDollarPrice; }
};

init.interface.assets({});
