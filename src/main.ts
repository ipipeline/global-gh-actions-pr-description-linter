import * as core from '@actions/core'
import * as github from '@actions/github'
import {PrBodyValidationService} from './pr-body-validation.service'

const repoTokenInput = core.getInput('repo-token', {required: true})
const githubClient = github.getOctokit(repoTokenInput)

async function run(): Promise<void> {
  try {
    core.debug(new Date().toTimeString())

    // The pull_request exists on payload when a pull_request event is triggered.
    // Sets action status to failed when pull_request does not exist on payload.
    const pr = github.context.payload.pull_request
    if (!pr) {
      core.setFailed(
        `github.context.payload.pull_request does not exist. Have the correct event triggers been configured?`
      )
      return
    }

    core.debug(`PR body: ${pr.body}`)

    const prBodyValidationService = new PrBodyValidationService()
    const result = await prBodyValidationService.validateBody(pr.body)

    // Get owner and repo from context
    const repo = github.context.repo.repo
    const repoOwner = github.context.repo.owner
    
    const pullRequest = github.context.issue

    const prOwner = github.context.issue.owner

    core.debug(`repo: ${repo}`)
    core.debug(`repoOwner: ${repoOwner}`)
    core.debug(`prOwner: ${prOwner}`)

    const p2 = github.context.payload.pull_request
    if (!p2) {
      return undefined
    }

    const prOwner2 = p2.user.login;
    core.debug(`prOwner2: ${prOwner}`)
    

    // Create a comment on PR
    if (result.isPrBodyComplete) {
      const response = await githubClient.issues.createComment({
        owner: repoOwner,
        repo,
        issue_number: pr.number,
        body: result.message
      })

      core.debug(`created comment URL: ${response.data.html_url}`)
      core.setOutput(`comment-url`, response.data.html_url)
      core.setOutput(
        `responseMessage`,
        `✅ All checks passed: ${result.message}`
      )
      dismissReview(pullRequest)
    } else {
      core.setOutput(
        `responseMessage`,
        `🚧 PR Body incomplete: ${result.message}`
      )
      createReview(result.message, pullRequest)
    }

    core.debug(new Date().toTimeString())
  } catch (error) {
    core.setFailed(error.message)
  }
}

function createReview(
  comment: string,
  pullRequest: {owner: string; repo: string; number: number}
): void {
  void githubClient.pulls.createReview({
    owner: pullRequest.owner,
    repo: pullRequest.repo,
    pull_number: pullRequest.number,
    body: comment,
    event: 'REQUEST_CHANGES' // Could use "COMMENT"
  })
}

async function dismissReview(pullRequest: {
  owner: string
  repo: string
  number: number
}): Promise<void> {
  const reviews = await githubClient.pulls.listReviews({
    owner: pullRequest.owner,
    repo: pullRequest.repo,
    pull_number: pullRequest.number
  })

  for (let i = 0; i < reviews.data.length; i++) {
    const review = reviews.data[i]
    if (
      isGitHubActionUser(review.user?.login) &&
      alreadyRequiredChanges(review.state)
    ) {
      void githubClient.pulls.dismissReview({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        pull_number: pullRequest.number,
        review_id: review.id,
        message: "All actions resolved, you're good to go ✅"
      })
    }
  }
}

function isGitHubActionUser(login: string | undefined): boolean {
  return login === 'github-actions[bot]'
}

function alreadyRequiredChanges(state: string): boolean {
  return state === 'CHANGES_REQUESTED'
}

run()
