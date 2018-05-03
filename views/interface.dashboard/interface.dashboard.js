var U = utils;
var H = hybridd;
var UI = dashboardUI;
var SVG = svg;

var socialMediaIcons = [
  // {class: '.manage-icon', svg: 'edit'},
  {class: '.twitter', svg: 'twitter'},
  {class: '.telegram', svg: 'telegram'},
  {class: '.riot', svg: 'riot'},
  {class: '.slack', svg: 'slack'},
  {class: '.bitcointalk', svg: 'bitcointalk'},
  {class: '.chevron-right', svg: 'chevron-right'}
];

var stopBalanceStream = Rx.Observable
    .fromEvent(document.querySelector('#topmenu-assets'), 'click');

var retrieveBalanceStream = Rx.Observable
    .interval(60000)
    .startWith(0)
    .delay(500) // HACK! Delay balance retrieval somewhat. Retrieval is sometimes faster than DOM rendering, so can't render right away.....
    .takeUntil(stopBalanceStream);

function main () {
  renderStarredAssets(GL.assets);
  setIntervalFunctions(GL.assets);
  socialMediaIcons.forEach(renderSvgIcon);
}

function renderStarredAssets (assets) {
  var hasStarredAssets = R.any(R.propEq('starred', true), assets);
  var renderAssets = hasStarredAssets && R.not(R.isEmpty(assets));
  var starredAssetsHTML = R.reduce(UI.mkHtmlForStarredAssets, '', assets);

  var htmlToRender = renderAssets
      ? starredAssetsHTML
      : UI.noStarredAssetsHTML;

  document.querySelector('.dashboard-balances .spinner-loader').classList.add('disabled-fast');
  setTimeout(() => { document.querySelector('.dashboard-balances > .data').innerHTML = htmlToRender; }, 500); // Render new HTML string in DOM. 500 sec delay for fadeout. Should separate concern!
}

function setIntervalFunctions (assets) {
  retrieveBalanceStream.subscribe(function (_) {
    assets.forEach(U.retrieveBalance(H.renderDataInDom, 5, '.dashboard-balances > .data > .balance > .balance-'));
  });
};

function renderSvgIcon (icon) {
  var iconName = R.prop('svg', icon);
  document.querySelector(icon.class).innerHTML = R.prop(iconName, SVG);
}

init.interface.dashboard = function (args) {
  document.querySelector('#userID').innerHTML = args.userid; // set user ID field in top bar
  U.setViewTab('dashboard'); // top menu UI change --> Sets element to active class
  U.documentReady(main);
};
