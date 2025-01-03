// Copyright (c) LittleLittleCloud. All rights reserved.
// ChatClientProvider.cs

using OpenAI;
using OpenAI.Chat;

namespace StepWise.Gallery.Agentic;

class ChatClientProvider
{
    public ChatClient CreateDeepSeekV3()
    {
        var apiKey = "sk-ca170c04cb16480c986ddc9cc48b357c";

        var endpoint = "https://api.deepseek.com";
        var option = new OpenAIClientOptions
        {
            Endpoint = new Uri(endpoint),
        };
        var client = new OpenAIClient(apiKey, option);

        return client.GetChatClient("deepseek-chat");
    }

    public ChatClient CreateOpenAI_GPT_4o_mini()
    {
        var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? throw new Exception("Please set the OPENAI_API_KEY environment variable");
        var chatClient = new OpenAIClient(apiKey)
            .GetChatClient("gpt-4o");

        return chatClient;
    }

    public static ChatClientProvider Instance = new ChatClientProvider();
}
