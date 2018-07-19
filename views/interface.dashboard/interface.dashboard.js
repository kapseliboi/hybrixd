var Balance = balance;

// var U = utils;
import utils_ from '../index/utils.js';
// var H = hybridd;
// var SVG = svg;
import { black } from '../files/svg/black.js';
// var UI = dashboardUI;
import { dashboardUI } from './js/AssetDashboard/assetDashboard.js';
// var Balance = balance;
import { balance } from '../interface/js/Balance/balance.js';
// var InterfaceStreams = interfaceStreams;
import interfaceStreams from '../interface/interface.js';

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

var stopBalanceStream = rxjs
  .fromEvent(document.querySelector('#topmenu-assets'), 'click');

var retrieveBalanceStream = rxjs
  .interval(BALANCE_RENDER_INTERVAL_MS)
  .pipe(
    rxjs.operators.startWith(0),
    rxjs.operators.takeUntil(rxjs.merge(
      stopBalanceStream
      // interfaceStreams.logOutStream
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
  utils.setViewTab('dashboard'); // top menu UI change --> Sets element to active class
  utils.documentReady(render(starredAssets));
}

init.interface.dashboard = main;

if (typeof modules !== 'undefined') {
  main;
}
