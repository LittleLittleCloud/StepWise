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

    /// <summary>
    /// Sort the steps in topological order.
    /// </summary>
    public IEnumerable<Step> TopologicalSort()
    {
        var inStepCount = _adajcentMap.GroupBy(x => x.Item2).ToDictionary(x => x.Key, x => x.Count());

        var queue = new Queue<Step>(_steps.Values.Where(s => !inStepCount.ContainsKey(s)));

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            yield return current;

            foreach (var next in _adajcentMap.Where(x => x.Item1 == current).Select(x => x.Item2))
            {
                inStepCount[next]--;
                if (inStepCount[next] == 0)
                {
                    queue.Enqueue(next);
                }
            }
        }
    }

    public static Workflow CreateFromInstance(object instance, string? name = null)
    {
        var type = instance.GetType();
        name ??= type.Name;
        var steps = new Dictionary<string, Step>();

        foreach (var method in type.GetMethods())
        {
            if (method.GetCustomAttribute<StepAttribute>() is StepAttribute stepAttribute)
            {
                var parameterTypes = method.GetParameters().Select(p => p.ParameterType).ToArray();
                var returnType = method.ReturnType;
                var step = Step.CreateFromMethod(method.CreateDelegate(Expression.GetFuncType([.. parameterTypes, returnType]), instance), stepAttribute.Name, stepAttribute.Description);
                steps.Add(step.Name, step);
            }
            else if (method.GetCustomAttribute<StepWiseUITextInputAttribute>() is StepWiseUITextInputAttribute textInputAttribute)
            {
                var parameterTypes = method.GetParameters().Select(p => p.ParameterType).ToArray();
                var returnType = method.ReturnType;
                var step = Step.CreateFromStepWiseUITextInput(method.CreateDelegate(Expression.GetFuncType([.. parameterTypes, returnType]), instance), method.Name, textInputAttribute.Description);
                steps.Add(step.Name, step);
            }
            else if (method.GetCustomAttribute<StepWiseUINumberInputAttribute>() is StepWiseUINumberInputAttribute numberInputAttribute)
            {
                var parameterTypes = method.GetParameters().Select(p => p.ParameterType).ToArray();
                var returnType = method.ReturnType;
                var step = Step.CreateFromStepWiseUINumberInput(method.CreateDelegate(Expression.GetFuncType([.. parameterTypes, returnType]), instance), method.Name, numberInputAttribute.Description);
                steps.Add(step.Name, step);
            }
            else if (method.GetCustomAttribute<StepWiseUISwitchInputAttribute>() is StepWiseUISwitchInputAttribute switchInputAttribute)
            {
                var parameterTypes = method.GetParameters().Select(p => p.ParameterType).ToArray();
                var returnType = method.ReturnType;
                var step = Step.CreateFromStepWiseUISwitchInput(method.CreateDelegate(Expression.GetFuncType([.. parameterTypes, returnType]), instance), method.Name, switchInputAttribute.Description);
                steps.Add(step.Name, step);
            }
            else if (method.GetCustomAttribute<StepWiseUIImageInputAttribute>() is StepWiseUIImageInputAttribute imageInputAttribute)
            {
                var parameterTypes = method.GetParameters().Select(p => p.ParameterType).ToArray();
                var returnType = method.ReturnType;
                var step = Step.CreateFromStepWiseUIImageInput(method.CreateDelegate(Expression.GetFuncType([.. parameterTypes, returnType]), instance), method.Name, imageInputAttribute.Description);
                steps.Add(step.Name, step);
            }
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
    public IEnumerable<Step> GetAllDependSteps(Step step)
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

        return dependSteps.Where(s => s != step);
    }

    public List<Step> ResolveDependencies(string targetStepName)
    {
        var executionPlan = new List<Step>();
        var visited = new HashSet<string>();
        var visiting = new HashSet<string>();

        void DFS(Step step)
        {
            if (visited.Contains(step.Name))
            {
                return;
            }

            if (visiting.Contains(step.Name))
            {
                throw new Exception($"Circular dependency detected in step '{step.Name}'.");
            }

            visiting.Add(step.Name);

            foreach (var dependency in step.Dependencies)
            {
                var dependencyStep = this.Steps[dependency] ?? throw new Exception($"Dependency '{dependency}' not found in the workflow.");
                DFS(dependencyStep);
            }

            visiting.Remove(step.Name);
            visited.Add(step.Name);
            executionPlan.Add(step);
        }

        var targetStep = this.Steps[targetStepName] ?? throw new Exception($"Step '{targetStepName}' not found in the workflow.");

        DFS(targetStep);

        return executionPlan;
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
