function appendProgram (program, label, steps) {
  if (label === '') { // [...] => [..., step1, step2, ...]
    return program.concat(steps);
  } else if (program.length < 2 || program[program.length - 1] !== 'parallel') {
    program = program.concat([{}, 'parallel']); // [...] => [..., {},'parellel']
  }
  // [..., {x: {..}, [label]: * }, 'parallel']
  const subLabels = label.split('.');
  const subLabel = subLabels[0];
  const subProgram = program[program.length - 2];
  if (!subProgram.hasOwnProperty(subLabel)) { // [..., {},'parellel'] => [..., {[subLabel]:{data:[],step:'sequential'}},'parellel']
    subProgram[subLabel] = {data: [], step: 'sequential'};
  } else if (subProgram[subLabel].step !== 'sequential') {
    // [..., {[subLabel]:{data:$DATA,step:'$STEP'}},'parellel'] => [..., {[subLabel]:{data:[$DATA,$STEP],step:'sequential'}},'parellel']
    const data = subProgram[subLabel].data;
    const step = subProgram[subLabel].step;
    subProgram[subLabel].data = [data, step];
    subProgram[subLabel].step = 'sequential';
  }
  subProgram[subLabel].data = appendProgram(subProgram[subLabel].data, subLabels.slice(1, subLabels.length).join('.'), steps);
  return program;
  // [..., {[subLabel]:{data:[...],step:'sequential'}},'parellel'] => [..., {[subLabel]:{data:[..., step1, step2, ...],step:'sequential'}},'parellel']
}

/**
   * Add a step to a client stack program. Executed using exec.
   * @category Interface
   * @param {String} key - Variable name to get data from.
   * @example
   * TODO
   */
exports.step = program => function (p, v1, v2, v3) {
  const args = Array.prototype.slice.call(arguments);
  const labelOrStep = args[1];
  let steps;
  let label;
  if (typeof labelOrStep !== 'string' || this.hasOwnProperty(labelOrStep)) {
    label = '';
    steps = args.slice(1);
  } else {
    label = labelOrStep;
    steps = args.slice(2);
  }
  this.next(p, 0, appendProgram(program, label, steps));
};
