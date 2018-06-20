var subject = new rxjs.Subject();

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
    weight: '65%',
    message: 'Loading your assets...'
  },
  5: {
    step: 5,
    weight: '90%',
    message: 'Finalizing wallet...'
  },
  6: {
    step: 6,
    weight: '90%',
    message: 'Almost there!'
  }
};

var ANIMATION_STEPS = 10;

// var ANIMATION_STEPS = R.compose(
//   R.dec,
//   R.length,
//   R.keys
// )(progressMessages);

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

var initialAnimationStateStream = rxjs.interval(200)
  .pipe(
    rxjs.operators.startWith(0),
    rxjs.operators.take(2)
  );

var loginAnimationStream = initialAnimationStateStream
  .pipe(
    rxjs.operators.scan(R.inc),
    rxjs.operators.map(function (n) {
      console.log('n = ', n); return n <= ANIMATION_STEPS ? n : ANIMATION_STEPS;
    }),
    rxjs.operators.map(doProgressAnimation)
  );

function doProgressAnimation (step) {
  var elemExists = R.not(R.isNil(document.querySelector('.progress-bar'))) &&
      R.not(R.isNil(document.querySelector('.progress-text')));
  if (elemExists) {
    document.querySelector('.progress-bar').style.width = R.path([step, 'weight'], progressMessages);
    document.querySelector('.progress-text').innerHTML = R.path([step, 'message'], progressMessages);
  }
  return step;
}

function defaultOrMaxSteps (n) {
  return n <= ANIMATION_STEPS ? n : ANIMATION_STEPS;
}

animations = {
  ANIMATION_STEPS,
  defaultOrMaxSteps,
  loginAnimationStream,
  initialAnimationStateStream,
  doProgressAnimation,
  progressMessages,
  subject
};
