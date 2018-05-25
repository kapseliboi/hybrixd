transactionValidations = {
  toggleSendButtonClass: function () {
    var p = {
      asset: document.querySelector('#action-send .modal-send-currency').getAttribute('asset'),
      target_address: String(document.querySelector('#modal-send-target').value),
      amount: Number(document.querySelector('#modal-send-amount').value),
      available: Number(document.querySelector('#action-send .modal-send-balance').innerHTML)
    };
    // TODO Validations
    var txDetailsAreValid = !isNaN(p.amount) &&
        p.amount > 0 &&
        p.amount <=
        p.available &&
        R.not(R.isNil(p.target_address));

    var classListMethod = txDetailsAreValid ? 'remove' : 'add';
    document.querySelector('#action-send .pure-button-send').classList[classListMethod]('disabled');
  }
};

// function toggleSendButtonClass (z) {
//   var asset = R.nth(0);
//   var amountToSend = R.nth(1);
//   var targetAddress = R.nth(1);
//   var availableBalance = null; // SPENDABLE AMOUNT

//   // TODO Validations
//   var txDetailsAreValid = !isNaN(amountToSend) &&
//       amountToSend > 0 &&
//       amountToSend <= availableBalance &&
//       targetAddress;

//   var classListMethod = txDetailsAreValid ? 'remove' : 'add';
//   document.querySelector('#action-send .pure-button-send').classList[classListMethod]('disabled');
// };
