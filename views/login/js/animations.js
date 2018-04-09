function blink (target) {
  var el = document.getElementById(target);
  if (el != null && typeof el.style !== 'undefined') {
    if (typeof el.style.visibility !== 'undefined' && el.style.visibility === 'hidden') {
      el.style.visibility = 'visible';
    } else {
      el.style.visibility = 'hidden';
    }
  }

  setTimeout(function () {
    blink(target);
  }, 400);

  return true;
}

function rotateLogin (turn) {
  var el = document.querySelector('#arc3');
  var bgcl = "transparent";

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
  if (turn === 0) { turn = 1; } else { turn = 0; }
  setTimeout(function () {
    rotateLogin(turn);
  }, 1500);
  return true;
}

function dialLogin (turn) {
  var el = document.querySelector('#arc2');
  var bgcl = "";

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
  return true;
}

animations = {
  blink,
  rotateLogin,
  dialLogin
};
