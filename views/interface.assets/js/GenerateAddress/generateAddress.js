import utils_ from '../../../index/utils.js';
import R from 'ramda';
import { map } from 'rxjs/operators';
import { fromEvent } from 'rxjs/observable/fromEvent';

export var generateAddress = {
  render: function (assetID) {
    document.querySelector('#modal-generate-address-button').setAttribute('data', assetID);
  },
  generateAddress: function (assets, globalAssets, assetModes, LZString, assetID) {
    var fullMode = R.prop(assetID, assetModes);
    var mode = fullMode.split('.')[0];
    var modeHash = R.path(['modehashes', mode], assets);
    var asset = R.find(R.propEq('id', assetID))(globalAssets);

    Storage.Get_(modeHash + '-LOCAL')
      .pipe(
        map(R.curry(retrieveNewAddress)(asset))
      )
      .subscribe();

    function retrieveNewAddress (asset, dcode) {
      var deterministic_ = utils_.activate(LZString.decompressFromEncodedURIComponent(dcode));
      var newAddress = deterministic_.generate(asset, function (a) { console.log('Generated address.', a); });

      return newAddress;
    }
  }
};

var generateAddressBtnStream = fromEvent(document.querySelector('#modal-generate-address-button'), 'click')
  .pipe(
    map(R.path(['target', 'attributes', 'data', 'value']))
  );

generateAddressBtnStream.subscribe(R.curry(generateAddress.generateAddress)(assets)(GL.assets)(GL.assetmodes)(LZString));
