// Copyright (c) LittleLittleCloud. All rights reserved.
// Step.cs

using System;
using System.ComponentModel;
using System.Reflection;

namespace StepWise.Core;

public enum StepType
{
    Ordinary,
    StepWiseUITextInput,
    StepWiseUINumberInput,
    StepWiseUISwitchInput,
    StepWiseUIImageInput,
}

public class Step
{
    internal Step(
        string name,
        string description,
        List<Parameter> inputParameters,
        Type outputType,
        List<string> dependencies,
        Delegate stepMethod,
        StepType stepType = StepType.Ordinary)
    {
        Name = name;
        InputParameters = inputParameters;
        OutputType = outputType;
        Dependencies = dependencies;
        StepMethod = stepMethod;
        Description = description;
        StepType = stepType;
    }

    public static Step CreateFromMethod(Delegate stepMethod, string? name = null, string? description = null, StepType stepType = StepType.Ordinary)
    {
        name ??= stepMethod.Method.Name;
        description ??= string.Empty;
        var inputParameters = new List<Parameter>();
        var dependencies = new List<string>();
        var outputType = stepMethod.Method.ReturnType;

        // the outputType must be an awaitable type
        if ((!outputType.IsGenericType || outputType.GetGenericTypeDefinition() != typeof(Task<>)) && outputType != typeof(Task))
        {
            throw new ArgumentException("The return type of the step method must be Task<> or Task.");
        }

        // get the input parameters
        var parameters = stepMethod.Method.GetParameters();
        // the parameters can't be ref or out
        if (parameters.Any(p => p.IsOut || p.ParameterType.IsByRef))
        {
            throw new ArgumentException("The input parameters of the step method can't be ref or out.");
        }

        // get DependOnAttribute
        var dependOnAttributes = stepMethod.Method.GetCustomAttributes<DependOnAttribute>();
        foreach (var attr in dependOnAttributes)
        {
            dependencies.Add(attr.Name);
        }

        // get the input parameters
        foreach (var param in parameters)
        {
            var sourceStep = param.GetCustomAttribute<FromStepAttribute>()?.Name;
            var isStepConfiguration = param.GetCustomAttribute<StepConfigurationAttribute>() != null;

            if (isStepConfiguration)
            {
                if (sourceStep != null)
                {
                    throw new ArgumentException("The parameter can't have both FromStepAttribute and StepConfigurationAttribute.");
                }

                // check if the parameter type is int, float, double, string, or bool
                // if not, throw an exception
                if (param.ParameterType != typeof(int) &&
                    param.ParameterType != typeof(float) &&
                    param.ParameterType != typeof(double) &&
                    param.ParameterType != typeof(string) &&
                    param.ParameterType != typeof(bool))
                {
                    throw new ArgumentException("The parameter type of the StepConfigurationAttribute must be int, float, double, string, or bool.");
                }
            }
            var hasDefaultValue = param.HasDefaultValue;

            var descriptionAttr = param.GetCustomAttribute<DescriptionAttribute>();
            var descriptionValue = descriptionAttr?.Description ?? string.Empty;
            inputParameters.Add(new Parameter(param.Name!, param.ParameterType, sourceStep ?? param.Name!, name, hasDefaultValue, param.DefaultValue, isStepConfiguration, descriptionValue));
        }

        return new Step(name, description, inputParameters, outputType, dependencies, stepMethod, stepType);
    }

    public static Step CreateFromStepWiseUITextInput(Delegate stepMethod, string? name = null, string? description = null)
    {
        // step 1: Check if the return type is Task<string?>
        var outputType = stepMethod.Method.ReturnType;
        if (outputType != typeof(Task<string?>))
        {
            throw new ArgumentException("The return type of the StepWiseUITextInput method must be Task<string?>.");
        }

        return CreateFromMethod(stepMethod, name, description, stepType: StepType.StepWiseUITextInput);
    }

    public static Step CreateFromStepWiseUINumberInput(Delegate stepMethod, string? name = null, string? description = null)
    {
        // step 1: Check if the return type is Task<double?>
        var outputType = stepMethod.Method.ReturnType;
        if (outputType != typeof(Task<double?>))
        {
            throw new ArgumentException("The return type of the StepWiseUINumberInput method must be Task<double?>.");
        }

        return CreateFromMethod(stepMethod, name, description, stepType: StepType.StepWiseUINumberInput);
    }

