import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";

const token = "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";
const octokit = getOctokit(token);
// const octokit = new Octokit({ auth: "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" });
// const octokitRest = new OctokitRest({ auth: "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" });

const closing_issue_number_request = await octokit.graphql({
  query: `query {
        repository(owner: "42-world", name: "42world-Action-Test") {
          pullRequest(number: 10) {
              id
              closingIssuesReferences (first: 1) {
                edges {
                  node {
                    id
                    body
                    number
                    title
                  }
                }
              }
          }
        }
      }`,
});
const closing_issue_numbers = closing_issue_number_request.repository.pullRequest.closingIssuesReferences.edges.map(
  (edge) => edge.node.number
);
console.log(closing_issue_number_request.repository.pullRequest.closingIssuesReferences);
console.log(closing_issue_number_request.repository.pullRequest.closingIssuesReferences.edges[0].node.number);

for (const closing_issue_number of closing_issue_numbers) {
  const issue_labels = await octokit.rest.issues.listLabelsOnIssue({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: closing_issue_number,
  });
  const labels = issue_labels.data.map((label) => label.name);
  const result = await octokit.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: number,
    labels: labels,
  });
  core.debug(JSON.stringify(result));
}
