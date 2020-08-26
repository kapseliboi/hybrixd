/**
   * Execute a javascript module function and return the result directly (used for serving web content through api). Only if the script is run from a recipe with a non-Quartz module defined.
   Note: can only be defined as singular command in a method
   * @category Process
   * @param {String} name - Name of the function. Passing arguments is possible.
   * @example
   * sync myFunction
   *
   * module.js:
   * function myFunction(proc,data){
   *   proc.done('hello world');
   * }
**/

exports.sync = data => function (p, name) {
  p.fail('sync: can only be run as singular command');
};
