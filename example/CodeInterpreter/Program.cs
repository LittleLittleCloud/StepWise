// Copyright (c) LittleLittleCloud. All rights reserved.
// Program.cs

using System.Text;
using System.Text.Json;
using AutoGen.Core;
using AutoGen.DotnetInteractive;
using AutoGen.DotnetInteractive.Extension;
using AutoGen.OpenAI;
using AutoGen.OpenAI.Extension;
using Microsoft.DotNet.Interactive;
using Microsoft.Extensions.Logging;
using OpenAI;
using StepWise.Core;

var loggerFactory = LoggerFactory.Create(builder =>
{
    builder.AddConsole();
});

var logger = loggerFactory.CreateLogger<StepWiseEngine>();

// Follow the configuration instruction on setting up dotnet interactive and python kernel
// https://github.com/LittleLittleCloud/code-interpreter-workflow?tab=readme-ov-file#pre-requisite
using var kernel = DotnetInteractiveKernelBuilder
    .CreateDefaultInProcessKernelBuilder()
    .AddPowershellKernel()
    .AddPythonKernel("python3")
    .Build();
var openAIApiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? throw new ArgumentNullException("OPENAI_API_KEY is not found");
var model = "gpt-4o-mini";
var openAIClient = new OpenAIClient(openAIApiKey);
var chatClient = openAIClient.GetChatClient(model);

var agent = new OpenAIChatAgent(
    chatClient: chatClient,
    name: "assistant")
    .RegisterMessageConnector();

var codeInterpreter = new Workflow(agent, kernel);
var engine = StepWiseEngine.CreateFromInstance(codeInterpreter);

var task = "use python to switch my system to dark mode";
StepVariable[] input = [StepVariable.Create("task", task)];

await foreach (var stepRun in engine.ExecuteAsync(nameof(Workflow.GenerateReply), input, maxConcurrency: 1))
{
    Console.WriteLine(stepRun);

    if (stepRun.StepName == nameof(Workflow.GenerateReply) && stepRun.Status == StepStatus.Completed && stepRun.Result?.As<string>() is string reply)
    {
        Console.WriteLine($"Final Reply: {reply}");
        break;
    }
}

public class Workflow
{
    private IAgent _agent;
    private readonly Kernel _kernel;

    public Workflow(IAgent agent, Kernel kernel)
    {
        _agent = agent;
        _kernel = kernel;
    }

    [Step]
    public async Task<string> InputTask(string task)
    {
        return task;
    }

    [Step]
    [DependOn(nameof(InputTask))]
    [DependOn(nameof(IsTask))]
    public async Task<string?> WriteCode(
        [FromStep(nameof(InputTask))] string task,
        [FromStep(nameof(IsTask))] bool isCodingTask,
        [FromStep(nameof(RunCode))] (string, string)? codeResult = null,
        [FromStep(nameof(ReviewCode))] (string, string)? review = null)
    {
        if (!isCodingTask)
        {
            return null;
        }

        if (codeResult == null && review == null)
        {
            // the first time writing code
            var prompt = $"""
                You are a helpful coder agent, you resolve tasks using python, powershell or csharp code.
                
                Here are rules that you need to follow:
                - always print the result of your code
                - always use code block to wrap your code
                
                ALWAYS put your code in a code block like this:
                ```<python|csharp|pwsh>
                print("Hello World")
                ```
                
                Using the following syntax to install pip packages:
                ```python
                %pip install <package-name>
                ```
                
                Using the following syntax to install nuget packages:
                ```csharp
                #r "nuget:<package-name>"
                ```

                Here is your task:
                {task}
                """;

            var reply = await _agent.SendAsync(prompt);

            return reply.GetContent();
        }
        else if (codeResult != null)
        {
            // determine if the code result has error or not
            var prompt = $"""
                # Execute Result
                ```
                {codeResult.Value.Item1}
                ```

                Does the code run successfully? If yes, say 'succeed'. Otherwise, say 'fail'.
                """;

            var reply = await _agent.SendAsync(prompt);

            if (reply.GetContent() == "succeed")
            {
                return null;
            }
            else
            {
                // fix the error
                prompt = $"""
                    # Task
                    {task}

                    # Existing Code
                    ```
                    {codeResult.Value.Item1}
                    ```

                    # Execute Result
                    ```
                    {codeResult.Value.Item2}
                    ```

                    Fix the error
                    """;

                reply = await _agent.SendAsync(prompt);

                return reply.GetContent();
            }
        }
        else if (review != null)
        {
            if (review.Value.Item2 == "approved")
            {
                return null;
            }

            // fix the code from review
            var prompt = $"""
                # Task
                {task}

                # Existing Code
                ```
                {review.Value.Item1}
                ```

                # Review
                {review}

                Fix the code according to the review.
                """;

            var reply = await _agent.SendAsync(prompt);

            return reply.GetContent();
        }

        return null;
    }

