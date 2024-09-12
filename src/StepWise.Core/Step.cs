// Copyright (c) LittleLittleCloud. All rights reserved.
// Step.cs

using System.Reflection;

namespace StepWise.Core;

public class Step
{
    internal Step(string name, List<Parameter> inputParameters, Type outputType, List<string> dependencies, Delegate stepMethod)
    {
        Name = name;
        InputParameters = inputParameters;
        OutputType = outputType;
        Dependencies = dependencies;
        StepMethod = stepMethod;
    }

    public static Step CreateFromMethod(Delegate stepMethod)
    {
        var name = stepMethod.Method.Name;
        var inputParameters = new List<Parameter>();
        var dependencies = new List<string>();
        var outputType = stepMethod.Method.ReturnType;

        // the outputType must be an awaitable type
        if (!outputType.IsGenericType || outputType.GetGenericTypeDefinition() != typeof(Task<>))
        {
            throw new ArgumentException("The return type of the step method must be Task<T>.");
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

        return new Step(name, inputParameters, outputType, dependencies, stepMethod);
    }

    public string Name { get; set; }
    public List<Parameter> InputParameters { get; set; }
    public Type OutputType { get; set; }
    public List<string> Dependencies { get; set; }
    public Delegate StepMethod { get; set; }

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
    public StepVariable(int generation, object value)
    {
        Generation = generation;
        Value = value;
    }

    public static StepVariable Create(object value, int generation = 0)
    {
        return new StepVariable(generation, value);
    }

    public int Generation { get; set; }

    public object Value { get; set; }

    /// <summary>
    /// A convenient method to cast the result to the specified type.
    /// </summary>
    public T As<T>()
    {
        return (T)Value;
    }
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

    private StepRun(Step step, int generation, Dictionary<string, StepVariable> inputs)
    {
        _step = step;
        _generation = generation;
        _inputs = inputs;
    }

    public Step Step => _step;

    public int Generation => _generation;

    public Dictionary<string, StepVariable> Inputs => _inputs;

    public static StepRun Create(Step step, int generation, Dictionary<string, StepVariable>? inputs = null)
    {
        return new StepRun(step, generation, inputs ?? new Dictionary<string, StepVariable>());
    }

    public async Task<object?> ExecuteAsync(CancellationToken ct = default)
    {
        return await _step.ExecuteAsync(_inputs.ToDictionary(kv => kv.Key, kv => kv.Value.Value), ct);
    }

    public override string ToString()
    {
        // format [gen] stepName([gen]input1, [gen]input2, ...)
        var inputs = string.Join(", ", _inputs.Select(kv => $"{kv.Key}[{_inputs[kv.Key].Generation}]"));
        return $"{_step.Name}[{_generation}]({inputs})";
    }
}

public class StepResult
{
    public StepResult(StepRun stepBean, object? result)
    {
        StepRun = stepBean;
        Result = result is null ? null : StepVariable.Create(result, stepBean.Generation);
    }

    public static StepResult Create(StepRun stepBean, object? result)
    {
        return new StepResult(stepBean, result);
    }

    public StepRun StepRun { get; }

    public string StepName => StepRun.Step.Name;

    /// <summary>
    /// The result of the step.
    /// </summary>
    public StepVariable? Result { get; }
}
