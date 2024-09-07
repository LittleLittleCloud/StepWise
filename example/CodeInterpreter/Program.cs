using System.Text;
using AutoGen.Core;
using AutoGen.DotnetInteractive;
using AutoGen.DotnetInteractive.Extension;
using AutoGen.OpenAI;
using AutoGen.OpenAI.Extension;
using Microsoft.DotNet.Interactive;
using OpenAI;
using StepWise.Core;

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
    .RegisterMessageConnector()
    .RegisterPrintMessage();

var codeInterpreter = new CodeInterpreter(agent, kernel);
var workflow = Workflow.CreateFromType(codeInterpreter);
var engine = new WorkflowEngine(workflow, maxConcurrency: 3);

var task = "use python to switch my system to light mode";
var result = await engine.ExecuteStepAsync<string>(nameof(codeInterpreter.GenerateReply), new Dictionary<string, object>
{
    ["task"] = task
});

Console.WriteLine($"Final Reply: {result}");

public class CodeInterpreter
{
    private IAgent _agent;
    private readonly Kernel _kernel;

    public CodeInterpreter(IAgent agent, Kernel kernel)
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
    public async Task<string?> WriteCode(
        [FromStep(nameof(InputTask))] string task,
        [FromStep(nameof(IsTask))] bool isCodingTask,
        [FromStep(nameof(WriteCode))] string? existingCode = null,
        [FromStep(nameof(RunCode))] string? codeResult = null)
    {
        if (!isCodingTask)
        {
            return null;
        }

        if (existingCode == null && codeResult == null)
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

        if (existingCode != null && codeResult != null)
        {
            // determine if the code result has error or not
            var prompt = $"""
                # Task
                {task}

                # Execute Result
                ```
                {codeResult}
                ```

                Does the code execution result solve the task? If yes, say 'succeed'. Otherwise, say 'fail'.
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
                    {existingCode}
                    ```

                    # Execute Result
                    ```
                    {codeResult}
                    ```

                    Fix the error
                    """;

                reply = await _agent.SendAsync(prompt);

                return reply.GetContent();
            }
        }

        throw new Exception("Invalid code execution result.");
    }

    [Step]
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
    public async Task<string> RunCode(
        [FromStep(nameof(WriteCode))] string code)
    {
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
    public async Task<string?> GenerateReply(
        [FromStep(nameof(InputTask))] string task,
        [FromStep(nameof(IsTask))] bool isCodingTask,
        [FromStep(nameof(RunCode))] string? codeResult = null)
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
                # Task
                {task}

                # Execute Result
                ```
                {codeResult}
                ```

                Does the code execution result solve the task? If yes, say 'succeed'. Otherwise, say 'fail'.
                """;

        var reply = await _agent.SendAsync(prompt);

        if (reply.GetContent() == "succeed")
        {
            prompt = $"""
                # Task
                {task}

                # Execute Result
                ```
                {codeResult}
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
