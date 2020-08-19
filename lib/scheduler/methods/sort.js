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

const objectOrArrayHasKey = (objectOrArray, key) => objectOrArray instanceof Array
  ? Number(key) >= 0 && key < objectOrArray.length
  : objectOrArray.hasOwnProperty(key);

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

const sortObjectByKey = (sortBy, key) => (a, b) => sortBy(a[key], b[key]);

function sortArrayOfObjects (array, prop) {
  if (prop.toUpperCase() === 'VAL') return {err: `sort: expected property to sort by for objects.`};
  const key = prop.replace('.', '').replace('[', '').replace(']', '');
  let sortBy;
  for (let object of array) {
    if (typeof object !== 'object' || object === null) return {err: 'sort expected array of all objects'};
    if (!objectOrArrayHasKey(object, key)) return {err: `sort: expected all values to have key '${key}'`};
    const value = object[key];
    sortBy = determineSortBy(sortBy, value);
    if (sortBy.err) return sortBy;
  }
  array.sort(sortObjectByKey(sortBy, key));
  return array;
}

function sortArrayOfNumbersOrStrings (array) {
  let sortBy;
  for (let value of array) {
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
