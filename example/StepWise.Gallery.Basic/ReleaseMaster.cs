// Copyright (c) LittleLittleCloud. All rights reserved.
// ReleaseMaster.cs

using System.Text.Json;
using System.Text.Json.Serialization;
using AutoGen.Core;
using AutoGen.OpenAI;
using AutoGen.OpenAI.Extension;
using Octokit;
using OpenAI;
using StepWise.Core;

namespace Gallery;

public class ReleaseMaster
{
    private readonly JsonSerializerOptions _jsonSerializerOptions = new JsonSerializerOptions
    {
        WriteIndented = true,
    };

    [Step(description: """
        This workflow is designed to help you write a release note based on the completed issues in the milestone.
        You will be asked to provide the name of the github repo, the release milestone, the owner of the repo, and the github token if your repo is private.
        The workflow will retrieve the completed issues in the milestone and generate a release note based on the issues.

        - source code: [ReleaseMaster.cs](https://github.com/LittleLittleCloud/StepWise/blob/main/example/HelloWorld/ReleaseMaster.cs).
        """)]
    public async Task<string> Start()
    {
        return "Start";
    }

    [StepWiseUITextInput(description: "Please provide the name of github repo, e.g: StepWise")]
    public async Task<string?> GithubRepoName()
    {
        return null;
    }

    [StepWiseUITextInput(description: "Please provide the name of the release milestone, e.g: 0.0.5")]
    public async Task<string?> ReleaseMilestone()
    {
        return null;
    }

    [StepWiseUITextInput(description: "Please provide the owner of the repo, e.g: LittleLittleCloud")]
    public async Task<string?> GithubRepoOwner()
    {
        return null;
    }

    [StepWiseUITextInput(description: "[Optional]: Please provide the github token if your repo is private")]
    public async Task<string?> GithubToken()
    {
        return null;
    }

    [Step]
    public async Task<IssueDTOs> RetrieveCompletedIssues(
        [FromStep(nameof(GithubRepoName))] string repoName,
        [FromStep(nameof(ReleaseMilestone))] string milestone,
        [FromStep(nameof(GithubRepoOwner))] string owner,
        [FromStep(nameof(GithubToken))] string? token = null)
    {
        var ghClient = new GitHubClient(new ProductHeaderValue("StepWise"));
        if (!string.IsNullOrEmpty(token))
        {
            ghClient.Credentials = new Credentials(token);
        }

        var request = new SearchIssuesRequest();
        request.In = [
            IssueInQualifier.Title,
            IssueInQualifier.Body,
            IssueInQualifier.Comment,
        ];
        request.Repos.Add(owner, repoName);

        request.State = ItemState.Closed;
        request.Milestone = milestone;
        request.Is = [IssueIsQualifier.Issue];


        var issues = await ghClient.Search.SearchIssues(request);
        var issueDTOs = issues.Items.Select(x => new IssueDTO(x));

        return new IssueDTOs(issueDTOs);
    }

    public record class IssueDTOs(IEnumerable<IssueDTO> issueDTOs)
    {
        public override string ToString()
        {
            return JsonSerializer.Serialize(issueDTOs, new JsonSerializerOptions
            {
                WriteIndented = true,
            });
        }
    }

    public class IssueDTO
    {
        public IssueDTO(Issue issue)
        {
            Id = issue.Id;
            NodeId = issue.NodeId;
            Url = issue.Url;
            HtmlUrl = issue.HtmlUrl;
            CommentsUrl = issue.CommentsUrl;
            EventsUrl = issue.EventsUrl;
            Number = issue.Number;
            State = issue.State.StringValue;
            Title = issue.Title;
            Body = issue.Body;
        }

        public IssueDTO()
        {
        }

        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("node_id")]
        public string NodeId { get; set; } = null!;

        [JsonPropertyName("url")]
        public string Url { get; set; } = null!;

        [JsonPropertyName("html_url")]
        public string HtmlUrl { get; set; } = null!;

        [JsonPropertyName("comments_url")]
        public string CommentsUrl { get; set; } = null!;

        [JsonPropertyName("events_url")]
        public string EventsUrl { get; set; } = null!;

        [JsonPropertyName("number")]
        public int Number { get; set; }

        [JsonPropertyName("state")]
        public string State { get; set; } = null!;

        [JsonPropertyName("title")]
        public string Title { get; set; } = null!;

        [JsonPropertyName("body")]
        public string Body { get; set; } = null!;
    }
}
