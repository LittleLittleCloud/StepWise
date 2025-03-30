// Copyright (c) LittleLittleCloud. All rights reserved.
// OCR.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoGen.Core;
using AutoGen.OpenAI;
using AutoGen.OpenAI.Extension;
using OpenAI;
using StepWise.Core;

namespace StepWise.Gallery;

public class OCR
{
    private string? _apiKey;

    [StepWiseUIImageInput(description: "Please upload an image to perform OCR on")]
    public async Task<StepWiseImage?> Input()
    {
        return null;
    }

    [StepWiseUITextInput(description: "Please provide OpenAI API Key if env:OPENAI_API_KEY is not available " +
        "in your system. If env:OPENAI_API_KEY is available, you can skip this step by submitting an empty input.")]
    public async Task<string?> InputAPIKey()
    {
        return null;
    }

    [Step(description: "This function uses env:OPENAI_API_KEY if exists, otherwise use the apiKey from user input")]
    public async Task<bool> SetOpenAIAPIKey(
        [FromStep(nameof(InputAPIKey))] string? apiKey = null)
    {
        _apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? apiKey;

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            throw new InvalidOperationException("API Key is required");
        }

        return true;
    }

    [DependOn(nameof(Input))]
    [DependOn(nameof(SetOpenAIAPIKey))]
    [Step(description: "Perform OCR on the uploaded image using gpt-4o-mini")]
    public async Task<string> PerformOCR(
        [FromStep(nameof(Input))] StepWiseImage image,
        [FromStep(nameof(SetOpenAIAPIKey))] bool isApiKeySet)
    {
        if (isApiKeySet == false)
        {
            return "API Key is not set";
        }

        // perform OCR
        var openAIClient = new OpenAIClient(_apiKey!);
        var chatClient = openAIClient.GetChatClient("gpt-4o-mini");
        var agent = new OpenAIChatAgent(
            chatClient,
            "assistant",
            systemMessage: """
            You are a helpful AI assistant that help users to perform OCR on images.
            """)
            .RegisterMessageConnector();

        var imageData = image.Blob!;
        var imageMessage = new ImageMessage(Role.User, imageData);
        var prompt = """
            Extract text from the image if the image contains text. You can use markdown to format the text.
            """;
        var textMessage = new TextMessage(Role.User, prompt);
        var multiModalMessage = new MultiModalMessage(Role.User, [imageMessage, textMessage]);

        var response = await agent.SendAsync(multiModalMessage);

        return response.GetContent()!;
    }
}
