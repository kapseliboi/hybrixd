var progressMessages = {
  0: {
    step: 0,
    weight: '15%',
    message: 'Setting up new session...'
  },
  1: {
    step: 1,
    weight: '20%',
    message: 'Retrieving your personal data...'
  },
  2: {
    step: 2,
    weight: '30%',
    message: 'Generating wallet...'
  },
  3: {
    step: 3,
    weight: '40%',
    message: 'Gathering blockchain information...'
  },
  4: {
    step: 4,
    weight: '55%',
    message: 'Loading your assets...'
  },
  5: {
    step: 5,
    weight: '75%',
    message: 'Finalizing wallet...'
  },
  6: {
    step: 6,
    weight: '90%',
    message: 'Almost there!'
  }
};

function blink (target) {
  var el = document.getElementById(target);
  if (el != null && typeof el.style !== 'undefined') {
    if (typeof el.style.visibility !== 'undefined' && el.style.visibility === 'hidden') {
      el.style.visibility = 'visible';
    } else {
      el.style.visibility = 'hidden';
    }
  }
}

var blinkAnimationStream = Rx.Observable
  .interval(750)
  .map(function (_) { blink('arc0'); });

var rotateLoginStream = Rx.Observable
  .interval(1000)
  .startWith(0)
  .map(R.compose(
    rotateLogin,
    R.modulo(4)
  ));

var dialLoginStream = Rx.Observable
  .interval(1000)
  .startWith(0)
  .map(R.compose(
    dialLogin,
    R.modulo(4)
  ));

function rotateLogin (turn) {
  var el = document.querySelector('#arc3');
  var bgcl = 'transparent';

  if (el != null) {
    if (el.style['border-left'] === '1px solid ' + bgcl) {
      el.style['border-left'] = '1px solid';
      el.style['border-right'] = '1px solid';
      el.style['border-top'] = '1px solid ' + bgcl;
      el.style['border-bottom'] = '1px solid ' + bgcl;
    } else {
      el.style['border-left'] = '1px solid ' + bgcl;
      el.style['border-right'] = '1px solid ' + bgcl;
      el.style['border-top'] = '1px solid';
      el.style['border-bottom'] = '1px solid';
    }
  }
}

function dialLogin (turn) {
  var el = document.querySelector('#arc2');
  var bgcl = 'transparent';

  if (el != null) {
    if (turn === 0) {
      el.style['border-left'] = '1px solid';
      el.style['border-top'] = '1px solid ' + bgcl;
      el.style['border-right'] = '1px solid ' + bgcl;
      el.style['border-bottom'] = '1px solid ' + bgcl;
    }
    if (turn === 1) {
      el.style['border-left'] = '1px solid';
      el.style['border-top'] = '1px solid';
      el.style['border-right'] = '1px solid ' + bgcl;
      el.style['border-bottom'] = '1px solid ' + bgcl;
    }
    if (turn === 2) {
      el.style['border-left'] = '1px solid';
      el.style['border-top'] = '1px solid';
      el.style['border-right'] = '1px solid';
      el.style['border-bottom'] = '1px solid ' + bgcl;
    }
    if (turn === 3) {
      el.style['border-left'] = '1px solid';
      el.style['border-top'] = '1px solid';
      el.style['border-right'] = '1px solid';
      el.style['border-bottom'] = '1px solid';
    }
  }
}

var animationStream = Rx.Observable
  .merge(
    blinkAnimationStream,
    rotateLoginStream,
    dialLoginStream
  );

function doProgressAnimation (step) {
  var elemExists = R.not(R.isNil(document.querySelector('.progress-bar'))) &&
                   R.not(R.isNil(document.querySelector('.progress-text')));
  if (elemExists) {
    document.querySelector('.progress-bar').style.width = R.path([step, 'weight'], progressMessages);
    document.querySelector('.progress-text').innerHTML = R.path([step, 'message'], progressMessages);
  }
}

function disposeCurrentDisposable (disposable) { disposable.dispose(); }
function startLoginAnimation () { return animationStream.subscribe(); }
function stopLoginAnimation (d) {
  R.forEach(disposeCurrentDisposable, R.path(['m', 'current', 'disposables'], d));
  d.dispose();
}

animations = {
  startLoginAnimation,
  stopLoginAnimation,
  doProgressAnimation,
  progressMessages
};
