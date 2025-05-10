// Copyright (c) LittleLittleCloud. All rights reserved.
// AIFunctionExtension.cs

using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.AI;
using ModelContextProtocol.Client;
using ModelContextProtocol.Server;

namespace StepWise.Core.Extension;

public static class AIFunctionExtension
{
    public static IEnumerable<AIFunction> GetAIFunctions(this IStepWiseEngine engine)
    {
        var result = new List<AIFunction>();
        foreach (var step in engine.Workflow.Steps.Values)
        {
            var function = AIFunctionFactory.Create(step.StepMethod, step.Name, step.Description);

            // edit the scheme to replace the property name with depend step name
            var mapping = new Dictionary<string, string>();
            foreach (var parameter in step.InputParameters)
            {
                // filter CancellationToken, IMcpServer, IMcpClient
                if (parameter.Type == typeof(CancellationToken) ||
                    parameter.Type == typeof(IMcpServer) ||
                    parameter.Type == typeof(IMcpClient))
                {
                    continue;
                }
                mapping[parameter.ParameterName] = parameter.VariableName;
            }

            JsonNode scheme = JsonNode.Parse(function.JsonSchema.GetRawText())!;

            // step 1
            // replace the parameter name in .required field
            if (function.JsonSchema.TryGetProperty("required", out var required))
            {
                var requiredArray = required.EnumerateArray().Select(x => x.GetString()!).ToList()!;
                for (var i = 0; i < requiredArray.Count; i++)
                {
                    if (mapping.TryGetValue(requiredArray[i], out var dependStepName))
                    {
                        requiredArray[i] = dependStepName;
                    }
                }

                scheme["required"] = JsonNode.Parse(JsonSerializer.Serialize(requiredArray))!;
            }

            // step 2
            // replace the parameter name in .properties field

            if (function.JsonSchema.TryGetProperty("properties", out var properties))
            {
                var propertiesObject = properties.EnumerateObject().ToDictionary(x => x.Name, x => x.Value);
                var updatedProperties = new Dictionary<string, JsonElement>();
                foreach (var property in propertiesObject)
                {
                    if (mapping.TryGetValue(property.Key, out var dependStepName))
                    {
                        updatedProperties[dependStepName] = property.Value;
                    }
                }
                scheme["properties"] = JsonNode.Parse(JsonSerializer.Serialize(updatedProperties))!;
            }

            var updatedScheme = JsonDocument.Parse(scheme.ToString())!;

            var stepAIFunction = new StepAIFunction(engine, step, function, updatedScheme.RootElement);
            result.Add(stepAIFunction);
        }

        return result;
    }
}

/// <summary>
/// A wrapper to execute AI functions using workflow engine.
/// </summary>
public class StepAIFunction(IStepWiseEngine engine, Step step, AIFunction function, JsonElement scheme)
    : AIFunction
{
    public override JsonElement JsonSchema => scheme;

    public override MethodInfo? UnderlyingMethod => function.UnderlyingMethod;

    public override JsonSerializerOptions JsonSerializerOptions => function.JsonSerializerOptions;

    public override string Name => step.Name;

    public override string Description => step.Description;

    protected override async Task<object?> InvokeCoreAsync(IEnumerable<KeyValuePair<string, object?>> arguments, CancellationToken cancellationToken)
    {
        var variables = new List<StepVariable>();
        foreach (var parameter in step.InputParameters)
        {
            var parameterType = parameter.Type;

            // if type is IMcpServer, trying fetching it from arguments
            if (parameterType == typeof(IMcpServer) && arguments.FirstOrDefault(kv => kv.Value?.GetType().IsGenericType is true && kv.Value.GetType().GetGenericTypeDefinition() == typeof(RequestContext<>)) is var mcpServerArgument)
            {
                // get Server property from RequestContext using reflection
                var server = mcpServerArgument.Value?.GetType().GetProperty("Server")?.GetValue(mcpServerArgument.Value) as IMcpServer;
                if (server is not null)
                {
                    variables.Add(StepVariable.Create(parameter.VariableName, server));
                }
                continue;
            }
            var argument = arguments.FirstOrDefault(x => x.Key == parameter.VariableName);
            if (argument.Value is null)
            {
                continue;
            }

            // if argumet.Value is JsonElement, convert it to object using its type information
            if (argument.Value is JsonElement jsonElement)
            {
                var value = JsonSerializer.Deserialize(jsonElement.GetRawText(), parameterType, JsonSerializerOptions) ?? throw new InvalidOperationException("Failed to deserialize JsonElement to object");
                variables.Add(StepVariable.Create(argument.Key, value));
                continue;
            }
            else if (argument.Value.GetType() == parameterType)
            {
                variables.Add(StepVariable.Create(argument.Key, argument.Value));
                continue;
            }
            else if (argument.Value.GetType().IsGenericType && argument.Value.GetType().GetGenericTypeDefinition() == typeof(RequestContext<>))
            {
                // the 
            }
            else
            {
                throw new InvalidOperationException($"Failed to convert argument {argument.Key} to {parameterType}");
            }
        }

        var steps = await engine.ExecuteStepAsync(step.Name, variables).ToArrayAsync(cancellationToken);

        var isFailed = steps.Any(step => step.StepRunType == StepRunType.Failed);
        var failedReason = steps.FirstOrDefault(step => step.StepRunType == StepRunType.Failed)?.Exception?.Message;
        if (failedReason != null)
        {
            return failedReason;
        }
        else
        {
            return steps.Last(step => step.StepRunType == StepRunType.Variable).Variable?.Value ?? "No result";
        }
    }
}
