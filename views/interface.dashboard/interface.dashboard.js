import { utils_} from '../index/utils.js';
import { black } from '../files/svg/black.js';
import { dashboardUI } from './js/AssetDashboard/assetDashboard.js';
import { balance } from '../interface/js/Balance/balance.js';
import { interfaceStreams } from '../interface/interface.js';

import * as R from 'ramda';

import { concat } from 'rxjs/observable/concat';
import { merge } from 'rxjs/observable/merge';
import { interval } from 'rxjs/observable/interval';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { map, filter, startWith, takeUntil, tap } from 'rxjs/operators';

var AMOUNT_OF_SIGNIFICANT_DIGITS = 5;
var BALANCE_RENDER_INTERVAL_MS = 60000;

var socialMediaIcons = [
  // {class: '.manage-icon', svg: 'edit'},
  {class: '.twitter', svg: 'twitter'},
  {class: '.telegram', svg: 'telegram'},
  {class: '.riot', svg: 'riot'},
  {class: '.slack', svg: 'slack'},
  {class: '.bitcointalk', svg: 'bitcointalk'},
  {class: '.chevron-right', svg: 'chevron-right'}
];

var stopBalanceStream = fromEvent(document.querySelector('#topmenu-assets'), 'click');

var retrieveBalanceStream = interval(BALANCE_RENDER_INTERVAL_MS)
  .pipe(
    startWith(0),
    takeUntil(merge(
      stopBalanceStream,
      interfaceStreams.logOutStream
    ))
  );

function renderStarredAssets (assets) {
  var starredAssetsHTML = R.reduce(dashboardUI.mkHtmlForStarredAssets, '', assets);

  var htmlToRender = R.not(R.isEmpty(assets))
    ? starredAssetsHTML
    : dashboardUI.noStarredAssetsHTML;

  document.querySelector('.dashboard-balances > .data').innerHTML = htmlToRender;
}

function renderSvgIcon (icon) {
  var iconName = R.prop('svg', icon);
  document.querySelector(icon.class).innerHTML = R.prop(iconName, black);
}

function render (assets) {
  return function () {
    var starredAssetsIDs = R.map(R.prop('id'), assets);
    var queryStr = '.dashboard-balances > .data > .balance > .balance-';
    renderStarredAssets(assets);
    socialMediaIcons.forEach(renderSvgIcon);
    balance.mkRenderBalancesStream(retrieveBalanceStream, queryStr, AMOUNT_OF_SIGNIFICANT_DIGITS, starredAssetsIDs)
      .subscribe();
  };
}

function main (args) {
  var starredAssets = R.filter(R.propEq('starred', true), GL.assets);

  document.querySelector('#userID').innerHTML = R.path(['usercrypto', 'userid'], GL); // set user ID field in top bar
  utils_.setViewTab('dashboard'); // top menu UI change --> Sets element to active class
  utils_.documentReady(render(starredAssets));
}

init.interface.dashboard = main;
