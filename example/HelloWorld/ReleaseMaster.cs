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
    public async Task<IssueDTO[]> RetrieveCompletedIssues(
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

        return issueDTOs.ToArray();
    }

    [DependOn(nameof(WriteReleaseNote))]
    [StepWiseUITextInput(description: "Please review the release note and provide feedback, if you are happy with the release note, please type 'approve' to terminate the workflow")]
    public async Task<string?> ReviewReleaseNote(
        [FromStep(nameof(WriteReleaseNote))] string releaseNote)
    {
        return null;
    }

    [Step]
    [DependOn(nameof(ReviewReleaseNote))]
    public async Task<FeedBack?> Feedback(
        [FromStep(nameof(ReviewReleaseNote))] string review,
        [FromStep(nameof(WriteReleaseNote))] string releaseNote)
    {
        if (review == "approve")
        {
            return null;
        }

        return new FeedBack(releaseNote, review);
    }

    [Step]
    public async Task<string?> WriteReleaseNote(
        [FromStep(nameof(RetrieveCompletedIssues))] IssueDTO[] issues,
        string model = "gpt-4o",
        [FromStep(nameof(Feedback))] FeedBack? feedback = null)
    {
        var openaiApiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? throw new ArgumentNullException("OPENAI_API_KEY");
        var openaiClient = new OpenAIClient(openaiApiKey);
        var chatClient = openaiClient.GetChatClient(model);

        var agent = new OpenAIChatAgent(
            chatClient: chatClient,
            name: "release_master",
            systemMessage: """
            You are the release manager for this release. Please write the release note based on the completed issues.
            """)
            .RegisterMessageConnector()
            .RegisterPrintMessage();

        if (feedback is not null)
        {
            if (feedback.feedback == "approve")
            {
                // user approved the release note
                return null;
            }
            else
            {
                var prompt = $"""
                    Please improve the release note based on the feedback:

                    ```release_note
                    {feedback.note}
                    ```

                    ```feedback
                    {feedback.feedback}
                    ```
                    """;

                var releaseNote = await agent.SendAsync(prompt);

                return releaseNote.GetContent();
            }
        }
        else
        {
            var issuesJson = JsonSerializer.Serialize(issues, _jsonSerializerOptions);

            var prompt = $"""
            Please write the release note based on the following completed issues:

            ```issues
            {issuesJson}
            ```
            """;
            var releaseNote = await agent.SendAsync(prompt);

            return releaseNote.GetContent();
        }
    }

    [Step]
    public async Task<string> ReleaseNote(
        [FromStep(nameof(WriteReleaseNote))] string releaseNote,
        [FromStep(nameof(ReviewReleaseNote))] string review)
    {
        if (review == "approve")
        {
            return releaseNote;
        }
        else
        {
            return "Not Ready";
        }
    }

    public record FeedBack(string note, string feedback)
    {
        public override string ToString() => feedback;
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
