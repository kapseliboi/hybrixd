var U = utils;

generateAddress = {
  render: function (assetID) {
    console.log('assetID = ', assetID);
    document.querySelector('#modal-generate-address-button').setAttribute('data', assetID);
  },
  generateAddress: function (assets, globalAssets, assetModes, LZString, assetID) {
    var fullMode = R.prop(assetID, assetModes);
    var mode = fullMode.split('.')[0];
    var modeHash = R.path(['modehashes', mode], assets);
    var asset = R.find(R.propEq('id', assetID))(globalAssets);

    Storage.Get_(modeHash + '-LOCAL')
      .pipe(
        rxjs.operators.map(R.curry(retrieveNewAddress)(asset))
      )
      .subscribe();

    function retrieveNewAddress (asset, dcode) {
      var deterministic_ = U.activate(LZString.decompressFromEncodedURIComponent(dcode));
      var newAddress = deterministic_.generate(asset, function (a) { console.log('Generated address.', a); });

      return newAddress;
    }
  }
};

var generateAddressBtnStream = rxjs.fromEvent(document.querySelector('#modal-generate-address-button'), 'click')
  .pipe(
    rxjs.operators.map(R.path(['target', 'attributes', 'data', 'value']))
  );

generateAddressBtnStream.subscribe(R.curry(generateAddress.generateAddress)(assets)(GL.assets)(GL.assetmodes)(LZString));
