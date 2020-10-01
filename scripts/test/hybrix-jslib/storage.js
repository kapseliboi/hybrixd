const KEY = 'test832uiwe3';
const VALUE = 'test324jfs';
const ENCRYPTED_VALUE = 'RVlSZ3BnYkFaZ1RBeGdaZ0J4Z0N3SFlTb25BaGdWblRCbnhpUUFZQk9QWGRRZ0V4am9YUVZ1UmQxMkdIdnZRekFJUUE=';
const LEGACY_KEY = '4cae9df3edf7df66973a03bc0e7e101b0008baca997dd1147019fac56850304e-test832uiwe3';

const storageTests = (local, remote) => [
// SAVE/LOAD ENCRYTPED
  {key: KEY, value: VALUE, local, remote}, 'save',
  {key: KEY, local, remote}, 'load',

  value => ({condition: value === VALUE, message: 'Loaded data was corrupted'}), 'assert',

  {key: KEY, encrypted: false, local, remote}, 'load', // Check if content is actually encrypted
  undecryptedValue => ({condition: undecryptedValue === ENCRYPTED_VALUE, message: 'Loaded encrypted data was corrupted'}), 'assert',

  // SAVE/LOAD UNENCRYTPED
  {key: KEY, value: VALUE, encrypted: false, local, remote}, 'save',
  {key: KEY, encrypted: false, local, remote}, 'load',
  value => ({condition: value === VALUE, message: `Loaded non encrypted data was corrupted  ${value} ${VALUE}`}), 'assert',

  // SEEK (should succeed)
  {key: KEY, local, remote}, 'seek',
  keyFound => ({condition: keyFound, message: 'Key not found'}), 'assert',

  // BURN (reset)
  {key: KEY, local, remote}, 'burn',

  // SEEK (should fail)
  {key: KEY, local, remote}, 'seek',
  keyFound => ({condition: !keyFound, message: 'Key found when it should have been deleted'}), 'assert',

  // SAVE/LOAD LEGACY
  {key: KEY, value: VALUE, legacy: true, local, remote}, 'save',
  {key: KEY, legacy: true, local, remote}, 'load',
  value => ({condition: value === VALUE, message: 'Loaded data was corrupted'}), 'assert',
  {key: LEGACY_KEY, encrypted: false, local, remote}, 'load', // Check if content is actually encrypted
  undecryptedValue => ({condition: undecryptedValue === ENCRYPTED_VALUE, message: `Loaded encrypted data was corrupted ${undecryptedValue} ${ENCRYPTED_VALUE} `}), 'assert',

  // SEEK LEGACY (should succeed)
  {key: KEY, legacy: true, local, remote}, 'seek',
  keyFound => ({condition: keyFound, message: 'Legacy key not found'}), 'assert',

  // SEEK LEGACY (should succeed)
  {key: LEGACY_KEY, local, remote}, 'seek',
  keyFound => ({condition: keyFound, message: 'Legacy key not found'}), 'assert',

  // BURN LEGACY (reset)
  {key: KEY, legacy: true, local, remote}, 'burn',

  // SEEK LEGACY (should fail)
  {key: KEY, legacy: true, local, remote}, 'seek',
  keyFound => ({condition: !keyFound, message: 'Legacy key found when it should have been deleted'}), 'assert'

];

// TODO test work, queue
// TODO  test mergeStrategy & sync
// TODO test list

exports.steps = [
  {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
  //  ...storageTests(true, true),
  //  ...storageTests(false, true),
  ...storageTests(true, false)
];
exports.validate = (success, data) => success;
