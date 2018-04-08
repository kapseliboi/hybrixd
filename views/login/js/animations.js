// animation (init)
function animate_login () {
  $('#arc0').css('background-color', $('#combinator').css('color'));
  if (blink('arc0') && rotate_login(0) && dial_login(0)) {
    // return true to confirm animation is running
    return true;
  }
}

// animation (blink)
function blink (target) {
  var el = document.getElementById(target);
  if (el != null && typeof el.style !== 'undefined') {
    if (typeof el.style.visibility !== 'undefined' && el.style.visibility === 'hidden') {
      el.style.visibility = 'visible';
    } else {
      el.style.visibility = 'hidden';
    }
  }
  // setTimeout("blink('" + target + "')", 400);
  setTimeout(function () {
    blink(target);
  }, 400);

  return true;
}

// animation (rotation)
function rotate_login (turn) {
  var el = document.getElementById('arc3');
  var bgcl = $('#combinator').css('background-color');
  // alert(bgcl);
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
    rotate_login(turn);
  }, 1500);
  return true;
}

function dial_login (turn) {
  var el = document.getElementById('arc2');
  var bgcl = $('#combinator').css('background-color');
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
