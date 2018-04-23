var Utils = utils;
var SVG = svg;

var socialMediaIcons = [
  // {class: '.manage-icon', svg: 'edit'},
  {class: '.twitter', svg: 'twitter'},
  {class: '.telegram', svg: 'telegram'},
  {class: '.riot', svg: 'riot'},
  {class: '.slack', svg: 'slack'},
  {class: '.bitcointalk', svg: 'bitcointalk'},
  {class: '.chevron-right', svg: 'chevron-right'}
]

function renderSvgIcon (icon) { document.querySelector(icon.class).innerHTML = R.path(['icon', 'svg'], SVG); }

Utils.documentReady(function () {
  socialMediaIcons.forEach(renderSvgIcon);
});
