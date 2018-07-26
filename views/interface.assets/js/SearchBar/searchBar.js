import { utils_ } from './../../../index/utils.js';
import { manageAssets } from './../ManageAssets/manageAssets.js';

import { fromEvent } from 'rxjs/observable/fromEvent';
import { merge } from 'rxjs/observable/merge';
import { map, startWith, flatMap, tap } from 'rxjs/operators';

import * as R from 'ramda';

var tableHTMLStr = '<div class="table">' +
    '<div class="thead">' +
    '<div class="tr">' +
    '<div class="th col1">Asset</div>' +
    '<div class="th col2" style="text-align:right;">Show / hide in wallet</div>' +
    '</div>' +
    '</div>' +
    '<div class="tbody">';

var clearBtns = [
  document.querySelector('#manageAssetsBtn'),
  document.querySelector('.clearable__clear')
];

var clearBtnsStream = R.map(function (elem) { return fromEvent(elem, 'click'); }, clearBtns);

var searchAssetsStream = fromEvent(document.querySelector('#search-assets'), 'input')
  .pipe(
    startWith({target: {value: ''}}),
    map(utils_.getTargetValue)
  );

var searchBarStream = searchAssetsStream
  .pipe(
    map(R.toLower),
    map(function (query) {
      return R.compose(
        R.keys,
        R.fromPairs,
        R.filter(queryMatchesEntry(query)),
        R.toPairs
      )(GL.assetnames);
    })
  );

var clearSearchBarStream = merge(clearBtnsStream)
  .pipe(
    flatMap(function (a) { return a; }),
    tap(function (_) {
      var searchBar = document.querySelector('#search-assets');
      searchBar.innerHTML = '';
      searchBar.value = '';
      utils_.triggerEvent(searchBar, 'input');
    })
  );

function mkSearchedAssetHTMLStr (acc, entry) {
  var symbolName = entry.slice(entry.indexOf('.') + 1);
  var icon = utils_.mkIcon(symbolName);
  var entryExists = R.any(R.propEq('id', entry), GL.assets);
  var element = entry.replace('.', '-');

  var assetIconHTMLStr = '<div class="icon">' + icon + '</div>';
  var assetIDHTMLSTr = '<div class="asset">' + entry.toUpperCase() + '</div>';
  var assetFullNameHTMLStr = '<div class="full-name">' + GL.assetnames[entry] + '</div>';
  var actionBtns = '<div class="assetbuttons assetbuttons-' + element + '">' + manageAssets.renderManageButton(element, entry, entryExists) + '</div>';

  var htmlStr = '<div class="tr">' +
        '<div class="td col1">' + assetIconHTMLStr + assetIDHTMLSTr + assetFullNameHTMLStr + '</div>' +
        '<div class="td col2 actions">' + actionBtns + '</div>' +
        '</div>';
  return acc + htmlStr;
}

function queryMatchesEntry (query) {
  return function (entry) {
    var assetID = R.toLower(R.nth(0, entry));
    var assetName = R.toLower(R.nth(1, entry));
    return R.test(new RegExp(query, 'g'), assetID) ||
      R.test(new RegExp(query, 'g'), assetName);
  };
}

function renderManageAssets (matchedEntries) {
  var assetsHTMLStr = R.reduce(mkSearchedAssetHTMLStr, '', matchedEntries);
  var output = tableHTMLStr + assetsHTMLStr + '</div></div>';
  document.querySelector('.data.manageAssets').innerHTML = output; // insert new data into DOM
}

function clearInputBtn (value) {
  var displayValue = R.equals(value, '') ? 'none' : 'inline';
  document.querySelector('.clearable__clear').style.display = displayValue;
}

export var searchBar = {
  clearSearchBarStream,
  searchBarStream,
  searchAssetsStream,
  renderManageAssets,
  clearInputBtn
};
