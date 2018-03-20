*** PROCESS SCHEDULER INSTRUCTIONS ***



 data <= variable

The variable 'data' always contains the results of the previous subprocess.
If you need to store this data for later use, copy its contents into a variable using the command 'poke'.

Example:
 poke("storeme",data)
 stop(1,"Major error! Data contents: "+JSON.stringify(data))



 time(time [,data] )

Force set timeout of current process.

time:   Amount of milliseconds to wait.
data:   Store data in this subprocess data field.

Examples:
 time(0)                 // unlimited timeout
 time(8000,"Timeout!")   // set a timeout of 8 seconds for the process and return data "Timeout!"



 wait(time [,data] )

Wait for a specified amount of milliseconds.

time:   Amount of milliseconds to wait.
data:   Store data in this subprocess data field.

Examples:
 wait(2000)           // wait for two seconds
 wait(1000,"WOOT!")   // wait for one second and fill subprocess data field with value "WOOT!"



 prwt(pid)

Wait for a process to finish before continuing execution.  TODO: Will be rewritten to be able to wait for multiple processes!
Note: Process ID's are always strings, not numbers!

pid:    Process ID to wait for.

Examples:
  prwt("101123")        // wait for process with ID 101123 to finish, then continue
  prwt("209123")        // wait for process with ID 209123 to finish, then continue

Other options: done, hold ???


 logs(level,message [,data] )

Log to the console

level:      Log level between 0-2.
message:    The message you want to log.
data:       Store data in this subprocess data field. (Passed to parent process on stop.)

Examples:
  logs(0,"Nice dude!")   // logs "[.] Nice dude!" to console

  dump(data)

Dump (debug data)to the console

data:       Store data in this subprocess data field. (Passed to parent process on stop.)

Examples:
  logs(0,{foo:"bar"})   // logs '[D] {foo:"bar"}' to console


 pass(data)

Pass data to the parent process.

data:       Store data in this subprocess data field. (Passed to parent process on stop.)

Examples:
  pass("Nice dude!")   // push data "Nice dude!" to master process
  pass("Wow: "+data)   // push data "Wow:" with previous subprocess data concatenated

Preferred option: pass !


 prog(step [,steps] [,data] )

Force set the progress level of the parent process.

step:   Current step in the progress. (Value -1 restores automatic progress reporting.)
steps:  Total amount of steps.
data:       Store data in this subprocess data field. (Passed to parent process on stop.)

Examples:
  prog(20,40)  // progress is set to 0.5 (which means 50%)
  prog(-1)     // restore automatic progress reporting


 func(module, function [,data] )

Run a module's javascript function.

module:     Name of the module.
function:   Name of the javascript function.
data:       Store data in this subprocess data field. (Passed to parent process on stop.)

Examples:
  stop(1)                         // stop processing and set error to 1
  stop(0,"Everything is ok.")     // stop processing, set no error, and put "Everything is ok." in main process data field
  stop(404,"HELP! Not found.")    // stop processing, set error to 404, and put "HELP! Not found." in main process data field


 stop(err [,data] )

Stop processing and return data.

err:    Set the error flag of the subprocess.   (0 = no error, 1 or higher = error)
data:   Store data in this subprocess data field. (Passed to parent process on stop.)

Examples:
  stop(1)                         // stop processing and set error to 1
  stop(0,"Everything is ok.")     // stop processing, set no error, and put "Everything is ok." in main process data field
  stop(404,"HELP! Not found.")    // stop processing, set error to 404, and put "HELP! Not found." in main process data field



 jump(jmp [,data] )

Jump forward or backward and X amount of instructions.

jmp:    Amount of instructions lines to jump.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
data:   Store data in this subprocess data field.

Examples:
  jump(2)         // jump over the next instruction
  jump(-3)        // jump backwards three instructions
  jump(1,"Yo!")   // step to the next instruction, and fill data field of this subprocess with "Yo!"



 test(if,true [,false] [,data] )

Test a condition and jump on result.

