﻿// Copyright (c) LittleLittleCloud. All rights reserved.
// DTO.cs

using System.Text.Json;
using StepWise.Core;

namespace StepWise.WebAPI;

public record VariableDTO(string Name, string Type, string DisplayValue, int Generation)
{
    public static VariableDTO FromVariable(StepVariable variable)
    {
        var typeString = variable.Value?.GetType().Name ?? "null";
        var displayValue = JsonSerializer.Serialize(variable.Value, new JsonSerializerOptions { WriteIndented = true });
        return new VariableDTO(variable.Name, typeString, displayValue, variable.Generation);
    }
}
public record StepDTO(string Name, string? Description, string[]? Dependencies, string[]? Variables)
{
    public static StepDTO FromStep(Step step)
    {
        var dependencies = step.Dependencies.ToArray();
        var variables = step.InputParameters.Select(p => p.SourceStep ?? p.Name).ToArray();
        return new StepDTO(step.Name, step.Description, dependencies, variables);
    }
}

public record ExceptionDTO(string Message, string? StackTrace)
{
    public static ExceptionDTO FromException(Exception exception)
    {
        return new ExceptionDTO(exception.Message, exception.StackTrace);
    }
}

public record StepRunDTO(
    StepDTO Step,
    VariableDTO[] Variables,
    int Generation,
    string Status,
    VariableDTO? Result,
    ExceptionDTO? Exception)
{
    public static StepRunDTO FromStepRun(StepRun stepRun)
    {
        var variables = stepRun.Inputs.Values.Select(VariableDTO.FromVariable).ToArray();
        var result = stepRun.Result is null ? null : VariableDTO.FromVariable(stepRun.Result);
        var exception = stepRun.Exception is null ? null : ExceptionDTO.FromException(stepRun.Exception);
        return new StepRunDTO(StepDTO.FromStep(stepRun.Step), variables, stepRun.Generation, Enum.GetName(stepRun.Status)!, result, exception);
    }
}

public record StepRunAndResultDTO(StepRunDTO StepRun, VariableDTO? Result)
{
    public static StepRunAndResultDTO FromStepRunAndResult(StepRun stepRun, StepVariable? result = null)
    {
        var stepRunDTO = StepRunDTO.FromStepRun(stepRun);
        var resultDTO = result is null ? null : VariableDTO.FromVariable(result);
        return new StepRunAndResultDTO(stepRunDTO, resultDTO);
    }
}

public record WorkflowDTO(string Name, string? Description, StepDTO[] Steps)
{
    public static WorkflowDTO FromWorkflow(Workflow workflow)
    {
        var steps = workflow.Steps.Values.Select(StepDTO.FromStep).ToArray();
        return new WorkflowDTO(workflow.Name, null, steps);
    }
}
