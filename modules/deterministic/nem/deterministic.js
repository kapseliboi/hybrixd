// (C) 2018 Internet of Coins
// hybridd module - electrum/deterministic_source.js
// Deterministic encryption wrapper for NEM
//
// [!] Browserify this and save to deterministic.js.lzma to enable sending it from hybridd to the browser!
//

var wrapper = (
  function() {

    toUnits = function(float, factor) {
      return float * Math.pow(10, factor);
    }

    fromUnits = function(float, factor) {
      return float / Math.pow(10, factor);
    }

    // TODO
    minimumFee = function(numNem) {
      var fee = Math.floor((numNem /1000000)/10000) * 0.05;
      if (fee < 0.05) { return 0.05 } else if(fee > 1.25) {return 1.25} else {return fee};
    }
    

    getMosaicDefinition = function(namespace, mosaic) {
      // Usage examples:
      // // var namespace = "11123.kopioey";
      // // var mosaic = "kopioeycoin";
      // // var namespace = "ap-test1";
      // // var mosaic = "ap-test-mosaic-5";
      // var namespace = "apple";
      // var mosaic = "gold_iphone";
      // getMosaicDefinition(namespace, mosaic);
      // or, alternatively, http://127.0.0.1:7890/namespace/mosaic/definition/page?namespace=makoto.metal.coins can be called and filtered
      // (https://nemproject.github.io/#retrieving-mosaic-definitions)

      var mosaicAttachment = wrapperlib.nem.model.objects.create("mosaicAttachment")(namespace, mosaic, 0);

      // Create variable to store our mosaic definitions, needed to calculate fees properly (already contains xem definition)
      var mosaicDefinitionMetaDataPair = wrapperlib.nem.model.objects.get("mosaicDefinitionMetaDataPair");

      // Create an NIS endpoint object
      var endpoint = wrapperlib.nem.model.objects.create("endpoint")(wrapperlib.nem.model.nodes.defaultTestnet,
                                                                     wrapperlib.nem.model.nodes.defaultPort);

      wrapperlib.nem.com.requests.namespace.mosaicDefinitions(endpoint, mosaicAttachment.mosaicId.namespaceId).then(
        function(res) {
          // DEBUG: console.log("Mosaics in a namespace '", mosaicAttachment.mosaicId.namespaceId, "': ", JSON.stringify(res, null, 2));

          // Look for the mosaic definition(s) we want in the request response
          var neededDefinition = wrapperlib.nem.utils.helpers.searchMosaicDefinitionArray(res.data, [mosaic]);

          // Get full name of mosaic to use as object key
          var fullMosaicName  = wrapperlib.nem.utils.format.mosaicIdToName(mosaicAttachment.mosaicId);
          // DEBUG: console.log("Full mosaic name: ", fullMosaicName);

          // Check if the mosaic was found
          if(undefined === neededDefinition[fullMosaicName]) return console.error("Mosaic not found !");

          // Set mosaic definition into mosaicDefinitionMetaDataPair
          mosaicDefinitionMetaDataPair[fullMosaicName] = {};
          mosaicDefinitionMetaDataPair[fullMosaicName].mosaicDefinition = neededDefinition[fullMosaicName];

          // DEBUG: console.log("Mosaic definition: ", JSON.stringify(neededDefinition[fullMosaicName], null, 2));
        },
        function(err) {
          console.error(err);
        }
      );
    };


    txEntityRegular = function(network, common, transferTransaction) {
      var transactionEntity = wrapperlib.nem.model.transactions.prepare("transferTransaction")(common, transferTransaction, network.id);
      return transactionEntity;
    }

    txEntityMosaic = function(network, common, transferTransaction, data) {
      // Create variable to store our mosaic definitions, needed to calculate fees properly (already contains xem definition)
      var mosaicDefinitionMetaDataPair = wrapperlib.nem.model.objects.get("mosaicDefinitionMetaDataPair");

      //data.unspent.forEach(function(mosaic) {
      //});
      
      var namespace    = data.unspent.id.namespaceId;
      var mosaicName   = data.unspent.id.name;
      var divisibility = data.unspent.properties.reduce(function(acc, prop) {
        if (prop.name === "divisibility") {
          return prop.value;
        }
        return acc;
      }, undefined);
      
      var amount = fromUnits(data.amount, divisibility);

      //var amount = toUnits(mosaic.amount, divisibility); // decimal amount * 10^divisibility
      // DEBUG: console.log("namespace: ", namespace, ", mosaicName: ", mosaicName, ", divisibility: ", divisibility, ", amount: ", amount);

      var mosaicAttachment = wrapperlib.nem.model.objects.create("mosaicAttachment")(namespace, mosaicName, amount);
      transferTransaction.mosaics.push(mosaicAttachment);

      // Get full name of mosaic to use as object key
      var fullMosaicName = wrapperlib.nem.utils.format.mosaicIdToName(mosaicAttachment.mosaicId);
      // DEBUG: console.log("fullMosaicName: ", fullMosaicName);

      // Set mosaic definition into mosaicDefinitionMetaDataPair
      mosaicDefinitionMetaDataPair[fullMosaicName] = {};
      mosaicDefinitionMetaDataPair[fullMosaicName].mosaicDefinition = data.unspent;
      // DEBUG: console.log("mosaic.definition: ", JSON.stringify(data.unspent, null, 2));

      // Prepare the transfer transaction object
      var transactionEntity = wrapperlib.nem.model.transactions.prepare("mosaicTransferTransaction")(common, transferTransaction, mosaicDefinitionMetaDataPair, network.id);
      return transactionEntity;
    }


    var functions = {
      // create deterministic public and private keys based on a seed
      keys : function(data) {
        // NEM console junk: override console logging in this scope
        console.time = function(){};
        console.timeEnd = function(){};
        var passphrase = data.seed;
        var privateKey = wrapperlib.nem.crypto.helpers.derivePassSha(passphrase, 6000).priv;
        return {privateKey:privateKey};
      },

      // generate a unique wallet address from a given public key
      address : function(data) {
        // DEBUG: console.log("data.mode: ", data.mode);
        var privKey = data.privateKey;
        var pubKey  = wrapperlib.nem.crypto.keyPair.create(privKey).publicKey;
        var network = wrapperlib.nem.model.network.data[data.mode]; // asset encoding?
        // DEBUG: console.log("network: ", network);
        var addr = wrapperlib.nem.model.address.toAddress(pubKey.toString(), network.id);

        if (!wrapperlib.nem.model.address.isValid(addr)) {
          throw new Error("Can't generate address from private key. "
                             + "Generated address " + addr
                             + "is not valid");
        }
        if (!wrapperlib.nem.model.address.isFromNetwork(addr, network.id)) {
          throw new Error("Can't generate address from private key. "
                             + "Generated address " + addr
                             + "is not valid for " + network);
        }
        if (!wrapperlib.nem.crypto.helpers.checkAddress(privKey, network.id, addr)) {
          throw new Error("Private key doesn't correspond to the expected address " + addr);
        }

        addr = addr.replace(/(.{6})/g,"$1\-");   // prettify for human readability
        return addr;
      },

      transaction : function(data) {
        var network = wrapperlib.nem.model.network.data[data.mode];
        var common = wrapperlib.nem.model.objects.get("common");
        common.privateKey = data.keys.privateKey;

        var transactionEntity = undefined;
        if (typeof data.contract === 'undefined' || !data.contract || typeof data.contract.mosaics === 'undefined' || !data.contract.mosaics) {
          var minfee = minimumFee(fromUnits(data.amount,data.factor));
          var amount = fromUnits(data.amount,data.factor); // calculating fee is automatically done by nem.model.objects.create
          var transferTransaction = wrapperlib.nem.model.objects.create("transferTransaction")(data.target, amount, data.message);
          transactionEntity = txEntityRegular(network, common, transferTransaction);
          // DEBUG: logger(JSON.stringify(transferTransaction));
        } else {
          var minfee = minimumFee(fromUnits(data.amount,data.factor));
          var transferTransaction = wrapperlib.nem.model.objects.create("transferTransaction")(data.target, minfee, data.message);
          transactionEntity = txEntityMosaic(network, common, transferTransaction, data);
        }
        
        // DEBUG: console.log("transactionEntity: ", JSON.stringify(transactionEntity, null, 2));
        // Note: amounts are in the smallest unit possible in a prepared transaction object
        // 1000000 = 1 XEM

        // initialise keypair object based on private key
        var kp = wrapperlib.nem.crypto.keyPair.create(common.privateKey);
        // serialise transaction object
        var serialized = wrapperlib.nem.utils.serialization.serializeTransaction(transactionEntity);
        // sign serialised transaction
        var signature = kp.sign(serialized);

        // build result object
        var result = { 
          'data': wrapperlib.nem.utils.convert.ua2hex(serialized),
          'signature': signature.toString()
        };
        return JSON.stringify(result);
      }

    }

    return functions;
  }
)();

// export the functionality to a pre-prepared var
deterministic = wrapper;
