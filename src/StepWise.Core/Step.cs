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

        foreach ( var param in parameters )
        {
            var sourceStep = param.GetCustomAttribute<FromStepAttribute>()?.Name;
            var hasDefaultValue = param.HasDefaultValue;
            inputParameters.Add(new Parameter(param.Name!, param.ParameterType, sourceStep, hasDefaultValue));

            if (sourceStep != null)
            {
                dependencies.Add(sourceStep);
            }
        }

        return new Step(name, inputParameters, outputType, dependencies, stepMethod);
    }

    public string Name { get; set; }
    public List<Parameter> InputParameters { get; set; }
    public Type OutputType { get; set; }
    public List<string> Dependencies { get; set; }
    public Delegate StepMethod { get; set; }

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
        foreach (var param in InputParameters)
        {
            // continue if param has default value
            if (param.HasDefaultValue)
            {
                continue;
            }

            if (!inputs.ContainsKey(param.SourceStep ?? param.Name))
            {
                return null;
            }
        }
        // get parameters from the inputs
        var parameters = new object[InputParameters.Count];
        for (int i = 0; i < InputParameters.Count; i++)
        {
            var input = inputs[InputParameters[i].SourceStep ?? InputParameters[i].Name];
            parameters[i] = Convert.ChangeType(input, InputParameters[i].Type);
        }

        // execute the step method
        var result = StepMethod.DynamicInvoke(parameters) ?? throw new InvalidOperationException("The step method must return a value.");

        // if the result is a Task<TResult> then return it
        if (result is Task task)
        {
            await task;
            var property = task.GetType().GetProperty("Result");
            return property?.GetValue(task) ?? throw new InvalidOperationException("The step method must return a value.");
        }

        throw new InvalidOperationException("The step method must return a Task<T>.");
    }
}
