import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";

async function run() {
  try {
    const target = context.payload.pull_request;
    if (target === undefined) {
      throw new Error("Can't get payload. Check you trigger event");
    }
    const { number } = target;

    const token = core.getInput("repo-token", { required: true });
    const octokit = getOctokit(token);

    const closing_issue_number_request = await octokit.graphql({
      query: `query {
        repository(owner: "${context.repo.owner}", name: "${context.repo.repo}") {
          pullRequest(number: ${number}) {
              id
              closingIssuesReferences (first: 50) {
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
    const milestones = [];
    for (const closing_issue_number of closing_issue_numbers) {
      // milestone
      const milestone = await octokit.rest.issues.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: closing_issue_number,
      });
      console.log(`Milestone of #${closing_issue_number}: ${milestone.data.milestone}`);
      console.log(milestone);
      if (milestone.data.milestone !== null) {
        milestones.push(milestone.data.milestone);
      }

      // labels
      const issue_labels = await octokit.rest.issues.listLabelsOnIssue({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: closing_issue_number,
      });
      const labels = issue_labels.data.map((label) => label.name);
      if (labels.length === 0) {
        continue;
      }
      const result = await octokit.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: number,
        labels: labels,
      });
      core.debug(JSON.stringify(result));
      console.log(`Added labels to #${number}: ${labels.join(", ")}`);
    }
    if (milestones.length === 0) {
      console.log("No milestone");
    }
    else if (milestones.every((val, i, arr) => val === arr[0])) {
      const result = await octokit.rest.issues.update({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: number,
        milestone: milestones[0].number,
      });
      core.debug(JSON.stringify(result));
      console.log(`Added milestone to #${number}: ${milestones[0].title}`);
    } else {
      console.log(`Milestones are different: ${milestones.map((milestone) => milestone.title).join(", ")}`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
