/**
   * Initiates a client stack program. This stack can be filled by using step and executed using exec.
   * @category Interface
   * @example
   * init     // initiates a hybrixd.Interface stack program
   */
exports.init = () => function (p) {
  this.next(p, 0, ['init']);
};
