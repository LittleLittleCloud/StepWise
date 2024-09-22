// Copyright (c) LittleLittleCloud. All rights reserved.
// DTO.cs

using System.Text.Json;
using System.Text.Json.Serialization;
using StepWise.Core;

namespace StepWise.WebAPI;

public record VariableDTO(
    [property:JsonPropertyName("name")]
    string Name,
    [property:JsonPropertyName("type")]
    string Type,
    [property:JsonPropertyName("displayValue")]
    string DisplayValue,
    [property:JsonPropertyName("generation")]
    int Generation)
{
    public static VariableDTO FromVariable(StepVariable variable)
    {
        var typeString = variable.Value?.GetType().Name ?? "null";
        var displayValue = JsonSerializer.Serialize(variable.Value, new JsonSerializerOptions { WriteIndented = true });
        return new VariableDTO(variable.Name, typeString, displayValue, variable.Generation);
    }
}
public record StepDTO(
    [property:JsonPropertyName("name")]
    string Name,
    [property:JsonPropertyName("description")]
    string? Description,
    [property:JsonPropertyName("dependencies")]
    string[]? Dependencies,
    [property:JsonPropertyName("variables")]
    string[]? Variables)
{
    public static StepDTO FromStep(Step step)
    {
        var dependencies = step.Dependencies.ToArray();
        var variables = step.InputParameters.Select(p => p.SourceStep ?? p.Name).ToArray();
        return new StepDTO(step.Name, step.Description, dependencies, variables);
    }
}

public record ExceptionDTO(
    [property:JsonPropertyName("message")]
    string Message,
    [property:JsonPropertyName("stackTrace")]
    string? StackTrace)
{
    public static ExceptionDTO FromException(Exception exception)
    {
        return new ExceptionDTO(exception.Message, exception.StackTrace);
    }
}

public record StepRunDTO(
    [property:JsonPropertyName("step")]
    StepDTO? Step,
    [property:JsonPropertyName("variables")]
    VariableDTO[] Variables,
    [property:JsonPropertyName("generation")]
    int Generation,
    [property:JsonPropertyName("status")]
    string Status,
    [property:JsonPropertyName("result")]
    VariableDTO? Result,
    [property:JsonPropertyName("exception")]
    ExceptionDTO? Exception)
{
    public static StepRunDTO FromStepRun(StepRun stepRun)
    {
        var variables = stepRun.Inputs.Values.Select(VariableDTO.FromVariable).ToArray();
        var result = stepRun.Variable is null ? null : VariableDTO.FromVariable(stepRun.Variable);
        var exception = stepRun.Exception is null ? null : ExceptionDTO.FromException(stepRun.Exception);
        var stepRunDTO = stepRun.Step is null ? null : StepDTO.FromStep(stepRun.Step);
        return new StepRunDTO(stepRunDTO, variables, stepRun.Generation, Enum.GetName(stepRun.StepType)!, result, exception);
    }
}

public record WorkflowDTO(
    [property:JsonPropertyName("name")]
    string Name,
    [property:JsonPropertyName("description")]
    string? Description,
    [property:JsonPropertyName("steps")]
    StepDTO[] Steps)
{
    public static WorkflowDTO FromWorkflow(Workflow workflow)
    {
        var steps = workflow.Steps.Values.Select(StepDTO.FromStep).ToArray();
        return new WorkflowDTO(workflow.Name, null, steps);
    }
}
