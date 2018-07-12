// responsive menu code
(function (window, document) {
  function togglemenubar () {
    document.getElementById('tuckedMenu').classList.toggle('custom-menu-tucked');
    document.getElementById('tuckedMenulist').classList.toggle('custom-menu-tucked');
    document.getElementById('toggleMenu').classList.toggle('x');
  }
  document.querySelector('.custom-menu-toggle').addEventListener('click', function (e) {
    togglemenubar();
  });
  // document.getElementById('tuckedMenulist').addEventListener('click', function (e) { togglemenubar(); });

  var output = '<span id="tooltip">Work in progress</span>';
  var disabledMenuItems = document.getElementsByClassName('disabled');
  for (var i = 0; i < disabledMenuItems.length; i++) {
    disabledMenuItems[i].innerHTML += output;
  }
})(this, this.document);
