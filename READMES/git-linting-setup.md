# GIT LINTING SETUP

## Setup
1. Download 'npm'
2. Install eslint + (semi-standard) dependencies `npm i -g eslint-plugin-promise eslint-plugin-standard eslint-plugin-react`
3. Install Standard and Semi-Standard configurations `npm i -g eslint-config-standard eslint-config-semistandard`
4. Run `coldstart_hybridd` to copy *Git pre-push hook* and to set up permissions for `./git/hooks/pre-push`

## How to use
The Pre-push hook **only** diffs **.js files** against the master branch. Changed .js files are then being checked by Eslint for errors. Only when no errors occur will the push be successful.

Automatic fixes can be applied in non-trivial cases using:
`eslint --fix file-name`