    public static Step CreateFromStepWiseUISwitchInput(Delegate stepMethod, string? name = null, string? description = null)
    {
        // step 1: Check if the return type is Task<bool?>
        var outputType = stepMethod.Method.ReturnType;
        if (outputType != typeof(Task<bool?>))
        {
            throw new ArgumentException("The return type of the StepWiseUISwitchInput method must be Task<bool?>.");
        }

        return CreateFromMethod(stepMethod, name, description, stepType: StepType.StepWiseUISwitchInput);
    }

    public static Step CreateFromStepWiseUIImageInput(Delegate stepMethod, string? name = null, string? description = null)
    {
        // step 1: Check if the return type is Task<StepWiseImage?>
        var outputType = stepMethod.Method.ReturnType;
        if (outputType != typeof(Task<StepWiseImage?>))
        {
            throw new ArgumentException("The return type of the StepWiseUIImageInput method must be Task<StepWiseImage?>.");
        }

        return CreateFromMethod(stepMethod, name, description, stepType: StepType.StepWiseUIImageInput);
    }

    public string Name { get; set; }

    public List<Parameter> InputParameters { get; set; }

    public Type OutputType { get; set; }

    public List<string> Dependencies { get; set; }

    public Delegate StepMethod { get; set; }

    public string Description { get; set; }

    /// <summary>
    /// This property is used by the UI to determine the type of the step.
    /// </summary>
    public StepType StepType { get; }

    public bool IsExecutionConditionSatisfied(IDictionary<string, StepVariable> inputs)
    {
        foreach (var param in InputParameters)
        {
            if (param.HasDefaultValue)
            {
                continue;
            }

            if (!inputs.ContainsKey(param.VariableName))
            {
                return false;
            }
        }

        return true;
    }

