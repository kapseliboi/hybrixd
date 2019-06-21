/**
   * Initiates a client stack program. This stack can be filled using step and executed using exec.
   * @category Interface
   * @example
   * init()     // Initiates a hybrixd.Interface stack program.
   */
exports.init = () => function (p) {
  this.next(p, 0, ['init']);
};
