using System.Linq.Expressions;
using System.Reflection;

namespace StepWise.Core;

public class Workflow
{
    private readonly Dictionary<string, Step> _steps = new();

    internal Workflow(Dictionary<string, Step> steps) => _steps = steps;

    public Dictionary<string, Step> Steps => _steps;

    public static Workflow CreateFromType(object instance)
    {
        var type = instance.GetType();
        var steps = new Dictionary<string, Step>();

        foreach (var method in type.GetMethods())
        {
            var stepAttribute = method.GetCustomAttribute<StepAttribute>();
            if (stepAttribute is null)
            {
                continue;
            }
            var parameterTypes = method.GetParameters().Select(p => p.ParameterType).ToArray();
            var returnType = method.ReturnType;
            var step = Step.CreateFromMethod(method.CreateDelegate(Expression.GetFuncType([.. parameterTypes, returnType]), instance));
            steps.Add(step.Name, step);
        }

        return new Workflow(steps);
    }
}
