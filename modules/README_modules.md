#Create sources, engines and modules

Create a json file called `engine.myengine.json` or  `source.mysource.json` (By convention sources only give output, engines can also receive input) This file will be the module recipe.

A minimal recipe would be the following definition of the engine identifier, the human readable name and routing definition for a command called 'mycommand'

```
{
  "engine":"myengine",
  "name":"My Engine",
  },
  "router" : {
    "mycommand":"This will execute my command",
  }
}
```

'mycommand' will be executed upon calling the api endpoint `/engine/mymodule/mycommand`

To define the behaviour for the command can be defined in two ways.

1) By using the qrtz language

2) By calling a Javascript module.


#QRTZ Module

By using quartz the logic can be defined directly in the recipe. This is preferred for basic modules. A quartz recipe json file can be saved in the `$HYBRIXD/recipes` folder.

```
{
  "engine":"myengine",
  "name":"My Engine",
  "module" : "quartz",
  },
  "quartz" : {
  "mycommand" : [
       "done 'Hello World!'"
  ]

  }

  "router" : {
    "mycommand":"This will execute my command",
  }
}
```

#Javascript module

To use a javascript module create a folder `$HYBRIXD/modules/mymodule`. The recipe json file should be moved to this folder. Create a `module.js` file as well.

```
export mycommand;

function mycommand (proc) {
  proc.pass('Hello World!');
}
```
