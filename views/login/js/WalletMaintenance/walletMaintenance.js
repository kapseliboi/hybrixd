function renderMaintenanceMessage () {
  document.querySelector('#loginform').innerHTML = '<h2 class="loginbox-title">Our wallet is temporarily down</h2><p class="loginbox-text">We’re sorry, but we\'re facing some technical issues. The Internet of Coins wallet is temporarily down. Please try again after some time.</br></br>Please visit <a href="http://www.internetofcoins.org" target="blank">our website</a> for more information.</p>';
  document.querySelector('#generateform').classList.add('inactive');
  document.querySelector('#helpbutton').classList.add('inactive');
  document.querySelector('#alertbutton').classList.add('inactive');
}

function mkTestHybriddAvailabilityStream () {
  return rxjs.from(U.fetchDataFromUrl('api/v'))
    .pipe(
      rxjs.operators.map(function (hybriddResponse) {
        var responseContainsError = R.propEq('error', 1, hybriddResponse);
        if (responseContainsError) throw { error: 1, msg: 'Could not connect to Hybridd.'};
        return true;
      }),
      rxjs.operators.catchError(function (e) {
        return rxjs.of(e)
          .pipe(
            rxjs.operators.tap(function (_) { renderMaintenanceMessage(); })
          );
      })
    );
}

walletMaintenance = {
  mkTestHybriddAvailabilityStream
};
