/**
   * Serve a file
   Note: can only be defined as singular command in a method
   * @category Process
   * @param {String} path - File path of the file to serve
   * @example
   * serv myFile.html
**/

exports.serv = data => function (p, name) {
  p.fail('serv: can only be run as singular command');
};
