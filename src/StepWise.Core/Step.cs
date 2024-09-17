// Copyright (c) LittleLittleCloud. All rights reserved.
// Step.cs

using System.Reflection;

namespace StepWise.Core;

public class Step
{
    internal Step(string name, string description, List<Parameter> inputParameters, Type outputType, List<string> dependencies, Delegate stepMethod)
    {
        Name = name;
        InputParameters = inputParameters;
        OutputType = outputType;
        Dependencies = dependencies;
        StepMethod = stepMethod;
        Description = description;
    }

    public static Step CreateFromMethod(Delegate stepMethod)
    {
        var name = stepMethod.Method.Name;
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

        foreach (var param in parameters)
        {
            var sourceStep = param.GetCustomAttribute<FromStepAttribute>()?.Name;
            var hasDefaultValue = param.HasDefaultValue;
            inputParameters.Add(new Parameter(param.Name!, param.ParameterType, sourceStep, hasDefaultValue, param.DefaultValue));
        }

        return new Step(name, string.Empty, inputParameters, outputType, dependencies, stepMethod);
    }

    public string Name { get; set; }
    public List<Parameter> InputParameters { get; set; }
    public Type OutputType { get; set; }
    public List<string> Dependencies { get; set; }
    public Delegate StepMethod { get; set; }

    public string Description { get; set; }

    public bool IsExecuctionConditionSatisfied(Dictionary<string, StepVariable> inputs)
    {
        foreach (var param in InputParameters)
        {
            if (param.HasDefaultValue)
            {
                continue;
            }

            if (!inputs.ContainsKey(param.SourceStep ?? param.Name))
            {
                return false;
            }
        }

        return true;
    }

    private bool IsExecuctionConditionSatisfied(Dictionary<string, object> inputs)
    {
        foreach (var param in InputParameters)
        {
            if (param.HasDefaultValue)
            {
                continue;
            }

            if (!inputs.ContainsKey(param.SourceStep ?? param.Name))
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
        if (!IsExecuctionConditionSatisfied(inputs))
        {
            return null;
        }

        // get parameters from the inputs
        var parameters = new object?[InputParameters.Count];
        for (int i = 0; i < InputParameters.Count; i++)
        {
            var key = InputParameters[i].SourceStep ?? InputParameters[i].Name;
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

        // if the result is a Task<TResult> then return it
        if (result is Task task)
        {
            await task;
            var property = task.GetType().GetProperty("Result");
            return property?.GetValue(task);
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
}

public enum StepStatus
{
    NotStarted,
    Running,
    Completed,
    Failed
}

/// <summary>
/// The step run represents the minimal unit of execute a step.
/// It contains the step, the generation of the step, and the inputs(parameter) of the step.
/// </summary>
public class StepRun
{
    private readonly Step _step;
    private readonly int _generation = 0;
    private readonly Dictionary<string, StepVariable> _inputs = new();
    private readonly StepStatus _status = StepStatus.NotStarted;
    private readonly StepVariable? _result = null;
    private readonly Exception? _exception = null;

    private StepRun(
        Step step,
        int generation,
        Dictionary<string, StepVariable> inputs,
        StepStatus status = StepStatus.NotStarted,
        StepVariable? result = null,
        Exception? exception = null)
    {
        _step = step;
        _generation = generation;
        _inputs = inputs;
        _status = status;
        _result = result;
        _exception = exception;
    }

    public Step Step => _step;

    public string StepName => _step.Name;

    public int Generation => _generation;

    public Dictionary<string, StepVariable> Inputs => _inputs;

    public StepVariable? Result => _result;

    public Exception? Exception => _exception;

    public StepStatus Status => _status;

    public static StepRun Create(
        Step step,
        int generation,
        Dictionary<string, StepVariable>? inputs = null)
    {
        return new StepRun(step, generation, inputs ?? new Dictionary<string, StepVariable>());
    }

    public StepRun ToRunningStatus()
    {
        if (_status != StepStatus.NotStarted)
        {
            throw new InvalidOperationException("The step is not in the not started status.");
        }

        return new StepRun(_step, _generation, _inputs, StepStatus.Running, _result, _exception);
    }

    public StepRun ToCompletedStatus(StepVariable? result = null)
    {
        if (_status != StepStatus.Running)
        {
            throw new InvalidOperationException("The step is not in the running status.");
        }

        return new StepRun(_step, _generation, _inputs, StepStatus.Completed, result, _exception);
    }

    public StepRun ToFailedStatus(Exception ex)
    {
        if (_status != StepStatus.Running)
        {
            throw new InvalidOperationException("The step is not in the running status.");
        }

        return new StepRun(_step, _generation, _inputs, StepStatus.Failed, _result, ex);
    }

    public Task<object?> ExecuteAsync(CancellationToken ct = default)
    {
        if (_status != StepStatus.Running)
        {
            throw new InvalidOperationException("The step is not in the running status.");
        }

        return _step.ExecuteAsync(_inputs.ToDictionary(kv => kv.Key, kv => kv.Value.Value), ct);
    }

    public override string ToString()
    {
        // format [gen] stepName([gen]input1, [gen]input2, ...)
        var inputs = string.Join(", ", _inputs.Select(kv => $"{kv.Key}[{_inputs[kv.Key].Generation}]"));
        return $"{_step.Name}[{_generation}]({inputs})[status: {_status}]";
    }
}
