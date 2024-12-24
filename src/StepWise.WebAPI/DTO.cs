// Copyright (c) LittleLittleCloud. All rights reserved.
// DTO.cs

using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;
using StepWise.Core;

namespace StepWise.WebAPI;

public record VariableDTO(
    [property:JsonPropertyName("value")]
    JsonDocument? Value,
    [property:JsonPropertyName("displayValue")]
    string? DisplayValue)
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new() { IncludeFields = true };

    [JsonPropertyName("name")]
    [Required]
    public required string Name { get; init; }

    [JsonPropertyName("type")]
    [Required]
    public required string VariableType { get; init; }

    [JsonPropertyName("generation")]
    [Required]
    public required int Generation { get; init; }

    public static VariableDTO FromVariable(StepVariable variable)
    {
        var typeString = variable.Value?.GetType().Name ?? "null";
        var displayValue = variable.Value?.ToString();
        var value = variable.Value switch
        {
            null => null,
            _ => JsonDocument.Parse(JsonSerializer.Serialize(variable.Value, _jsonSerializerOptions))
        };
        return new VariableDTO(value, displayValue)
        {
            Name = variable.Name,
            VariableType = typeString,
            Generation = variable.Generation,
        };
    }

    public static StepVariable FromVariableDTO(VariableDTO variableDTO, Type variableType)
    {
        var json = variableDTO.Value?.RootElement.GetRawText() ?? throw new ArgumentNullException(nameof(variableDTO.Value));
        var value = JsonSerializer.Deserialize(json, variableType, _jsonSerializerOptions) ?? throw new ArgumentNullException(nameof(json));

        return StepVariable.Create(variableDTO.Name, value, variableDTO.Generation);
    }
}

public record ParameterDTO
{
    public static ParameterDTO FromParameter(Parameter parameter)
    {
        return new ParameterDTO
        {
            Name = parameter.ParameterName,
            ParameterType = parameter.Type.Name,
            VariableName = parameter.VariableName,
            StepName = parameter.StepName,
            IsConfigurableFromWebUI = parameter.IsConfigurableFromWebUI,
            Description = parameter.Description,
        };
    }

    [JsonPropertyName("name")]
    [Required]
    public required string Name { get; init; }

    [JsonPropertyName("parameter_type")]
    [Required]
    public required string ParameterType { get; init; }

    [JsonPropertyName("variable_name")]
    [Required]
    public required string VariableName { get; init; }

    [JsonPropertyName("step_name")]
    [Required]
    public required string StepName { get; init; }

    [JsonPropertyName("is_configurable_from_web_ui")]
    [Required]
    public required bool IsConfigurableFromWebUI { get; init; }

    [JsonPropertyName("description")]
    [Required]
    public required string Description { get; init; }

    public string FullName => $"{StepName}.{Name}";
}

public record StepDTO(
    [property:JsonPropertyName("description")]
    string? Description,
    [property:JsonPropertyName("dependencies")]
    string[]? Dependencies,
    [property:JsonPropertyName("parameters")]
    ParameterDTO[]? Parameters)
{
    public static StepDTO FromStep(Step step)
    {
        var dependencies = step.Dependencies.ToArray();
        var parameters = step.InputParameters.Select(p => ParameterDTO.FromParameter(p)).ToArray();
        var stepType = Enum.GetName(step.StepType)!;

        return new StepDTO(step.Description, dependencies, parameters)
        {
            StepType = stepType,
            Name = step.Name,
        };
    }

    [JsonPropertyName("step_type")]
    [Required]
    public required string StepType { get; init; }

    [JsonPropertyName("name")]
    [Required]
    public required string Name { get; init; }
}

public record ExceptionDTO(
    [property:JsonPropertyName("stackTrace")]
    string? StackTrace)
{
    public static ExceptionDTO FromException(Exception exception)
    {
        return new ExceptionDTO(exception.StackTrace)
        {
            Message = exception.Message,
        };
    }

    [JsonPropertyName("message")]
    [Required]
    public required string Message { get; init; }
}

public record StepRunDTO(
    [property:JsonPropertyName("step")]
    StepDTO? Step,
    [property:JsonPropertyName("variables")]
    VariableDTO[]? Variables,
    [property:JsonPropertyName("result")]
    VariableDTO? Result,
    [property:JsonPropertyName("exception")]
    ExceptionDTO? Exception)
{
    public static StepRunDTO FromStepRun(StepRun stepRun)
    {
        var variables = stepRun.Inputs.Values.Select(v => VariableDTO.FromVariable(v)).ToArray();
        var result = stepRun.Variable is null ? null : VariableDTO.FromVariable(stepRun.Variable);
        var exception = stepRun.Exception is null ? null : ExceptionDTO.FromException(stepRun.Exception);
        var stepRunDTO = stepRun.Step is null ? null : StepDTO.FromStep(stepRun.Step);
        return new StepRunDTO(stepRunDTO, variables, result, exception)
        {
            Generation = stepRun.Generation,
            Status = Enum.GetName(stepRun.StepRunType)!,
        };
    }

    [JsonPropertyName("generation")]
    [Required]
    public required int Generation { get; init; }

    [JsonPropertyName("status")]
    [Required]
    public required string Status { get; init; }

}

public record WorkflowDTO(
    [property:JsonPropertyName("description")]
    string? Description)
{
    public static WorkflowDTO FromWorkflow(Workflow workflow)
    {
        var steps = workflow.Steps.Values.Select(StepDTO.FromStep).ToArray();
        return new WorkflowDTO(Description: null)
        {
            Name = workflow.Name,
            Steps = steps,
        };
    }

    [JsonPropertyName("name")]
    [Required]
    public required string Name { get; init; }

    [JsonPropertyName("steps")]
    [Required]
    public required StepDTO[] Steps { get; init; }
}
