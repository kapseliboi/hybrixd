# GIT WORKFLOW FOR DEVELOPMENT

*The name 'issue(s)' refers to the general term as found in a Github repository. The 'issues' tab contains a list of submitted issues, which consists of several categories. Examples of categories are bugs, feature requests, enhancements, etc.*

## Create issue
_Create issues for every bug or feature request!_ This enables us to keep track of commits related to the issue. We can do this by starting the commit with the issue number.

**Example:**
`#10-Fix-for-issue`

Provide the issue with a consise name, stating the problem / request as general as possible. Also *add a label* for better overview.

**Make sure to submit issues in their respective repositories: CLI4IOC issues go with 'https://github.com/holosphere/cli4ioc', etc.**

If possible, specify the issue further by dividing it in steps by using checkboxes, like so in Markdown:
`- [ ] Step summary or title`
These can be checked by the assigned developer, keeping track of this issue's progress.

- [.] Step 1
- [.] Step 2
- [ ] Step 3
- [ ] Step 4

## Creating branches related to issue
For every issue, create a separate branch. This way we prevent uploading too many fixes in one go as we separate concerns among issues. This also result in preventing burdening reviewing developers too much.

A branch name is constructed in the following way: prefix by the word 'issue', followed by a '/' (slash). Next, state the issue number, followed by a hyphen. Lastly, add a name that refers the issue. If clearly stated, use the name provided in the issue in the issue's repository.

**Example:**
`issue/17-name-for-issue-fix`

## Commiting to a branch
Issues can be referenced in commits by prefixing the commit with a '#' (hash), followed by the issue number. By doing so, these commits will be listed in the requested issue in the repository.