/**
   * Execute a javascript module function. Only if the script is run from a recipe with a non-Quartz module defined.
   * @param {String} name - Name of the function. Passing arguments is possible.
   * @category Process
   * @example
   * qrtz:
   * data 'hello'
   * func 'myFunction'
   * done               // returns 'hello world'
   *
   * module.js:
   * function myFunction(proc,data){
   *   proc.done(data+' world');
   * }
   */
exports.func = data => function (p, command, xdata) { // TODO: remove legacy xdata now used by ethereum module
  // TODO check command = string
  command = command.split('/'); // "dummy/balance/_dummyaddress_" => ["dummy","balance","_dummyaddress_"]
  const ydata = typeof xdata === 'undefined' ? data : xdata;
  p.func(command, ydata);
};
