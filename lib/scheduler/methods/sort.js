const errorMessage = 'sort: expected sortable type: string, object, array  of strings, array of numbers, array of objects or array of arrays';

const sortNumbers = (a, b) => Number(a) - Number(b); // SORT NUMBERS
const sortLocale = (a, b) => String(a).localeCompare(String(b)); // SORT LOCALE STRING

const isNumeric = value => typeof value === 'boolean' || !isNaN(value);

const argumentHasInValidType = arg => typeof arg !== 'undefined' && typeof arg !== 'string';

const resolveParameters = ([fst, snd]) => {
  if (fst instanceof Array && fst.length === 1) fst = '[' + fst[0] + ']'; // ensure [0] can be used as parameter
  if (snd instanceof Array && snd.length === 1) snd = '[' + snd[0] + ']'; // ensure [0] can be used as parameter

  return [fst, snd].some(argumentHasInValidType)
    ? [null, null, 'sort: Expected arguments to be string']
    : setOrderingArguments(fst, snd);
};

const setOrderingArguments = (fst, snd) => {
  let keyValProp = 'VAL';
  if (typeof fst === 'string' && (fst.startsWith('[') || fst.startsWith('.') || fst.toUpperCase() === 'KEY' || fst.toUpperCase() === 'VAL')) keyValProp = fst;
  else if (typeof snd === 'string' && (snd.startsWith('[') || snd.startsWith('.') || snd.toUpperCase() === 'KEY' || snd.toUpperCase() === 'VAL')) keyValProp = snd;

  let order = 'ASC';
  if (typeof fst === 'string' && (fst.toUpperCase() === 'DESC' || fst.toUpperCase() === 'ASC')) order = fst;
  else if (typeof snd === 'string' && (snd.toUpperCase() === 'DESC' || snd.toUpperCase() === 'ASC')) order = snd;

  return [order, keyValProp];
};

const objectOrArrayHasKey = (objectOrArray, keyPath) => {
  const key = keyPath[0];
  if (objectOrArray instanceof Array) {
    if (Number(key) < 0 && key >= objectOrArray.length) return false;
  } else if (!objectOrArray.hasOwnProperty(key)) return false;
  return keyPath.length === 1
    ? true
    : objectOrArrayHasKey(objectOrArray[key], keyPath.slice(1));
};

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
  if (typeof sortable !== 'string' && (typeof sortable !== 'object' || sortable === null)) return p.fail(errorMessage);
  else {
    const [order, keyValProp, err] = resolveParameters(args);
    if (err) return p.fail(err);

    const result = sortByType(sortable, order, keyValProp);
    if (result.err) p.fail(result.err);
    return p.next(result);
  }
};

// Sort by method depending on Sortable type
const sortByType = (sortable, order, keyValProp) => {
  if (typeof sortable === 'string') return sortString(sortable, order);
  else if (sortable instanceof Array) return sortArray(sortable, order, keyValProp);
  else if (typeof sortable === 'object' && sortable !== null) return sortObject(sortable, order, keyValProp);
  else return { err: errorMessage };
};

function determineSortBy (sortBy, value) {
  if (isNumeric(value)) {
    if (sortBy === sortNumbers || typeof sortBy === 'undefined') return sortNumbers;
    else return sortLocale; // in case of mixed numbers and strings use sortLocale
  } else if (typeof value === 'string') return sortLocale;
  else return {err: 'sort: illegal mixed array'};
}

const sortObjectByKey = (sortBy, keyPath) => (a, b) => {
  const key = keyPath[0];
  const subA = a[key];
  const subB = b[key];
  return keyPath.length === 1
    ? sortBy(subA, subB)
    : sortObjectByKey(sortBy, keyPath.slice(1))(subA, subB);
};

function getValue (object, keyPath) {
  const key = keyPath[0];
  if (keyPath.length === 1) return key;
  if (typeof object !== 'object' || object === null) return undefined;
  return getValue(object[key], keyPath.slice(1));
}

function sortArrayOfObjects (array, prop) {
  if (prop.toUpperCase() === 'VAL') return {err: 'sort: expected property to sort by for objects.'};
  const key = prop.replace('.', '').replace('[', '').replace(']', '');
  const keyPath = key.split('.');
  let sortBy;
  for (const object of array) {
    if (typeof object !== 'object' || object === null) return {err: 'sort expected array of all objects'};
    if (!objectOrArrayHasKey(object, keyPath)) return {err: `sort: expected all values to have key '${key}'`};
    const value = getValue(object, keyPath);
    sortBy = determineSortBy(sortBy, value);
    if (sortBy.err) return sortBy;
  }
  array.sort(sortObjectByKey(sortBy, keyPath));
  return array;
}

function sortArrayOfNumbersOrStrings (array) {
  let sortBy;
  for (const value of array) {
    sortBy = determineSortBy(sortBy, value);
    if (sortBy.err) return sortBy;
  }
  array.sort(sortBy);
  return array;
}

