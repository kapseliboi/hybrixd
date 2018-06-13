# Modules

There are two different types of modules ($TYPE)

- Sources : Output only
- Engines : Input and Output

A module consists of a folder `$HYBRIDD_HOME/modules/$MODULE_NAME`
containing at least the following files:

- `module.js`         The main code
- `package.json`      The package information

and a recipe `$HYBRIDD_HOME/recipes/$TYPE.$MODULE_NAME.json`.


## module.js

should export at least the following two functions:

exports.init = init;
exports.exec = exec;

function init(){
   // do whatever is needed to initialize
}

Init is called upon initialization of the module.

function exec(properties) {
  /*
  properties = {
    command,  // xpath of the request for example ["source,","storage","set","hello","world"]
    processID,
    target // the target recipe
  }
  */
}

Exec is called throught the router. For example the API call
"/source/mysource/do/it" will call exec({command:["do","it"], processID,target })
