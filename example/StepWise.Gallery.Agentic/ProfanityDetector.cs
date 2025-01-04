// Copyright (c) LittleLittleCloud. All rights reserved.
// ProfanityDetector.cs

using OpenAI;
using OpenAI.Chat;
using StepWise.Core;

namespace StepWise.Gallery.Agentic;

/// <summary>
/// Use multiple LLMs to determine is a given text contains rude or profane language.
/// </summary>
public class ProfanityDetector
{
    private readonly ChatClient _chatClient;
    public ProfanityDetector()
    {
        _chatClient = ChatClientProvider.Instance.CreateDeepSeekV3();
    }

    [Step(description: """
        ## ProfanityDetector
        This workflow helps you determine if a given text contains rude or profane language.
        - source code: [ProfanityDetector](https://github.com/LittleLittleCloud/StepWise/blob/main/example/StepWise.Gallery.Agentic/ProfanityDetector.cs)

        ## How it works
        1. You provide the text you want to check.
        2. The workflow uses multiple LLMs to determine if the text is profane.
        3. The workflow uses the maximum voting result to determine if the text is profane.
        4. The workflow returns the result.
        """)]
    public async Task<string> README()
    {
        return "README is Completed";
    }

    [StepWiseUITextInput(description: "Please provide the text you want to check")]
    public async Task<string?> Input()
    {
        return null;
    }

    [Step(description: "Detect profane language using AI1")]
    [DependOn(nameof(Input))]
    public async Task<bool> AI1(
        [FromStep(nameof(Input))] string input)
    {
        var prompt = $"""
            Please determine if the following text contains rude or profane language, or is inappropriate to be shared in public:
            {input}

            Answer with 'yes' or 'no'
            """;

        var systemMessage = new SystemChatMessage(prompt);
        var response = await _chatClient.CompleteChatAsync(systemMessage);

        return response.Value.Content[0].Text.ToLower().Contains("yes");
    }

    [Step(description: "Detect profane language using AI2")]
    [DependOn(nameof(Input))]
    public async Task<bool> AI2(
        [FromStep(nameof(Input))] string input)
    {
        var prompt = $"""
            Please determine if the following text contains rude or profane language, or is inappropriate to be shared in public:
            {input}
            Answer with 'yes' or 'no'
            """;
        var systemMessage = new SystemChatMessage(prompt);
        var response = await _chatClient.CompleteChatAsync(systemMessage);
        return response.Value.Content[0].Text.ToLower().Contains("yes");
    }

    [Step(description: "Detect profane language using AI3")]
    [DependOn(nameof(Input))]
    public async Task<bool> AI3(
        [FromStep(nameof(Input))] string input)
    {
        var prompt = $"""
            Please determine if the following text contains rude or profane language, or is inappropriate to be shared in public:
            {input}
            Answer with 'yes' or 'no'
            """;
        var systemMessage = new SystemChatMessage(prompt);
        var response = await _chatClient.CompleteChatAsync(systemMessage);
        return response.Value.Content[0].Text.ToLower().Contains("yes");
    }

    [Step(description: "Collect votes and determine the result")]
    [DependOn(nameof(AI1))]
    [DependOn(nameof(AI2))]
    [DependOn(nameof(AI3))]
    public async Task<string> Voting(
        [FromStep(nameof(AI1))] bool ai1,
        [FromStep(nameof(AI2))] bool ai2,
        [FromStep(nameof(AI3))] bool ai3)
    {
        var votes = new[] { ai1, ai2, ai3 };
        var yesVotes = votes.Count(v => v);
        var noVotes = votes.Count(v => !v);

        return yesVotes > noVotes ? "The text contains rude or profane language" : "The text does not contain rude or profane language";
    }
}
