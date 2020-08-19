const errorMessage = 'sort: expected sortable type: String, Object, Array String, Array Number or Array Object';
/**
   * Sort data by using a certain method.
   * @category Array/String
   * @param {String} method - Array of methods to employ.
   * @example
   *  sort                                          // input: 'BADEFC', sorts the object ascending by value: 'ABCDEF'
   *  sort desc                                     // input: [10,8,5,9], sorts the object descending by value: [10,9,8,5]
   *  sort asc                                      // input: [10,8,5,9], sorts the object descending by value: [5,8,9,10]
   *  sort .b asc                                   // input: [{'a':4,'b':'B'},{'a':2,'b':'A'}], sorts the array by object key 'b': [{'a':2,'b':'A'},{'a':4,'b':'B'}]
   *  sort .b desc                                  // input: [{'a':4,'b':'B'},{'a':2,'b':'A'}], sorts the array by object key 'b': [{'a':2,'b':'B'},{'a':4,'b':'A'}]
   */

exports.sort = (sortable) => function (p, ...args) {
  if (typeof sortable !== 'string' && (typeof sortable !== 'object' || sortable === null)) {
    return p.fail(errorMessage);
  } else {
    const [order, keyValProp, err] = resolveParameters(args);
    const errorOrSortable = err || sort(sortable, order, keyValProp);

    failOrNext(p, errorOrSortable);
  }
};

const sort = (sortable, order, keyValProp) => {
  const sorted = sortByType(sortable, order, keyValProp);
  const shouldReverse = order.toUpperCase() === 'DESC' && typeof sorted !== 'string' && typeof sorted !== 'boolean';

  return shouldReverse && !sorted.hasOwnProperty('err')
    ? sorted.reverse()
    : sorted;
};

// Sort by method depending on Sortable type
const sortByType = (sortable, order, keyValProp) => {
  if (typeof sortable === 'string') {
    return sortStr(sortable, order);
  } else if (Array.isArray(sortable)) {
    return sortArray(sortable, keyValProp);
  } else if (typeof sortable === 'object' && sortable !== null) {
    const byKey = keyValProp === 'KEY';
    const type = sortableObjValueType(sortable);
    return sortObj(sortable, byKey, type);
  } else {
    return { err: errorMessage };
  }
};

// Find type of a property's value
const sortableObjValueType = sortable => {
  const entries = Object.entries(sortable);
  const head = entries[0];
  return head === undefined
    ? 'undefined'
    : typeof head[1];
};

const sortArray = (xs = [], prop) => {
  if (xs.length === 0) return xs;
  const head = xs[0];

  switch (typeof head) {
    case 'string':
      return xs.sort(sortLocale);
    case 'number':
      return xs.sort(sortNumbers);
    case 'boolean':
      return xs.sort(sortNumbers);
    case 'object':
      if (prop.toUpperCase() === 'VAL') return {err: `sort: expected property to sort by for objects.`};
      const key = prop.replace('.', '');
      // If not all objects contain the property to be sorted on, return errror.
      if (!propsExistOnAll(xs, key)) return {err: `sort: expected all values to have key '${key}'`};
      return xs.sort(sortArrayObj(key));
    default:
      return {err: errorMessage};
  }
};

const objectOrArrayHasKey = (objectOrArray, key) => objectOrArray instanceof Array
  ? Number(key) >= 0 && key < objectOrArray.length
  : objectOrArray.hasOwnProperty(key);

const propsExistOnAll = (xs, key) => xs.reduce((allContainProperty, obj) => objectOrArrayHasKey(obj, key) && allContainProperty, true);

const sortNumbers = (a, b) => a - b; // SORT NUMBERS
const sortLocale = (a, b) => a.localeCompare(b); // SORT LOCALE
const sortStr = (str, order) => {
  const sorted = [...str]
    .sort((a, b) => a.localeCompare(b));
  const orderedElements = order.toUpperCase() === 'DESC'
    ? sorted.reverse()
    : sorted;
  return orderedElements.reduce((a, b) => a + b, ''); // SORT STRING
};

// Sort Array Object
const sortArrayObj = prop => (a, b) => {
  const type = typeof a[prop];
  const fn = type === 'number' ? sortNumbers : sortLocale;
  return fn(a[prop], b[prop]);
};

// Sort object into an Array of Dictionaires by either key or value
const sortObj = (obj, byKey, type) => Object.entries(obj)
  .sort((a, b) => byKey
    ? sortLocale(a[0], b[0])
    : sortByValueType(type)(a[1], b[1])
  )
  .map(([k, v]) => ({[k]: v}));

// Sort object values only by numbers, strings or booleans
const sortByValueType = type => {
  switch (type) {
    case 'number': return sortNumbers;
    case 'boolean': return sortNumbers;
    case 'string': return sortLocale;
    default: return (a, b) => 0;
  }
};

const resolveParameters = ([fst, snd]) => {
  return [fst, snd].some(argumentHasValidType)
    ? [null, null, { err: 'sort: Expected arguments to be string' }]
    : setOrderingArguments(fst, snd);
};

const setOrderingArguments = (fst, snd) => {
  let keyValProp = 'VAL';
  if (typeof fst === 'string' && (fst.startsWith('.') || fst.toUpperCase() === 'KEY' || fst.toUpperCase() === 'VAL')) keyValProp = fst;
  else if (typeof snd === 'string' && (snd.startsWith('.') || snd.toUpperCase() === 'KEY' || snd.toUpperCase() === 'VAL')) keyValProp = snd;

  let order = 'ASC';
  if (typeof fst === 'string' && (fst.toUpperCase() === 'DESC' || fst.toUpperCase() === 'ASC')) order = fst;
  else if (typeof snd === 'string' && (snd.toUpperCase() === 'DESC' || snd.toUpperCase() === 'ASC')) order = snd;

  return [order, keyValProp];
};

const failOrNext = (p, res) => {
  const isError = res.hasOwnProperty('err');
  const data = isError ? res.err : res;
  const method = isError ? 'fail' : 'next';
  p[method](data);
};

const argumentHasValidType = arg => typeof arg !== 'undefined' && typeof arg !== 'string';