    [Step]
    [DependOn(nameof(WriteCode))]
    public async Task<(string, string)> ReviewCode(
        [FromStep(nameof(WriteCode))] string code)
    {
        var prompt = $"""
            # Code Review
            ```python
            {code}
            ```

            Please review the code. If you approve the code, say 'approve'. Otherwise, leave a feedback.
            """;

        // print to console
        Console.WriteLine(prompt);

        // receive input from user
        var reply = Console.ReadLine();

        var approve = reply?.ToLower() == "approve";

        if (approve)
        {
            Console.WriteLine("You approve the code");

            return (code, "approved");
        }
        else
        {
            Console.WriteLine("You disapprove the code");

            return reply is not null ? (code, reply) : (code, "disapproved");
        }
    }

    [Step]
    [DependOn(nameof(InputTask))]
    public async Task<bool> IsTask(
        [FromStep(nameof(InputTask))] string task)
    {
        var prompt = $"""
            # Task
            {task}

            Is this a task? If yes, say 'yes'. Otherwise, say 'no'.
            """;

        var reply = await _agent.SendAsync(prompt);

        return reply.GetContent()?.ToLower().Contains("yes") is true;
    }

    [Step]
    [DependOn(nameof(WriteCode))]
    [DependOn(nameof(ReviewCode))]
    public async Task<(string, string)?> RunCode(
        [FromStep(nameof(ReviewCode))] (string, string) review)
    {
        if (review.Item2 != "approved")
        {
            return null;
        }

        var code = review.Item1;
        var sb = new StringBuilder();
        var codeMessage = new TextMessage(Role.Assistant, code);
        // process python block
        foreach (var pythonCode in codeMessage.ExtractCodeBlocks("```python", "```"))
        {
            var codeResult = await this._kernel.RunSubmitCodeCommandAsync(pythonCode, "python");

            codeResult = $"""
                [Python Code Block]
                ```python
                {pythonCode}
                ```

                [Execute Result]
                {codeResult}
                """;

            sb.AppendLine(codeResult);
        }

        // process powershell block
        foreach (var pwshCode in codeMessage.ExtractCodeBlocks("```pwsh", "```"))
        {
            var codeResult = await this._kernel.RunSubmitCodeCommandAsync(pwshCode, "pwsh");

            codeResult = $"""
                [Powershell Code Block]
                ```pwsh
                {pwshCode}
                ```

                [Execute Result]
                {codeResult}
                """;

            sb.AppendLine(codeResult);
        }


        // process csharp block
        foreach (var csharpCode in codeMessage.ExtractCodeBlocks("```csharp", "```"))
        {
            var codeResult = await this._kernel.RunSubmitCodeCommandAsync(csharpCode, "csharp");

            codeResult = $"""
                [CSharp Code Block]
                ```csharp
                {csharpCode}
                ```

                [Execute Result]
                {codeResult}
                """;

            sb.AppendLine(codeResult);
        }

        Console.WriteLine(sb.ToString());
        var codeExecutionResult = sb.ToString();

        return (code, codeExecutionResult);
    }

    [Step]
    [DependOn(nameof(InputTask))]
    [DependOn(nameof(IsTask))]
    [DependOn(nameof(RunCode))]
    public async Task<string?> GenerateReply(
        [FromStep(nameof(InputTask))] string task,
        [FromStep(nameof(IsTask))] bool isCodingTask,
        [FromStep(nameof(RunCode))] (string, string)? codeResult = null)
    {
        if (!isCodingTask)
        {
            return "not a task.";
        }

        if (codeResult == null)
        {
            // code has not been executed yet
            return null;
        }

        // determine if the code result has error or not
        var prompt = $"""
                # Execute Result
                ```
                {codeResult.Value.Item2}
                ```

                Does the code execution successfully? If yes, say 'succeed'. Otherwise, say 'fail'.
                """;

        var reply = await _agent.SendAsync(prompt);

        if (reply.GetContent() == "succeed")
        {
            prompt = $"""
                # Task
                {task}

                # Execute Result
                ```
                {codeResult.Value.Item2}
                ```

                Please generate the final reply according to the task and the code execution result.
                """;

            reply = await _agent.SendAsync(prompt);

            return reply.GetContent();
        }
        else
        {
            // fix error in code step.
            return null;
        }
    }
}
