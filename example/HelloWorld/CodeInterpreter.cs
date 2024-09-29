// Copyright (c) LittleLittleCloud. All rights reserved.
// CodeInterpreter.cs

using System.Text;
using AutoGen.Core;
using AutoGen.DotnetInteractive;
using AutoGen.DotnetInteractive.Extension;
using AutoGen.OpenAI;
using AutoGen.OpenAI.Extension;
using Microsoft.DotNet.Interactive;
using OpenAI;
using StepWise.Core;

public record FixComment(string Code, string Review)
{
    public override string ToString() => $"""
        Fix the code according to the review.

        # Code
        {Code}

        # Review
        {Review}
        """;
}

public record FixCodeError(string Code, string Error)
{
    public override string ToString() => $"""
        Fix the error in the code.

        # Code
        {Code}

        # Error
        {Error}
        """;
}

public class CodeInterpreter
{
    private IAgent _agent;
    private readonly Kernel _kernel;

    public static CodeInterpreter Create()
    {
        // Follow the configuration instruction on setting up dotnet interactive and python kernel
        // https://github.com/LittleLittleCloud/code-interpreter-workflow?tab=readme-ov-file#pre-requisite
        var kernel = DotnetInteractiveKernelBuilder
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

        var codeInterpreter = new CodeInterpreter(agent, kernel);

        return codeInterpreter;
    }

    public CodeInterpreter(IAgent agent, Kernel kernel)
    {
        _agent = agent;
        _kernel = kernel;
    }

    [StepWiseUITextInput(description: "Please provide the task that you want to resolve.")]
    public async Task<string?> InputTask()
    {
        return null;
    }

    [Step]
    [DependOn(nameof(WriteCode))]
    [DependOn(nameof(ReviewCode))]
    public async Task<FixComment?> FixComment(
        [FromStep(nameof(WriteCode))] string code,
        [FromStep(nameof(ReviewCode))] string review)
    {
        if (review == "approve")
        {
            return null;
        }

        return new FixComment(code, review);
    }

    [Step]
    [DependOn(nameof(InputTask))]
    public async Task<string> WriteCode(
        [FromStep(nameof(InputTask))] string task,
        [FromStep(nameof(FixCodeError))] FixCodeError? codeError = null,
        [FromStep(nameof(FixComment))] FixComment? review = null)
    {
        if (codeError == null && review == null)
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

            return reply.GetContent()!;
        }
        else if (codeError != null)
        {
            // fix the error
            var prompt = $"""
                    # Task
                    {task}

                    # Existing Code
                    ```
                    {codeError.Code}
                    ```

                    # Execute Result
                    ```
                    {codeError.Error}
                    ```

                    Fix the error
                    """;

            var reply = await _agent.SendAsync(prompt);

            return reply.GetContent()!;
        }
        else if (review != null)
        {
            // fix the code from review
            var prompt = $"""
                # Task
                {task}

                # Existing Code
                ```
                {review.Code}
                ```

                # Review
                {review.Review}

                Fix the code according to the review.
                """;

            var reply = await _agent.SendAsync(prompt);

            return reply.GetContent()!;
        }

        throw new Exception("Invalid state");
    }

    [StepWiseUITextInput(description: "Please review the code. If you approve the code, say 'approve'. Otherwise, leave a feedback")]
    [DependOn(nameof(WriteCode))]
    public async Task<string?> ReviewCode(
        [FromStep(nameof(WriteCode))] string code)
    {
        return null;
    }

    [Step]
    [DependOn(nameof(WriteCode))]
    [DependOn(nameof(ReviewCode))]
    public async Task<string?> RunCode(
        [FromStep(nameof(ReviewCode))] string review,
        [FromStep(nameof(WriteCode))] string code)
    {
        if (review != "approve")
        {
            return null;
        }

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

        return codeExecutionResult;
    }

    [Step]
    [DependOn(nameof(WriteCode))]
    [DependOn(nameof(RunCode))]
    public async Task<FixCodeError?> FixCodeError(
        [FromStep(nameof(WriteCode))] string code,
        [FromStep(nameof(RunCode))] string codeResult)
    {
        if (!codeResult.Contains("Error"))
        {
            return null;
        }

        return new FixCodeError(code, codeResult);
    }

    [Step]
    [DependOn(nameof(InputTask))]
    [DependOn(nameof(RunCode))]
    [DependOn(nameof(WriteCode))]
    [DependOn(nameof(FixCodeError))]
    [DependOn(nameof(FixComment))]
    public async Task<string?> FinalAnswer(
        [FromStep(nameof(InputTask))] string task,
        [FromStep(nameof(WriteCode))] string code,
        [FromStep(nameof(RunCode))] string codeResult,
        [FromStep(nameof(FixCodeError))] FixCodeError? fixCodeError = null,
        [FromStep(nameof(FixComment))] FixComment? fixComment = null)
    {
        if (fixCodeError != null)
        {
            return "Please fix the error in the code.";
        }

        if (fixComment != null)
        {
            return "Please fix the code according to the review.";
        }

        var prompt = $"""
                # Task
                {task}

                # Execute Result
                ```
                {codeResult}
                ```

                Please generate the final reply according to the task and the code execution result.
                """;

        var reply = await _agent.SendAsync(prompt);

        return reply.GetContent();
    }
}
