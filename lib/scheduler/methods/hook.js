/**
   * Indicates a fallback target when an error is encountered.
   * @category Flow
   * @param {String|Integer} [onError] - Determines fallback behaviour. If integer: jump, if not stop with error code err. If ommited resets the hook.
   * @param {Integer} [errorCode=1] - Error code for stopping hook.
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
   * @example
   * hook @problem
   * hook
   * fail "Something caused an error"
   * @problem
   * done "Something went wrong."
   * // this will fail with "Something caused an error" because hook without parameters resets the hook
   */
exports.hook = data => function (p, jumpOrErrOrData, errorCode) {
  p.hook(jumpOrErrOrData, errorCode);
  return p.next(data);
};
