var Valuations = valuations;
var M = manageAssets;

init.interface.assets = function (args) {
  topmenuset('assets'); // top menu UI change
  clearInterval(intervals); // clear all active intervals

  scrollToAnchor = scrollToAnchor(args);
  clipb_success = clipboardSucces;
  clipb_fail = clipboardError;

  // INITIALIZE BUTTONS IN MANAGE ASSETS MODALS
  document.querySelector('#send-transfer').onclick = sendTransfer;
  document.querySelector('#save-assetlist').onclick = M.saveAssetList(displayAssets);

  GL.searchingactive = false;
  GL.searchval = '';

  var events = ['change', 'keydown', 'paste', 'input'];
  events.forEach(function (event) { document.querySelector('#search-assets').addEventListener(event, M.searchAssets(M.renderManageAssetsList(M.renderManageButton))); });

  // modal helper functions
  // TODO: Remove messy callback structure......
  manageAssets = M.manageAssets(M.renderManageAssetsList(M.renderManageButton));
  changeManageButton = M.changeManageButton(M.renderManageButton);
  toggleStar = toggleStar;

  fill_send = fillSend;
  fill_recv = receiveAction;
  stop_recv = stopReceiveAction;
  check_tx = checkTx;

  // fill asset elements
  ui_assets = uiAssets(balance);
};

// function renderAssetsButtons (element, balance, i) {
//   return function (object) {
//     var assetbuttonsClass = '.assets-main > .data .assetbuttons-' + balance.asset[i].replace(/\./g,'-');
//     var objectDataIsValid = object.data !== null && !isNaN(object.data);
//     if (objectDataIsValid) {
//       renderDollarPriceInAsset(balance.asset[i], Number(object.data));
//       setTimeout(function () { document.querySelector(assetbuttonsClass).classList.remove('disabled'); }, 1000);
//       document.querySelector(assetbuttonsClass + ' a').removeAttribute('disabled');
//       document.querySelector(assetbuttonsClass + ' a').setAttribute('data-toggle', 'modal');
//       document.querySelector(element).setAttribute('amount', object.data);
//       object.data = UItransform.formatFloat(object.data, 11);
//     } else {
//       document.querySelector(assetbuttonsClass).classList.add('disabled');
//       document.querySelector(assetbuttonsClass + ' a').removeAttribute('data-toggle');
//       document.querySelector(element).setAttribute('amount', '?');
//       object.data = 'n/a';
//     }
//     return object;
//   };
// }

function renderDollarPriceInAsset (asset, amount) {
  var symbolName = asset.slice(asset.indexOf('.') + 1);
  var assetDollarPrice = Valuations.renderDollarPrice(symbolName, amount);
  var query = document.getElementById(symbolName + '-dollar');
  if (query !== null) { query.innerHTML = assetDollarPrice; }
}

function sendTransfer () {
  if (document.querySelector('#send-transfer').classList.contains('disabled')) {
    // cannot send transaction
  } else {
    // send transfer
    loadSpinner();
    var symbol = $('#action-send .modal-send-currency').attr('asset');
    sendTransaction({
      element: '.assets-main > .data .balance-'+symbol.replace(/\./g,'-'),
      asset:symbol,
      amount:Number($('#modal-send-amount').val().replace(/\,/g,'.')),
      source:String($('#action-send .modal-send-addressfrom').html()).trim(),
      target:String($('#modal-send-target').val()).trim()
    });
  }
}

function setStarredAssetClass (assetID, isStarred) {
  var id = '#' + assetID.replace(/\./g, '_'); // Mk into function. Being used elsewhere too.
  $(id).children('svg').toggleClass('starred', isStarred); // DAMN YOU JQUERY!!!!
}

// TODO REMOVE INDEX, USE NAME
function toggleStar (assetID) {
  var globalAssets = GL.assets;
  var updatedGlobalAssets = R.reduce(function (acc, asset) {
    var starredLens = R.lensProp('starred');
    var toggledStarredValue = R.not(R.view(starredLens, asset));
    var updatedOrCurrentAsset = asset.id === assetID
        ? R.set(starredLens, toggledStarredValue, asset)
        : asset;
    return R.append(updatedOrCurrentAsset, acc);
  }, [], globalAssets);
  var isStarred = R.defaultTo(false, R.find(R.propEq('id', assetID, updatedGlobalAssets)));
  var starredForStorage = R.map(R.pickAll(['id', 'starred']), updatedGlobalAssets);

  storage.Set(userStorageKey('ff00-0034'), userEncode(starredForStorage));
  GL.assets = updatedGlobalAssets;

  setStarredAssetClass(assetID, isStarred);
}

function uiAssets (balance) {
  return function () {
    renderBalances(balance);
    getNewMarketPrices();
  };
}

function renderBalances (balance) {
  GL.assets.forEach(function (asset, i) {
    if (typeof balance.asset[i] !== 'undefined') {
      var element = '.assets-main > .data .balance-' + balance.asset[i].replace(/\./g,'-');
      var timeIsCurrent = balance.lasttx[i] + 120000 < (new Date).getTime();
      var url = 'a/' + asset.id + '/balance/' + window.assets.addr[balance.asset[i]];
      if (timeIsCurrent) {

        var balanceStream = Rx.Observable
            .fromPromise(hybriddcall({r: url, z: 0}))
            .filter(R.propEq('error', 0))
            .map(R.merge({r: url, z: true}));

        var balanceResponseStream = balanceStream
            .flatMap(function (properties) {
              return Rx.Observable
                .fromPromise(hybriddReturnProcess(properties));
            })
            .map(data => {
              if (R.isNil(data.stopped) && data.progress < 1) {
                throw data; // error will be picked up by retryWhen
              }
              return data;
            })
            .retryWhen(function (errors) { return errors.delay(100); });

        balanceResponseStream.subscribe(returnedObjectFromServer => {
          var sanitizedData = sanitizeServerObject(returnedObjectFromServer).data;
          renderDataInDom(element, 11, sanitizedData);
          fillAssetElement(element, asset.id, returnedObjectFromServer);
        });
      }
    }
  });
}

// function getNewMarketPrices () { Valuations.getDollarPrices(() => {}); }

function getNewMarketPrices () {
  var dollarPriceStream = Rx.Observable
      .interval(5000);

  dollarPriceStream.subscribe(function (_) {
    Valuations.getDollarPrices(() => {});
  });
}

function fillAssetElement (element, assetbuttons, object) {
  if (object.data !== null && !isNaN(object.data)) {
    $(assetbuttons).delay(1000).removeClass('disabled');
    $(assetbuttons + ' a').removeAttr('disabled');
    $(assetbuttons + ' a').attr('data-toggle', 'modal');
  } else {
    $(assetbuttons).addClass('disabled');
    $(assetbuttons + ' a').removeAttr('data-toggle');
    $(element).attr('amount', '?');
  }
  return object;
}