    private bool IsExecutionConditionSatisfied(Dictionary<string, object> inputs)
    {
        foreach (var param in InputParameters)
        {
            if (param.HasDefaultValue)
            {
                continue;
            }

            if (!inputs.ContainsKey(param.VariableName))
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>
    /// Execute the step method. Return null if the step is not ready to run because of missing dependencies/inputs.
    /// </summary>
    /// <param name="inputs"></param>
    /// <param name="ct"></param>
    /// <returns></returns>
    /// <exception cref="InvalidOperationException"></exception>
    public async Task<object?> ExecuteAsync(Dictionary<string, object>? inputs = null, CancellationToken ct = default)
    {
        inputs ??= new Dictionary<string, object>();

        // check if all dependencies are met
        if (!IsExecutionConditionSatisfied(inputs))
        {
            return null;
        }

        // get parameters from the inputs
        var parameters = new object?[InputParameters.Count];
        for (int i = 0; i < InputParameters.Count; i++)
        {
            var key = InputParameters[i].VariableName;
            var input = key switch
            {
                _ when inputs.ContainsKey(key) => inputs[key],
                _ when !inputs.ContainsKey(key) && InputParameters[i].HasDefaultValue => InputParameters[i].DefaultValue,
                _ => throw new InvalidOperationException($"The input parameter '{key}' is missing.")
            };
            parameters[i] = input;
        }

        // execute the step method
        var result = StepMethod.DynamicInvoke(parameters) ?? throw new InvalidOperationException("The step method must return a value.");

        // if the output type is Task, await and return null
        if (OutputType == typeof(Task))
        {
            await (Task)result;
            return null;
        }

        // if the result is a Task<TResult> then return it
        if (result is Task task)
        {
            await task;
            var property = task.GetType().GetProperty("Result");
            var taskValue = property?.GetValue(task);

            return taskValue;
        }

        throw new InvalidOperationException("The step method must return a Task<T>.");
    }

    public override string ToString()
    {
        return Name;
    }
}

public class StepVariable
{
    internal StepVariable(string name, int generation, object value)
    {
        Generation = generation;
        Value = value;
        Name = name;
    }

    public static StepVariable Create(string name, object value, int generation = 0)
    {
        return new StepVariable(name, generation, value);
    }

    public static StepVariable Null = StepVariable.Create(string.Empty, "empty");

    public int Generation { get; set; }

    public object Value { get; set; }

    public string Name { get; set; }

    /// <summary>
    /// A convenient method to cast the result to the specified type.
    /// </summary>
    public T As<T>()
    {
        return (T)Value;
    }

    public override string ToString()
    {
        return $"Variable: {Name}[{Generation}]";
    }
}

public enum StepRunType
{
    Queue,
    NotReady,
    Running,
    Completed,
    Variable,
    Failed,
}

/// <summary>
/// The step run represents the minimal unit of execute a step.
/// It contains the step, the generation of the step, and the inputs(parameter) of the step.
/// </summary>
public class StepRun
{
    private readonly Step? _step;
    private readonly int _generation = 0;
    private readonly Dictionary<string, StepVariable> _inputs = new();
    private readonly StepRunType _stepType = StepRunType.Queue;
    private readonly StepVariable? _result = null;
    private readonly Exception? _exception = null;

    private StepRun(
        Step? step,
        int generation,
        Dictionary<string, StepVariable>? inputs,
        StepRunType stepType = StepRunType.Queue,
        StepVariable? result = null,
        Exception? exception = null)
    {
        _step = step;
        _generation = generation;
        _inputs = inputs ?? new Dictionary<string, StepVariable>();
        _stepType = stepType;
        _result = result;
        _exception = exception;
    }

    public Step? Step => _step;

    public string Name => _step?.Name ?? _result?.Name ?? throw new InvalidOperationException("The step or result is not defined.");

    public int Generation => _generation;

    public Dictionary<string, StepVariable> Inputs => _inputs;

    public StepVariable? Variable => _result;

    public Exception? Exception => _exception;

    public StepRunType StepRunType => _stepType;

    public static StepRun Create(
        Step step,
        int generation,
        IDictionary<string, StepVariable>? inputs = null)
    {
        // create variable for inputs with default value
        var clonedInputs = inputs?.ToDictionary(kv => kv.Key, kv => kv.Value) ?? new Dictionary<string, StepVariable>();
        var parameters = step.InputParameters;
        foreach (var param in parameters)
        {
            if (!clonedInputs.ContainsKey(param.VariableName) && param.HasDefaultValue && param.DefaultValue != null)
            {
                clonedInputs[param.VariableName] = StepVariable.Create(param.VariableName, param.DefaultValue);
            }
        }

        return new StepRun(step, generation, clonedInputs);
    }

    public static StepRun CreateVariable(StepVariable variable)
    {
        return new StepRun(null, variable.Generation, null, StepRunType.Variable, variable, null);
    }

    public StepRun ToMissingInput()
    {
        if (_stepType != StepRunType.Queue)
        {
            throw new InvalidOperationException("The step is not in the not started status.");
        }

        return new StepRun(_step, _generation, _inputs, StepRunType.NotReady, _result, _exception);
    }

    public StepRun ToRunningStatus()
    {
        if (_stepType != StepRunType.Queue)
        {
            throw new InvalidOperationException("The step is not in the not started status.");
        }

        return new StepRun(_step, _generation, _inputs, StepRunType.Running, _result, _exception);
    }

    public StepRun ToCompletedStatus()
    {
        if (_stepType != StepRunType.Running)
        {
            throw new InvalidOperationException("The step is not in the running status.");
        }

        return new StepRun(_step, _generation, _inputs, StepRunType.Completed, _result, _exception);
    }

    public StepRun ToFailedStatus(Exception ex)
    {
        if (_stepType != StepRunType.Running)
        {
            throw new InvalidOperationException("The step is not in the running status.");
        }

        return new StepRun(_step, _generation, _inputs, StepRunType.Failed, _result, ex);
    }

    public Task<object?> ExecuteAsync(CancellationToken ct = default)
    {
        if (_stepType != StepRunType.Running)
        {
            throw new InvalidOperationException("The step is not in the running status.");
        }

        if (_step == null)
        {
            throw new InvalidOperationException("The step is not defined.");
        }

        return _step.ExecuteAsync(_inputs.ToDictionary(kv => kv.Key, kv => kv.Value.Value), ct);
    }

    public override string ToString()
    {
        if (this.Step is null && this.StepRunType == StepRunType.Variable)
        {
            return $"{_result!.Name}[{_result!.Generation}]:{_result!.Value}";
        }

        // format [gen] stepName([gen]input1, [gen]input2, ...)
        var parameters = this._step!.InputParameters.Select(p => p.ParameterName);
        var filteredInputs = _inputs.Where(kv => parameters.Contains(kv.Key));
        var inputs = string.Join(", ", filteredInputs.Select(kv => $"{kv.Key}[{_inputs[kv.Key].Generation}]"));
        return $"{_step.Name}[{_generation}]({inputs})[status: {_stepType}]";
    }
}
