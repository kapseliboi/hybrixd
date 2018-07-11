clipboard = {
  clipboardSuccess: function () {
    rxjs.of(false)
      .pipe(
        rxjs.operators.delay(1200),
        rxjs.operators.startWith(true)
      )
      .subscribe(function (isActive) {
        document.querySelector('#action-receive .copied').classList.toggle('active', isActive);
      });
  },
  clipboardError: function () {
    alert('This browser cannot automatically copy to the clipboard! \n\nPlease select the text manually, and press CTRL+C to \ncopy it to your clipboard.\n');
  }
};
