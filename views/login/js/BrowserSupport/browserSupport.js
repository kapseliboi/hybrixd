var Bowser = bowser;

var unsupportedBrowsers = [
  { msie: '6' },
  { android: '2'},
  { opera: '12'},
  { safari: '5'}
];

function isUnsupportedBrowser (userAgent, browser) {
  return Bowser.isUnsupportedBrowser(browser, userAgent);
}

function checkBrowserSupport (userAgent) {
  var isAnyUnsupportedBrowser = R.any(R.curry(isUnsupportedBrowser)(userAgent), unsupportedBrowsers);

  if (isAnyUnsupportedBrowser) {
    document.querySelector('#loginform').innerHTML = '<h2 class="loginbox-title">Your browser is not supported</h2><p class="loginbox-text">We’re sorry, but you’re using a browser we don’t support. To use the Internet of Coins wallet, please upgrade to the latest version of <a href="https://www.mozilla.org/en-US/firefox/new/" target="_blank">Firefox</a>, <a href="https://www.google.com/chrome/" target="_blank">Chrome</a>, <a href="https://support.apple.com/downloads/safari" target="_blank">Safari</a> or <a href="https://www.microsoft.com/en-us/download/internet-explorer.aspx" target="_blank">Internet Explorer</a></p><p class="loginbox-text">Please visit <a href="https://internetofcoins.org/faq#browser-support" target="_blank">our FAQ</a> for more information about browser support. </p>';
    document.querySelector('#generateform').classList.add('inactive');
    document.querySelector('#helpbutton').classList.add('inactive');
    document.querySelector('#alertbutton').classList.add('inactive');
  }
}

browserSupport = {
  checkBrowserSupport
};
