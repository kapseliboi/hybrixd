# Router

Examples of paths:

/command/reload         Reloads hybridd
/asset/btc/balance/1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX      Returns the
balance of bitcoin asset for address 1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX

Files

routetree.json            Describes possible REST API paths
router.js                 First level routing
router/[node].js          Describes the routing for /[node]/...

recipes/engine.*.json     These files contain the routing specific to each
engine.
recipes/source.*.json     These files contain the routing specific to each source.

Features

_access Describes the required access level for a command

Options:
root  Root

Example:

{
  "command":{
  "_access":"root",
  ...
}

Only root may access /command  and subsequent paths such as /command/hello/world


_alias  Describes an alias of a command

Example:

{
  "a":{"_alias":"asset"},
  "asset":{...}
}

/a/hello/world now points to /asset/hello/world

_help Describes the help for this path.
_this Describes the help for this path and indicates that this is a valid end node

Note that _help differs from _this because _this makes a path a valid command, _help indicicates that the path should be followed by more

Example

{
  "command":{
    "_help" : "Execute a command.",
    "hi" : "Display hi"
    "hello" : {
      "_this" : "Display hello",
      "world" : "Display hello world"
    }
  }
}

/command                is not a valid command, but executing will display the help message
/command/hi             is a valid command.
/command/hello          is a valid command.
/command/hello/world    is a valid command.

_list Describes a dynamic list.
_ref  Indicates that this path node should be part of a dynamic list

Example:

{
  "asset":{
    "_ref":{
      "_list":"asset",
      "hello":"Display hello",
      ...
    }
  }
}

/asset/x/hello  executes hello for asset x if asset x exists. Error otherwise.

_this See _help
