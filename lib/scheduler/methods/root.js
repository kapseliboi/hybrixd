/**
   * Check whether process has sufficient permissions.
   * @category Flow
   * @param {Integer} [onRoot]
   * @param {Integer} [onNotRoot]
   * @example
   * root         // fails if not root
   * root 1 2     // jumps one if root, two otherwise
   */
exports.root = data => function (p, onRoot, onNotRoot) {
  const isRoot = p.getSessionID() === 1;
  if (typeof onRoot === 'undefined' && typeof onNotRoot === 'undefined') {
    if (isRoot) return p.next(data);
    else return p.fail(403, 'Forbidden');
  } else if (typeof onRoot === 'number') {
    if (isRoot) return p.jump(onRoot, data);
    else if (typeof onNotRoot === 'number') return p.jump(onNotRoot, data);
    else return p.fail(403, 'Forbidden');
  } else {
    return p.fail('root: expected jump labels.');
  }
};
