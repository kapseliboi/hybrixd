var Balance = balance;
var GenerateAddress = generateAddress;
var InterfaceStreams = interfaceStreams;
var ReceiveAsset = receiveAsset;
var SendAsset = sendAsset;
var TxValidations = transactionValidations;
var Valuations = valuations;
var M = manageAssets;
var U = utils;
var Asset = asset;

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
      rxjs.operators.takeUntil(rxjs.merge(
        stopBalanceStream,
        InterfaceStreams.logOutStream
      ))
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
  var queries = document.querySelectorAll('.' + query);
  return R.equals(R.length(queries), 0)
    ? rxjs.from([])
    : rxjs.fromEvent(queries, 'click')
      .pipe(
        rxjs.operators.map(R.path(['target', 'attributes', 'data', 'value']))
      );
}

function updateGlobalAssetsAndRenderDataInDOM (balanceData) {
  var elem = R.prop('element', balanceData);
  var id = R.prop('assetID', balanceData);
  var n = R.prop('amountStr', balanceData);
  Asset.toggleAssetButtons(elem, id, Number(n));
  renderDollarPriceInAsset(id, Number(n));
}

function renderDollarPriceInAsset (asset, amount) {
  var symbolName = asset.slice(asset.indexOf('.') + 1);
  var assetDollarPrice = Valuations.renderDollarPrice(symbolName, amount);
  var query = document.getElementById(symbolName + '-dollar');
  if (query !== null) { query.innerHTML = assetDollarPrice; }
}
