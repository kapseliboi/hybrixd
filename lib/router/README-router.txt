Examples of paths:

/command/reload         Reloads hybridd d
/asset/btc/balance      Returns the balance of bitcoin asset

Files

routetree.json      describes possible REST API paths
router.js           first level routing
router/[node].js    describes the routing for /[node]/...

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

_ref  See _ref

_this See _help

_valid Indicates that the path is valid dispite wat follows. It is left up to the underlying code to do any error handling and help messaging

Example:

{
  "xpath":{
    "_valid":true
  }
}

/xpath/hello/world/hello/moon/.../hello/stars   is a valid command.
