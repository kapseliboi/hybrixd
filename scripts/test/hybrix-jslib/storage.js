const KEY = 'test832uiwe3';
const VALUE = 'test324jfs';
const ENCRYPTED_VALUE = 'RVlSZ3BnYkFaZ1RBeGdaZ0J4Z0N3SFlTb25BaGdWblRCbnhpUUFZQk9QWGRRZ0V4am9YUVZ1UmQxMkdIdnZRekFJUUE=';
const LEGACY_KEY = '4cae9df3edf7df66973a03bc0e7e101b0008baca997dd1147019fac56850304e-test832uiwe3';

exports.steps = [

  {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',

  // SAVE/LOAD ENCRYTPED
  {key: KEY, value: VALUE}, 'save',
  {key: KEY}, 'load',
  value => ({condition: value === VALUE, message: 'Loaded data was corrupted'}), 'assert',
  {key: KEY, encrypted: false}, 'load', // Check if content is actually encrypted
  undecryptedValue => ({condition: undecryptedValue === ENCRYPTED_VALUE, message: 'Loaded encrypted data was corrupted'}), 'assert',

  // SAVE/LOAD UNENCRYTPED
  {key: KEY, value: VALUE, encrypted: false}, 'save',
  {key: KEY, encrypted: false}, 'load',
  value => ({condition: value === VALUE, message: `Loaded non encrypted data was corrupted  ${value} ${VALUE}`}), 'assert',

  // SEEK (should succeed)
  {key: KEY}, 'seek',
  keyFound => ({condition: keyFound, message: 'Key not found'}), 'assert',

  // BURN (reset)
  {key: KEY}, 'burn',

  // SEEK (should fail)
  {key: KEY}, 'seek',
  keyFound => ({condition: keyFound, message: 'Key found when it should have been deleted'}), 'assert',

  // SAVE/LOAD LEGACY
  {key: KEY, value: VALUE, legacy: true}, 'save',
  {key: KEY, legacy: true}, 'load',
  value => ({condition: value === VALUE, message: 'Loaded data was corrupted'}), 'assert',
  {key: LEGACY_KEY, encrypted: false}, 'load', // Check if content is actually encrypted
  undecryptedValue => ({condition: undecryptedValue === ENCRYPTED_VALUE, message: `Loaded encrypted data was corrupted ${undecryptedValue} ${ENCRYPTED_VALUE} `}), 'assert',

  // SEEK LEGACY (should succeed)
  {key: KEY, legacy: true}, 'seek',
  keyFound => ({condition: keyFound, message: 'Legacy key not found'}), 'assert',

  // SEEK LEGACY (should succeed)
  {key: LEGACY_KEY}, 'seek',
  keyFound => ({condition: keyFound, message: 'Legacy key not found'}), 'assert',

  // BURN LEGACY (reset)
  {key: KEY, legacy: true}, 'burn',

  // SEEK LEGACY (should fail)
  {key: KEY, legacy: true}, 'seek',
  keyFound => ({condition: keyFound, message: 'Legacy key found when it should have been deleted'}), 'assert'
];
exports.validate = (success, data) => success;
