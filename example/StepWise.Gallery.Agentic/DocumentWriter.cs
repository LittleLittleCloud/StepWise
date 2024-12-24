// Copyright (c) LittleLittleCloud. All rights reserved.
// DocumentWriter.cs

using OpenAI;
using OpenAI.Chat;
using StepWise.Core;

namespace StepWise.Gallery.Agentic;

public class DocumentWriter
{
    private readonly ChatClient _chatClient;

    public DocumentWriter()
    {
        var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? throw new Exception("Please set the OPENAI_API_KEY environment variable");
        var chatClient = new OpenAIClient(apiKey)
            .GetChatClient("gpt-4o");

        _chatClient = chatClient;
    }


    [Step(description: """
        ## DocumentWriter

        This workflow helps you write a document by writing outlines first, then filling in the content for each outline.

        ![image](https://www.anthropic.com/_next/image?url=https%3A%2F%2Fwww-cdn.anthropic.com%2Fimages%2F4zrzovbb%2Fwebsite%2F7418719e3dab222dccb379b8879e1dc08ad34c78-2401x1000.png&w=3840&q=75)
        """)]
    public async Task<string> README()
    {
        return "README is Completed";
    }

    [StepWiseUITextInput(description: "Please provide the title and brief description of the document you want to write")]
    public async Task<string?> Input()
    {
        return null;
    }

    [Step(description: "Write the outline of the document")]
    [DependOn(nameof(Input))]
    public async Task<string> WriteOutline(
        [FromStep(nameof(Input))] string input)
    {
        var prompt = $"""
            Please write an outline based on the title and brief description below:

            {input}

            Put the outline between ```outline``` and ```
            """;

        var systemMessage = new SystemChatMessage(prompt);
        var response = await _chatClient.CompleteChatAsync(systemMessage);

        return response.Value.Content[0].Text;
    }

    [Step(description: "Check if the outline is to the point and well structured for the given title and brief description")]
    [DependOn(nameof(WriteOutline))]
    [DependOn(nameof(Input))]
    public async Task<bool> CheckOutline(
        [FromStep(nameof(WriteOutline))] string outline,
        [FromStep(nameof(Input))] string input)
    {
        var prompt = $"""
            Please check if the outline is to the point and well structured for the given title and brief description:
            {input}
            Outline:
            {outline}
            If the outline is good, please type 'good', otherwise type 'bad'
            """;
        var systemMessage = new SystemChatMessage(prompt);
        var response = await _chatClient.CompleteChatAsync(systemMessage);

        return response.Value.Content[0].Text.ToLower().Contains("good");
    }

    [Step(description: """
        Invoke if the outline fails the check
        """)]
    [DependOn(nameof(CheckOutline))]
    public async Task<string?> OutlineCheckFail(
        [FromStep(nameof(CheckOutline))] bool checkOutline)
    {
        if (!checkOutline)
        {
            return "Outline check failed";
        }

        return null;
    }

    [Step(description: "Fill in the content for each outline")]
    [DependOn(nameof(CheckOutline))]
    [DependOn(nameof(WriteOutline))]
    [DependOn(nameof(Input))]
    public async Task<string?> FillContent(
        [FromStep(nameof(Input))] string input,
        [FromStep(nameof(CheckOutline))] bool checkOutline,
        [FromStep(nameof(WriteOutline))] string outline)
    {
        if (!checkOutline)
        {
            return null;
        }
        var prompt = $"""
            Please write the content based on the outline below:

            ## Title and Brief Description:
            {input}

            ## Outline:
            {outline}

            Put the content between ```content``` and ```
            """;
        var systemMessage = new SystemChatMessage(prompt);
        var response = await _chatClient.CompleteChatAsync(systemMessage);
        return response.Value.Content[0].Text;
    }

    [Step(description: "Check if the content follows the outline and is well written")]
    [DependOn(nameof(FillContent))]
    [DependOn(nameof(CheckOutline))]
    public async Task<bool> CheckContent(
        [FromStep(nameof(WriteOutline))] string outline,
        [FromStep(nameof(CheckOutline))] bool checkOutline,
        [FromStep(nameof(FillContent))] string content)
    {
        if (!checkOutline)
        {
            return false;
        }
        var prompt = $"""
            Please check if the content follows the outline and is well written:
            ## Outline:
            {outline}

            ## Content:
            {content}
            If the content is good, please type 'good', otherwise type 'bad'
            """;
        var systemMessage = new SystemChatMessage(prompt);
        var response = await _chatClient.CompleteChatAsync(systemMessage);
        return response.Value.Content[0].Text.ToLower().Contains("good");
    }

    [Step(description: """
        Invoke if the content fails the check
        """)]
    [DependOn(nameof(CheckContent))]
    public async Task<string?> ContentCheckFail(
        [FromStep(nameof(CheckContent))] bool checkContent)
    {
        if (!checkContent)
        {
            return "Content check failed";
        }
        return null;
    }

    [Step(description: "Return the final document")]
    [DependOn(nameof(CheckContent))]
    public async Task<string?> ReturnFinalDocument(
        [FromStep(nameof(Input))] string input,
        [FromStep(nameof(CheckContent))] bool checkContent,
        [FromStep(nameof(WriteOutline))] string outline,
        [FromStep(nameof(FillContent))] string content)
    {
        if (!checkContent)
        {
            return null;
        }

        return $"""
            ## Title and Brief Description:
            {input}
            ## Outline:
            {outline}
            ## Content:
            {content}
            """;
    }

}
