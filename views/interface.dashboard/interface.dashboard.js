var U = utils;
var H = hybridd;
var UI = dashboardUI;
var SVG = svg;
var Balance = balance;

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
    rxjs.operators.takeUntil(stopBalanceStream)
  );

function renderStarredAssets (assets) {
  var starredAssetsHTML = R.reduce(UI.mkHtmlForStarredAssets, '', assets);

  var htmlToRender = R.not(R.isEmpty(assets))
    ? starredAssetsHTML
    : UI.noStarredAssetsHTML;

  document.querySelector('.dashboard-balances .spinner-loader').classList.add('disabled-fast');
  document.querySelector('.dashboard-balances > .data').innerHTML = htmlToRender;
}

function renderSvgIcon (icon) {
  var iconName = R.prop('svg', icon);
  document.querySelector(icon.class).innerHTML = R.prop(iconName, SVG);
}

function render (assets) {
  return function () {
    var starredAssetsIDs = R.map(R.prop('id'), assets);
    var queryStr = '.dashboard-balances > .data > .balance > .balance-';
    renderStarredAssets(assets);
    socialMediaIcons.forEach(renderSvgIcon);
    Balance.mkRenderBalancesStream(retrieveBalanceStream, queryStr, AMOUNT_OF_SIGNIFICANT_DIGITS, starredAssetsIDs)
      .subscribe();
  };
}

function main (args) {
  var starredAssets = R.filter(R.propEq('starred', true), GL.assets);

  document.querySelector('#userID').innerHTML = R.path(['usercrypto', 'userid'], GL); // set user ID field in top bar
  U.setViewTab('dashboard'); // top menu UI change --> Sets element to active class
  U.documentReady(render(starredAssets));
}

init.interface.dashboard = main;
