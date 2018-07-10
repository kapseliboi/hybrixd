var Valuations = valuations;
var TxValidations = transactionValidations;
var SendAsset = sendAsset;
var ReceiveAsset = receiveAsset;
var GenerateAddress = generateAddress;
var Balance = balance;
var M = manageAssets;
var U = utils;
var A = asset;

var BALANCE_RETRIEVAL_INTERVAL_MS = 30000;
var AMOUNT_OF_SIGNIFICANT_DIGITS = 11;

init.interface.assets = function (args) {
  // Expose functions globally
  changeManageButton = M.changeManageButton(M.renderManageButton); // TODO: Remove messy callback structure......
  U.setViewTab('assets'); // top menu UI change
  U.documentReady(main(args));
};

function main (args) {
  return function () {
    var globalAssets = GL.assets;
    document.querySelector('.assets-main > .data').innerHTML = mkHtmlToRender(globalAssets);
    globalAssets.forEach(function (asset) { setStarredAssetClass(R.prop('id', asset), R.prop('starred', asset)); });
    U.scrollToAnchor(args);
    initializeAssetsInterfaceStreams(globalAssets);
  };
}

function initializeAssetsInterfaceStreams (assets) {
  var assetsIDs = R.map(R.prop('id'), assets);
  var sendAssetButtonStream = mkAssetButtonStream('sendAssetButton');
  var receiveAssetButtonStream = mkAssetButtonStream('receiveAssetButton');
  var generateAddressButtonStream = mkAssetButtonStream('generateAddressButton');
  var saveAssetListStream = rxjs.fromEvent(document.querySelector('#save-assetlist'), 'click');
  var maxAmountButtonStream = rxjs.fromEvent(document.querySelector('.max-amount-button'), 'click');
  var stopBalanceStream = rxjs.fromEvent(document.querySelector('#topmenu-dashboard'), 'click');
  var retrieveBalanceStream = rxjs
    .interval(BALANCE_RETRIEVAL_INTERVAL_MS)
    .pipe(
      rxjs.operators.startWith(0),
      rxjs.operators.takeUntil(stopBalanceStream)
    );
  var renderBalancesStream = Balance.mkRenderBalancesStream(retrieveBalanceStream, '.assets-main > .data .balance-', AMOUNT_OF_SIGNIFICANT_DIGITS, assetsIDs);
  renderBalancesStream.subscribe();
  renderBalancesStream
    .pipe(
      rxjs.operators.tap(updateGlobalAssetsAndRenderDataInDOM)
    )
    .subscribe();
  maxAmountButtonStream.subscribe(function (_) {
    var sendBalance = document.querySelector('#action-send .modal-send-balance').innerHTML;
    document.querySelector('#modal-send-amount').value = sendBalance;
  });
  saveAssetListStream.subscribe(M.saveAssetList(main()));
  sendAssetButtonStream.subscribe(function (assetID) {
    SendAsset.renderAssetDetailsInModal(assetID);
    TxValidations.toggleSendButtonClass();
  });
  receiveAssetButtonStream.subscribe(function (assetID) {
    ReceiveAsset.renderAssetDetailsInModal(assetID);
  });
  generateAddressButtonStream.subscribe(function (assetID) {
    GenerateAddress.render(assetID);
  });
}

function mkAssetButtonStream (query) {
  return rxjs.fromEvent(document.querySelectorAll('.' + query), 'click')
    .pipe(
      rxjs.operators.map(R.path(['target', 'attributes', 'data', 'value']))
    );
}

function updateGlobalAssetsAndRenderDataInDOM (balanceData) {
  var elem = R.prop('element', balanceData);
  var id = R.prop('assetID', balanceData);
  var n = R.prop('amountStr', balanceData);
  A.toggleAssetButtons(elem, id, Number(n));
  renderDollarPriceInAsset(id, Number(n));
}

function updateBalanceData (assets, assetID, amount) {
  function updateBalances (updatedAssets, asset) {
    var amountLens = R.lensPath(['balance', 'amount']);
    var updatedBalanceAsset = R.set(amountLens, amount, asset);
    var defaultOrUpdatedAsset = R.equals(R.prop('id', asset), assetID)
      ? updatedBalanceAsset
      : asset;

    return R.append(defaultOrUpdatedAsset, updatedAssets);
  }
  return R.reduce(updateBalances, [], assets);
}

function renderDollarPriceInAsset (asset, amount) {
  var symbolName = asset.slice(asset.indexOf('.') + 1);
  var assetDollarPrice = Valuations.renderDollarPrice(symbolName, amount);
  var query = document.getElementById(symbolName + '-dollar');
  if (query !== null) { query.innerHTML = assetDollarPrice; }
}
