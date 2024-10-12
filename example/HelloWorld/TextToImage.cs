// Copyright (c) LittleLittleCloud. All rights reserved.
// TextToImage.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoGen.OpenAI;
using OpenAI;
using OpenAI.Images;
using StepWise.Core;

namespace StepWise.Gallery;

public class TextToImage
{
    private string _apiKey = string.Empty;
    private ImageClient? _imageClient;

    [Step(description: """
        ## Convert Text to Image using OpenAI DALL-E-3

        ### Required
        - openai api key
        """)]
    public async Task<string> Start()
    {
        return "Start";
    }

    [StepWiseUITextInput(description: """
        Please describe the image you want to create.

        e.g: a cat fighting with a dog
        """)]
    public async Task<string?> InputPrompt()
    {
        return null;
    }

    [StepWiseUITextInput(description: "Please provide the openai api key if env:OPENAI_API_KEY is not set, otherwise leave empty and submit")]
    public async Task<string?> OpenAIApiKey()
    {
        return null;
    }

    [Step(description: "Validate the openai api key")]
    public async Task<string> ValidateOpenAIApiKey(
        [FromStep(nameof(OpenAIApiKey))] string apiKey)
    {
        if (Environment.GetEnvironmentVariable("OPENAI_API_KEY") is not string envApiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new Exception("Please provide the openai api key");
            }

            _apiKey = apiKey;
            var client = new OpenAIClient(_apiKey);
            _imageClient = client.GetImageClient("dall-e-3");

            return "Use provided api key";
        }
        else
        {
            _apiKey = envApiKey;
            var client = new OpenAIClient(_apiKey);
            _imageClient = client.GetImageClient("dall-e-3");
            return "Use env:OPENAI_API_KEY";
        }
    }

    [Step(description: """
        Generate an image from text using OpenAI DALL-E-3
        """)]
    [DependOn(nameof(InputPrompt))]
    [DependOn(nameof(ValidateOpenAIApiKey))]
    public async Task<GeneratedImage?> GenerateImage(
        [FromStep(nameof(ValidateOpenAIApiKey))] string apiKey,
        [FromStep(nameof(InputPrompt))] string prompt)
    {
        if (_imageClient is null)
        {
            throw new Exception("Please provide the openai api key");
        }

        var image = await _imageClient.GenerateImageAsync(prompt);

        return image.Value;
    }

    [Step(description: """
        The revised prompt from openai when generating the image.
        """)]
    [DependOn(nameof(GenerateImage))]
    public async Task<string?> RevisedPrompt(
        [FromStep(nameof(GenerateImage))] GeneratedImage image)
    {
        return image.RevisedPrompt;
    }

    [Step(description: """
        The image generated from the text.
        """)]
    [DependOn(nameof(GenerateImage))]
    public async Task<StepWiseImage> GeneratedImage(
        [FromStep(nameof(GenerateImage))] GeneratedImage image)
    {
        return new StepWiseImage()
        {
            Url = image.ImageUri.AbsoluteUri,
            ContentType = "image/png",
            Name = "image.png",
        };
    }
}
