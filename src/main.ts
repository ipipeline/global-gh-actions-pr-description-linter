import * as core from '@actions/core';
import * as github from '@actions/github';
import { PrBodyValidationService } from './pr-body-validation.service';

const repoTokenInput = core.getInput('repo-token', { required: true });
const whiteListedAuthorsPattern = core.getInput('whitelisted-authors-pattern', {
  required: false,
});
const githubClient = github.getOctokit(repoTokenInput);

async function run(): Promise<void> {
  try {
    core.debug(new Date().toTimeString());

    // The pull_request exists on payload when a pull_request event is triggered.
    // Sets action status to failed when pull_request does not exist on payload.
    const pr = github.context.payload.pull_request;
    if (!pr) {
      core.setFailed(
        `github.context.payload.pull_request does not exist. Have the correct event triggers been configured?`,
      );
      return;
    }

    // Get owner and repo from context
    const repo = github.context.repo.repo;
    const repoOwner = github.context.repo.owner;
    const issue = github.context.issue;
    const issueOwner = github.context.issue.owner;

    core.debug(`repo: ${repo}`);
    core.debug(`repoOwner: ${repoOwner}`);
    core.debug(`issueOwner: ${issueOwner}`);

    const prAuthor = pr.user.login;
    core.debug(`prAuthor: ${prAuthor}`);

    if (whiteListedAuthorsPattern) {
      core.debug(`whiteListedAuthorsPattern: ${whiteListedAuthorsPattern}`);

      const regexp = new RegExp(whiteListedAuthorsPattern);
      if (regexp.test(prAuthor)) {
        const responseMessage = `⏩ Skipping PR Description checks as author is whitelisted: ${prAuthor}`;
        core.debug(responseMessage);

        const response = await createOrUpdateComment(responseMessage, issue);

        core.debug(`created comment URL: ${response.data.html_url}`);
        core.setOutput(`comment-url`, response.data.html_url);
        core.setOutput(`responseMessage`, responseMessage);
        await dismissReview(issue);

        return;
      }
    }

    core.info(`PR Description- ${pr.body}`);

    const prBodyValidationService = new PrBodyValidationService();
    const result = await prBodyValidationService.validateBody(pr.body);

    // Create a comment on PR
    if (result.isPrBodyComplete) {
      const response = await createOrUpdateComment(result.message, issue);

      core.debug(`comment URL: ${response.data.html_url}`);
      core.setOutput(`comment-url`, response.data.html_url);
      core.setOutput(
        `responseMessage`,
        `✅ All checks passed: ${result.message}`,
      );
      await dismissReview(issue);
    } else {
      const failedMessage = `🚧 PR Description incomplete: ${result.message}`;

      core.setOutput(`responseMessage`, failedMessage);
      await createOrUpdateReview(result.message, issue);

      core.setFailed(failedMessage);
      return;
    }

    core.debug(new Date().toTimeString());
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      const errorMessage = `An unknown error occurred: ${JSON.stringify(
        error,
      )}`;
      core.setFailed(errorMessage);
    }
  }
}

async function createOrUpdateReview(
  comment: string,
  pullRequest: { owner: string; repo: string; number: number },
): Promise<void> {
  const reviews = await githubClient.rest.pulls.listReviews({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: pullRequest.number,
  });

  core.debug(`reviews.length: ${reviews.data.length}`);

  const reviewPrefix = '## PR Check';
  const existingReview = reviews.data.find((review) => {
    core.debug(`review.body: ${review.body}`);
    core.debug(`review.user: ${review.user?.login}`);
    return (
      review.user?.login === 'github-actions[bot]' &&
      review.body?.startsWith(reviewPrefix)
    );
  });

  if (existingReview) {
    core.debug(`updating review`);
    void githubClient.rest.pulls.updateReview({
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      pull_number: pullRequest.number,
      review_id: existingReview.id,
      body: `
${reviewPrefix}
${comment}
`,
    });
  } else {
    core.debug(`creating review`);
    void githubClient.rest.pulls.createReview({
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      pull_number: pullRequest.number,
      body: `
${reviewPrefix}
${comment}
`,
      event: 'REQUEST_CHANGES', // Could use "COMMENT"
    });
  }
}

async function createOrUpdateComment(
  comment: string,
  pullRequest: { owner: string; repo: string; number: number },
): Promise<any> {
  const comments = await githubClient.rest.issues.listComments({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: pullRequest.number,
  });

  core.debug(`comments.length: ${comments.data.length}`);

  const commentPrefix = '## PR Check';
  const existingComment = comments.data.find((comment) => {
    core.debug(`comments.body: ${comment.body}`);
    core.debug(`comments.user: ${comment.user?.login}`);
    return (
      comment.user?.login === 'github-actions[bot]' &&
      comment.body?.startsWith(commentPrefix)
    );
  });

  if (existingComment) {
    core.debug(`updating comment`);
    return await githubClient.rest.issues.updateComment({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: pullRequest.number,
      comment_id: existingComment.id,
      body: `
${commentPrefix}
${comment}
`,
    });
  } else {
    core.debug(`creating comment`);
    return await githubClient.rest.issues.createComment({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: pullRequest.number,
      body: `
${commentPrefix}
${comment}
`,
    });
  }
}

async function dismissReview(pullRequest: {
  owner: string;
  repo: string;
  number: number;
}): Promise<void> {
  const reviews = await githubClient.rest.pulls.listReviews({
    owner: pullRequest.owner,
    repo: pullRequest.repo,
    pull_number: pullRequest.number,
  });

  core.debug(`found: ${reviews.data.length} reviews`);

  for (const review of reviews.data) {
    if (
      isGitHubActionUser(review.user?.login) &&
      alreadyRequiredChanges(review.state)
    ) {
      core.debug(`dismissing review: ${review.id}`);
      void githubClient.rest.pulls.dismissReview({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        pull_number: pullRequest.number,
        review_id: review.id,
        message: "All actions resolved, you're good to go ✅",
      });
    }
  }
}

function isGitHubActionUser(login: string | undefined): boolean {
  core.debug(`login: ${login}`);
  return login === 'github-actions[bot]';
}

function alreadyRequiredChanges(state: string): boolean {
  core.debug(`state: ${state}`);
  return state === 'CHANGES_REQUESTED';
}

run();
