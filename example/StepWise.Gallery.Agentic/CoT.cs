// Copyright (c) LittleLittleCloud. All rights reserved.
// CoT.cs

using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using OpenAI;
using OpenAI.Chat;
using StepWise.Core;

namespace StepWise.Gallery.Agentic;

public class CoT
{
    private readonly ChatClient _chatClient;
    private SubTasks? _subTasks;
    public CoT()
    {
        var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? throw new Exception("Please set the OPENAI_API_KEY environment variable");
        var chatClient = new OpenAIClient(apiKey)
            .GetChatClient("gpt-4o");

        _chatClient = chatClient;
    }

    [Step(description: """
        This workflow is designed to help you resolve tasks by generating a chain of thoughts to break down the task into smaller sub-tasks and resolve them one by one.

        ## Pre-requisite
        - env: OPENAI_API_KEY: OpenAI API key
        """)]
    public async Task<string> README()
    {
        return "README";
    }

    [Step(description: """
        You always resolve tasks by using a chain of thought to break down the task into smaller sub-tasks and resolve them one by one using ResolveSubTask.
        Then you summarize the chain of thoughts and generate the final reply.
        """)]
    public async Task<string> SystemMessage()
    {
        return "Start"; // doesn't matter
    }

    [StepWiseUITextInput]
    public async Task<string?> GetTask()
    {
        return null;
    }

    [Step(description: "Initialize chain of thoughts for the given task")]
    [DependOn(nameof(GetTask))]
    public async Task<SubTasks> InitializeChainOfThought(
        [FromStep(nameof(GetTask))] string task)
    {
        var prompt = @$"
Given the following task:
{task}

Generate a chain of actions that you would take to complete the task.

The chain of thoughts should be a list of sub-tasks that you would perform to complete the task.
Each sub-task should have a `task` field that describes the sub-task.

Your response must be a valid JSON array of sub-tasks. Don't put the JSON array in a code block.

For example:
[
    {{
        ""task"": ""Task 1""
    }},
    {{
        ""task"": ""Task 2""
    }}
]";
        var systemMessage = new SystemChatMessage(prompt);
        var response = await _chatClient.CompleteChatAsync(systemMessage);

        if (response.Value.Content.Count == 1 && response.Value.Content[0].Text is string text)
        {
            try
            {
                var subTasks = JsonSerializer.Deserialize<SubTask[]>(text) ?? throw new Exception("Invalid response from OpenAI");

                _subTasks = new SubTasks(subTasks);

                return _subTasks;
            }
            catch (JsonException)
            {
                throw new Exception($"Invalid JSON response from OpenAI: {text}");
            }
        }
        else
        {
            throw new Exception("Invalid response from OpenAI");
        }
    }

    /// <summary>
    /// Resolve i-th task from the task list and return the result
    /// </summary>
    /// <param name="tasks"></param>
    /// <param name="index">if index is greater than the number of tasks, it inidcates that all tasks are resolved and return null</param>
    /// <returns></returns>
    /// <exception cref="Exception"></exception>
    [Step(description: "Resolve i-th task from the task list and return the result")]
    [DependOn(nameof(InitializeChainOfThought))]
    public async Task<(int, string)?> ResolveSubTask(
        [FromStep(nameof(InitializeChainOfThought))] SubTasks tasks,
        [FromStep(nameof(NextAsync))] int index = 0)
    {
        if (index < 0)
        {
            throw new Exception("Invalid index");
        }

        if (index >= tasks.tasks.Length)
        {
            return null;
        }

        var sb = new StringBuilder();
        for (var i = 0; i <= index; i++)
        {
            sb.AppendLine(tasks.tasks[i].ToString());
        }

        var prompt = sb.ToString();

        var systemMessage = new SystemChatMessage(prompt);

        var response = await _chatClient.CompleteChatAsync(systemMessage);

        if (response.Value.Content.Count == 1 && response.Value.Content[0].Text is string text)
        {
            _subTasks!.tasks[index] = _subTasks.tasks[index] with { IntermediateResult = text };
            return (index, text);
        }
        else
        {
            throw new Exception("Invalid response from OpenAI");
        }
    }

    [Step(description: "Move to the next sub-task")]
    public async Task<int> NextAsync(
        [FromStep(nameof(ResolveSubTask))] (int, string)? result)
    {
        return result?.Item1 + 1 ?? 0;
    }

    [Step(description: "Summarize the chain of thoughts and generate final reply")]
    [DependOn(nameof(NextAsync))]
    public async Task<string> SummarizeChainOfThought(
        [FromStep(nameof(NextAsync))] int index)
    {
        if (index >= _subTasks!.tasks.Length)
        {
            var sb = new StringBuilder();
            foreach (var task in _subTasks.tasks)
            {
                sb.AppendLine(task.ToString());
            }

            var prompt = sb.ToString();

            var systemMessage = $"""
                Summarize the chain of thoughts and generate the final reply.

                The chain of thoughts is as follows:
                {prompt}
                """;

            var response = await _chatClient.CompleteChatAsync(new SystemChatMessage(systemMessage));

            if (response.Value.Content.Count == 1 && response.Value.Content[0].Text is string text)
            {
                return text;
            }
            else
            {
                throw new Exception("Invalid response from OpenAI");
            }
        }
        else
        {
            return "Not all tasks are resolved";
        }
    }

    public record class SubTasks(SubTask[] tasks)
    {
        public override string ToString()
        {
            var sb = new StringBuilder();
            foreach (var task in tasks)
            {
                sb.AppendLine(task.ToString());
            }
            return sb.ToString();
        }
    }

    public record class SubTask
    {
        public SubTask(string task, string? intermediateResult = null)
        {
            Task = task;
            IntermediateResult = intermediateResult;
        }

        [JsonPropertyName("task")]
        public string Task { get; init; }

        [JsonPropertyName("result")]
        public string? IntermediateResult { get; init; }

        public override string ToString()
        {
            if (IntermediateResult is not null)
            {
                return $"Task: {Task}, Intermediate Result: {IntermediateResult}";
            }
            else
            {
                return $"Task: {Task}";
            }
        }
    }
}
