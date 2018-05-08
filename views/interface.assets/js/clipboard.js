clipboard = {
  clipboardSucces: function () {
    $('#action-receive .copied').fadeTo('fast', 1);
    $('#action-receive .copied').delay(10).fadeTo('fast', 0.3);
    $('#action-receive .copied').delay(10).fadeTo('fast', 1);
    $('#action-receive .copied').delay(800).fadeTo('fast', 0);
  },
  clipboardError: function () {
    alert('This browser cannot automatically copy to the clipboard! \n\nPlease select the text manually, and press CTRL+C to \ncopy it to your clipboard.\n');
  }
};
