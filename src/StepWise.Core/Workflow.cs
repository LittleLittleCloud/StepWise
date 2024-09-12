// Copyright (c) LittleLittleCloud. All rights reserved.
// Workflow.cs

using System.Linq.Expressions;
using System.Reflection;

namespace StepWise.Core;

public class Workflow
{
    private readonly Dictionary<string, Step> _steps = new();
    private readonly List<(Step, Step)> _adajcentMap = new(); // from -> to

    internal Workflow(string name, Dictionary<string, Step> steps)
    {
        _steps = steps;
        Name = name;
        foreach (var step in steps.Values)
        {
            foreach (var dependency in step.Dependencies)
            {
                _adajcentMap.Add((steps[dependency], step));
            }
        }
    }

    public Dictionary<string, Step> Steps => _steps;

    public string Name { get; }

    public static Workflow CreateFromInstance(object instance, string? name = null)
    {
        var type = instance.GetType();
        name ??= type.Name;
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

        return new Workflow(name, steps);
    }

    /// <summary>
    /// Get the steps that are prerequisites for the given step.
    /// </summary>
    /// <param name="step"></param>
    /// <returns></returns>
    public Step[] GetDirectPrerequisiteSteps(Step step)
    {
        return step.Dependencies.Select(d => _steps[d]).ToArray();
    }

    /// <summary>
    /// Get all steps that depend on the given step.
    /// </summary>
    public Step[] GetAllDependSteps(Step step)
    {
        var visited = new HashSet<string>();
        var dependSteps = new List<Step>();

        void BFS(Step s)
        {
            if (visited.Contains(s.Name))
            {
                return;
            }

            visited.Add(s.Name);
            dependSteps.Add(s);

            var toSteps = _adajcentMap.Where(x => x.Item1.Name == s.Name).Select(x => x.Item2);

            foreach (var next in toSteps)
            {
                BFS(next);
            }
        }


        BFS(step);

        return dependSteps.Where(s => s != step).ToArray();
    }

    /// <summary>
    /// Get the steps that directly depend on the given step.
    /// </summary>
    /// <param name="step"></param>
    /// <returns></returns>
    public Step[] GetDirectDependSteps(Step step)
    {
        var dependSteps = new List<Step>();
        foreach (var s in _steps.Values)
        {
            if (s.Dependencies.Contains(step.Name))
            {
                dependSteps.Add(s);
            }
        }

        return dependSteps.ToArray();
    }
}
