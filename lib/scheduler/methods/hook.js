/**
   * Indicates a fallback target when an error is encountered.
   * @category Flow
   * @param {String|Integer} onError - Determines fallback behaviour. If integer: jump, if not stop with error code err
   * @param {Integer} [err=1] - Error code for stopping hook.
   * @example
   * hook "Something went wrong." 0
   * fail "Something caused an error"
   * // this will fail but the hook will cause a non error output of "Something went wrong."
   * @example
   * hook "Something went wrong." 1
   * fail "Something caused an error"
   * // this will fail but the hook will overwrite the error output with "Something went wrong."
   * @example
   * hook 2
   * fail "Something caused an error"
   * done "Something went wrong."
   * // this will fail but the hook will cause a jump and a non error output of "Something went wrong."
   * @example
   * hook @problem
   * fail "Something caused an error"
   * @problem
   * done "Something went wrong."
   * // this will fail but the hook will cause a jump and a non error output of "Something went wrong."
   */
exports.hook = data => function (p, jumpOrErrOrData, err) {
  const process = global.hybrixd.proc[p.parentID];
  if (typeof jumpOrErrOrData !== 'number') {
    process.hook = {data: jumpOrErrOrData, err: typeof err === 'undefined' ? 1 : err};
    return this.next(p, 0, data);
  } else if (jumpOrErrOrData === 0) {
    return this.stop(p, 'hook: illegal zero jump.');
  } else if (jumpOrErrOrData + process.step < 0) {
    return this.stop(p, 'hook: illegal negative jump.');
  } else if (jumpOrErrOrData + process.step > process.steps) {
    return this.stop(p, 'hook: illegal out of bounds jump.');
  } else {
    process.hook = {jump: (jumpOrErrOrData + process.step), err: typeof err === 'undefined' ? 1 : err};
    return this.next(p, 0, data);
  }
};
