/*
    Not used by qrtz programmers. Internally used by scheduler. Goes to the next step of execution.
    err:    Set the error flag of the subprocess.  (0 = no error, 1 or higher = error)
    data:   Store data in the subprocess data field.
  */
exports.next = () => function (p, err, xdata) { // TODO refactor away;
  p.next(xdata);
};
