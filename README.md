<p align="center">
  <a href="https://github.com/ipipeline/global-gh-actions-pr-description-linter/actions/workflows/build-test.yml">
    <img alt="Build/Test status" src="https://github.com/ipipeline/global-gh-actions-pr-description-linter/workflows/build-test/badge.svg"></a>
</p>

# Description
Use this action to validate the body of your pull requests.
- Use placeholders to ensure the author(s) and reviewer(s) are completing the sections you want completed
- Enforce author(s) and reviewer(s) to sign off against your quality measures such as your definition of done

## Pre-requisites
It is highly recommended to use this GitHub Action in-conjunction with a Pull Request Template. An example called "pull_request_template.md" can be found in docs/pull_request_template.md of this repo!.

In order to be compatible with this GitHub Action, the PR Template must contain the following values: 
### Placeholders for additional details
`{{!!DETAILS GO HERE!!}}`

This is a placeholder to prompt authors/reviewers to complete a given section of the PR Body. The GitHub action will fail until no further placeholders are found.

### Checkboxes for sign off
`- [] **Author(s):**`

`- [] **Reviewer(s):**`

The GitHub action will fail until these checkboxes are found in the description and have been accepted. 
Note: There is nothing to prevent anyone checking the boxes but it is designed to be checked by the author(s) and reviewer(s)

## Usage

```yaml
name: 'pr-description-linter'

on: # rebuild any PRs and main branch changes
  pull_request_target:
    types: [opened, edited, reopened]
jobs:
  pr_description_lint:
    runs-on: ubuntu-latest
    name: A job to check the PR description

    concurrency: # ensure only one job is running at a time
      group: ${{ github.head_ref }} 
      cancel-in-progress: true

    steps:
    - name: ✅ PR Description Linter
      id: prlint
      uses: ipipeline/global-gh-actions-pr-description-linter@main
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        whitelisted-authors-pattern: author names # Optional value to skip checks based on author name(s) (e.g. for automated PR's from renovate)

    # Optional step - use the output from the `prlint` step to do something else? This example just echos the message to screen
    - name: 🖋 Get the output response message
      run: echo "Response- ${{ steps.prlint.outputs.responseMessage }}"
```

:rocket: See the [actions tab](https://github.com/ipipeline/global-gh-actions-pr-description-linter/actions) for runs of this action! 



