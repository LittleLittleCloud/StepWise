// Copyright (c) LittleLittleCloud. All rights reserved.
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

public record StepRunDTO(StepDTO Step, VariableDTO[] Variables, int Generation)
{
    public static StepRunDTO FromStepRun(StepRun stepRun)
    {
        var variables = stepRun.Inputs.Values.Select(VariableDTO.FromVariable).ToArray();
        return new StepRunDTO(StepDTO.FromStep(stepRun.Step), variables, stepRun.Generation);

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