const sortArray = (array, order, prop) => {
  if (array.length === 0) return array;
  const head = array[0];

  const sortedArray = (typeof head === 'object' && head !== null)
    ? sortArrayOfObjects(array, prop)
    : sortArrayOfNumbersOrStrings(array);

  if (sortedArray.err) return sortedArray;

  return order.toUpperCase() === 'DESC'
    ? array.reverse()
    : array;
};

const sortString = (string, order) => {
  const sorted = [...string]
    .sort((a, b) => a.localeCompare(b));
  const orderedElements = order.toUpperCase() === 'DESC'
    ? sorted.reverse()
    : sorted;
  return orderedElements.reduce((a, b) => a + b, ''); // SORT STRING
};

// sort object by created a nested array from its entries, sorting that and rebuilding that into an object
const sortObject = (object, order, keyValProp) => {
  const prop = keyValProp.toUpperCase() === 'KEY' ? '[0]' : '[1]';
  const objectAsArray = Object.entries(object);
  const sortedObjectAsArray = sortArray(objectAsArray, order, prop);
  if (sortedObjectAsArray.err) return sortedObjectAsArray;
  return Object.fromEntries(sortedObjectAsArray);
};

exports.tests = {
  sort: [
    "data '1234'",
    'sort',
    "flow '1234' 1 2",
    'done $OK',
    'fail'
  ],
  sort2: [
    "data '1234'",
    'sort desc',
    "flow '4321' 1 2",
    'done $OK',
    'fail'
  ],
  sort3: [
    'data [1,2,3,4]',
    'sort',
    'flow [1,2,3,4] 1 2',
    'done $OK',
    'fail'
  ],
  sort4: [
    'data [1,2,3,4]',
    'sort',
    'flow [4,3,2,1] 1 2',
    'done $OK',
    'fail'
  ],
  sort5: [
    'data [m,z,a,c]',
    'sort',
    'flow [a,c,m,z] 1 2',
    'done $OK',
    'fail'
  ],
  sort6: [
    'data [m,z,a,c]',
    'sort desc',
    'flow [z,m,c,a] 1 2',
    'done $OK',
    'fail'
  ],
  sort7: [
    'data {a:3,q:1,c:7,m:2}',
    'sort ',
    "flow [{'a': 3},{'c': 7},{'m': 2},{'q': 1}] 1 2",
    'done $OK',
    'fail'
  ],
  sort8: [
    'data {a:3,q:1,c:7,m:2}',
    'sort desc',
    "flow [{'q': 1},{'m': 2},{'c': 7},{'a': 3}] 1 2",
    'done $OK',
    'fail'
  ],
  sort9: [
    'data {a:3,q:1,c:7,m:2}',
    'sort asc val',
    "flow [{'q': 1},{'m': 2},{'a': 3},{'c': 7}] 1 2",
    'done $OK',
    'fail'
  ],
  sort10: [
    'data {a:3,q:1,c:7,m:2}',
    'sort desc',
    "flow [{'c': 7},{'a': 3},{'m': 2},{'q': 1}] 1 2",
    'done $OK',
    'fail'
  ],
  sort11: [
    'data {a:3,q:1,c:7,m:2}',
    'sort asc desc',
    "flow [{'c': 7},{'a': 3},{'m': 2},{'q': 1}] 1 2",
    'done $OK',
    'fail'
  ],
  sort12: [
    'data [[1,3],[1,1],[2,2]]',
    'sort .1 asc',
    'flow [[1,1],[2,2],[1,3]] 1 2',
    'done $OK',
    'fail'
  ],
  sort13: [
    'data [{a:3},{a:1},{a:7},{a:2}]',
    'sort asc .a',
    "flow [{'a': 1},{'a': 2},{'a': 3},{'a': 7}] 1 2",
    'done $OK',
    'fail'
  ],
  sort14: [
    'data [{a:3},{a:1},{a:7},{a:2}]',
    "sort '.a'",
    "flow [{'a': 1},{'a': 2},{'a': 3},{'a': 7}] 1 2",
    'done $OK',
    'fail'
  ],
  sort15: [
    'data null',
    'hook @hook',
    'sort',
    '@hook',
    'done $OK'
  ],
  sort16: [
    'data undefined',
    'hook @hook',
    'sort',
    '@hook',
    'done $OK'
  ],
  sort17: [
    'data false',
    'hook @hook',
    'sort',
    '@hook',
    'done $OK'
  ],
  sort18: [
    'data []',
    'sort asc',
    'flow [] 1 2',
    'done $OK',
    'fail'
  ],
  sort19: [
    'data [{a:3},{a:1},{a:7},{a:2}]',
    'sort desc .a',
    "flow [{'a': 7},{'a': 3},{'a': 2},{'a': 1}] 1 2",
    'done $OK',
    'fail'
  ],
  sort20: [
    'data [{a:{b:3}},{a:{b:1}},{a:{b:7}},{a:{b:2}}]',
    'sort desc .a.b',
    "flow [{'a': {b:7}},{'a': {b:3}},{'a': {b:2}},{'a': {b:1}}] 1 2",
    'done $OK',
    'fail'
  ]
};
