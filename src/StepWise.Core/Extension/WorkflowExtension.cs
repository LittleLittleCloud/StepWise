// Copyright (c) LittleLittleCloud. All rights reserved.
// WorkflowExtension.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using AutoGen.Core;
using Microsoft.Extensions.Logging;
using StepWise.Core.Extension;

namespace StepWise.Core;

public class StepWiseMiddleware : IMiddleware
{
    private readonly Workflow _workflow;
    private readonly StepWiseEngine _engine;

    public StepWiseMiddleware(Workflow workflow, ILogger? logger = null)
    {
        _workflow = workflow;
        _engine = new StepWiseEngine(workflow, logger: logger);
    }
    public string? Name => nameof(StepWiseMiddleware);

    public async Task<IMessage> InvokeAsync(MiddlewareContext context, IAgent agent, CancellationToken cancellationToken = default)
    {
        var tools = _workflow.ToFunctionContracts().ToArray();
        var options = context.Options ?? new GenerateReplyOptions();

        if (options.Functions == null)
        {
            options.Functions = tools;
        }
        else
        {
            options.Functions = options.Functions.Concat(tools).ToArray();
        }

        var response = await agent.GenerateReplyAsync(
            messages: context.Messages,
            options: options,
            cancellationToken: cancellationToken);

        if (response is not ToolCallMessage toolCallMessage)
        {
            return response;
        }

        if (toolCallMessage.ToolCalls is not { Count: 1 })
        {
            return toolCallMessage;
        }

        var toolCall = toolCallMessage.ToolCalls.First();
        var step = _workflow.Steps[toolCall.FunctionName];
        var jObject = JsonNode.Parse(toolCall.FunctionArguments) as JsonObject ?? new JsonObject();
        var inputs = step.InputParameters
            .Where(p => jObject.ContainsKey(p.ParameterName))
            .Select(p => StepVariable.Create(p.VariableName, jObject[p.ParameterName]!.Deserialize(p.Type)!))
            .ToArray();

        await foreach (var stepRun in _engine.ExecuteAsync(step.Name, inputs, maxSteps: 10))
        {
            if (stepRun.StepRunType == StepRunType.Variable && stepRun.Variable is StepVariable variable && variable.Name == step.Name)
            {
                var result = variable.Value as string; // the return type must be string
                toolCall.Result = result;
                var toolCallResultMessage = new ToolCallResultMessage([toolCall], from: agent.Name);
                return new ToolCallAggregateMessage(toolCallMessage, toolCallResultMessage, from: agent.Name);
            }
        }

        throw new InvalidOperationException("Step did not return the expected result type.");
    }
}

public static class WorkflowExtension
{
    public static IEnumerable<FunctionContract> ToFunctionContracts(this Workflow workflow)
    {
        return workflow.Steps.Select(s => s.Value.ToFunctionContract(workflow.Name));
    }

    public static FunctionContract ToFunctionContract(this Step step, string? nameSpace = null)
    {
        // throw if the return type is not Task<string?>
        if (step.OutputType != typeof(Task<string?>))
        {
            throw new InvalidOperationException("Return type must be Task<string?>");
        }

        // throw if any input parameter type is not one of 
        // string, int, double, bool, string[], int[], double[], bool[]

        var validTypes = new[]
        {
            typeof(string),
            typeof(int),
            typeof(double),
            typeof(bool),
            typeof(string[]),
            typeof(int[]),
            typeof(double[]),
            typeof(bool[]),
        };

        if (step.InputParameters.Any(p => !validTypes.Contains(p.Type)))
        {
            throw new InvalidOperationException("Input parameter type must be one of string, int, double, bool, string[], int[], double[], bool[]");
        }

        return new FunctionContract
        {
            Name = step.Name,
            Description = step.Description,
            ReturnType = step.OutputType,
            Parameters = step.InputParameters.Select(p => new FunctionParameterContract
            {
                Name = p.ParameterName,
                ParameterType = p.Type,
                DefaultValue = p.DefaultValue,
                IsRequired = !p.HasDefaultValue,
            }).ToList(),
        };
    }
}
