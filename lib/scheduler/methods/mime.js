/**
   * Set the mime type field of a process.
   * @category Process
   * @param {String} data - the data type. default: 'data': data as is;  'file':  for static file content retrieval.
   * @example
   *  mime data            // set the data type to 'data'
   *  done hello           // stop processing, set no error and pass string 'hello'
   * @example
   *  mime file:data       // set the data type to 'file:data'
   *  done hello.txt       // stop processing, set no error and pass the content of the hello.txt file as data in the result json
   * @example
   *  mime file:text/html  // set the data type to 'text/html'
   *  done hello.html      // stop processing, set no error and pass the content of the hello.html file as flat file, resulting in webserver behaviour
   */
exports.mime = data => function (p, type) {
  p.mime(type);
  p.next(data);
};