if:     Javascript condition to test. (Example: a>5)
true:   Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
false:  Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
data:   Store data in this subprocess data field.

Examples:
  test(a>3,1,-3)    // test if a>3, if true jump to the next instruction, if false jump back three instructions
  test(b<=1,-4,1)   // test if b<=1, if true jump back four instructions, if false jump to the next instruction
  test(a>3,-5)      // test if a>3, if true jump back five instructions, else default jump to the next instruction

 tran(p,property, testObject, invalid,[valid], [data])

checks if properties exists in testObject and uses that to create a
transformed object. On success of the check it to valid or next, if
not passes the testObject to invalid

property: A (or nested array/dicationary of) strings containing string
values or the property paths to test (Example: "foo.bar")

data:     Store data in this subprocess data field.
invalid:  Amount of instructions lines to jump when property does not exist.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
valid:    Amount of instructions lines to jump when property exists.           (1 = jump forward 1 instruction, -2 = jump backward two instructions)

Examples:
  tran(".foo",2,{foo:"bar"})                  // Passes "bar" to next
  tran (".foo.bar[2]",2,{foo:{bar:[0,1,5]}})   // Passes 5 to next
  tran (".foo.bar[2]",2,{foo:"bar"})           // Jumps 2 instructions and passes {foo:"bar"}
  tran ([".foo",".hello"],2,{foo:"bar",hello:"world"})           // Passes ["bar","world"] to next
  tran ({a:".foo",b:".hello",c:"test"},2,{foo:"bar",hello:"world"})  // Passes {a:"bar", b:"world", c:"test"} to next

  form(data, factor)

Format a (balance) number) and passes it to next

data:   Contains a number
factor: Contains a number

Examples:

  curl(p,target, querystring,method,[data,headers,overwriteProperties])

creates an api call in the API queue

target:       A string containing on of the following options
- "[user[:password]@]host[:port]"
- "asset://base[.mode]"
- "source://base[.mode]"
querystring:  A string containig the querypath  (Example: "/road/cars?color=red")
method:       GET,POST or PUT
data:         Data passed to call (optional)
headers:       headers passed to call (optional)
overwriteProperties: (optional)
- retry: max nr of retries allowed
- throttle:
- timeout:
- interval:
- user:
- password:
- proxy:
- host:

Examples:

TODO




 poke(var [,data] )

Put data in a variable for later use. Use peek to retrieve. The data is stored in the root parent process under 'vars'. (You can see this poked data stored in global.hybridd.proc[rootID].vars, but a better way to use this data is by using the command peek("varname").

var:    Variable name to put data in.
data:   The data to store in the variable. This is also stored in this subprocess data field.

Examples:
  poke("thisnum",55)          // poke 55 into variable "thisnum"
  poke("coolness","Wooty.")   // poke "Wooty." into variable "coolness"



 peek(var)

Gets data from a variable that was defined by poke. Used inside of other instructions.

var:    Variable name to get data from.

Examples:
  stop(0,peek("y"))           // stop and fill main process variable with peeked variable "y"
  test( peek("i")<5 ,-4)      // test if peeked variable "i" is smaller than 5, if true jump back four instructions, if false continue program



 jstr(string)

Turn a string into a JSON object.

string:	String to turn into a JSON object.

Examples:
 stop(0,jstr("{key:'Some data.'"))	// stops processing and returns {key:"Some data."}
 poke("myvar",jstr(data))                   // turns data into JSON, and pokes it to 'myvar'



 coll(steps)

Collate or collect data from previous subprocess steps into an array.

steps:	Number of previous steps to collate. Zero value means all previous steps.

Examples:
  coll(0)                 // collate data of all previous steps
  coll(5)                     // collate data of the last five steps



 next(err [,data] )

Not used by you as programmer. Internally used by scheduler. Goes to the next step of execution.

err:    Set the error flag of the subprocess.  (0 = no error, 1 or higher = error)
data:   Store data in the subprocess data field.

Examples: NOT USED BY PROGRAMMERS, SO NO EXAMPLES.
