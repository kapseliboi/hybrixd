import * as R from 'ramda';

export var transactionValidations = {
  toggleSendButtonClass: function (a, target) {
    var p = {
      asset: document.querySelector('#action-send .modal-send-currency').getAttribute('asset'),
      target_address: target,
      amount: Number(a),
      available: Number(document.querySelector('#action-send .modal-send-balance').innerHTML)
    };
    // TODO Validations
    var txDetailsAreValid = !isNaN(p.amount) &&
        p.amount > 0 &&
        p.amount <=
        p.available &&
        R.not(R.isNil(p.target_address));

    var classListMethod = txDetailsAreValid ? 'remove' : 'add';

    // TODO: make pure!
    document.querySelector('#action-send .pure-button-send').classList[classListMethod]('disabled');

    return txDetailsAreValid;
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
