// Non-shared password validations

validations = {
  validateUseridForLegacyWallets: function (userID) {
    var hxid = base32ToHex(userID).toUpperCase();
    var hxidSubStr = hxid.substr(12, 4);
    var hxidHash = DJB2.hash(hxid.substr(0,12)).substr(0,4);
    return hxidHash === hxidSubStr;
  },
  validatePassForLegacyWallets: function (userID, pass) {
    var hxid = base32ToHex(userID).toLowerCase();
    var passwordUpperCase = pass.toUpperCase();
    var hxidSubStr = hxid.substr(16, 4).toUpperCase();
    var hxidHash = DJB2.hash(hxid.substr(0,12) + passwordUpperCase).substr(4, 4);
    return hxidHash === hxidSubStr;
  }
};
