/**
   * Set data stream to a value.
   * @category Process
   * @param {Object} object - Object to fill the data stream with.
   * @example
   * data test            // Fill the data stream with string 'test'.
   * data {key:'test'}    // Fill the data stream with object {key:'test'}.
   */
this.data = () => function (p, data) {
  this.next(p, 0, data);
};
