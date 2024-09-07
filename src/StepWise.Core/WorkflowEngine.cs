using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;
using Microsoft.Extensions.Logging;

namespace StepWise.Core;

public class WorkflowEngine
{
    private readonly Workflow _workflow;
    private readonly ILogger? _logger = null;
    private readonly int _maxConcurrency = 1;
    private readonly BlockingCollection<(Step, int)> _stepsTaskQueue = new BlockingCollection<(Step, int)>();
    private int _busyTaskRunners = 0;
    private readonly ConcurrentDictionary<string, (object, int)> _context = new ConcurrentDictionary<string, (object, int)>();

    public WorkflowEngine(Workflow workflow, int maxConcurrency = 1, ILogger? logger = null)
    {
        _workflow = workflow;
        _logger = logger;
        _maxConcurrency = maxConcurrency;
    }

    public async Task<TResult> ExecuteStepAsync<TResult>(string stepName, Dictionary<string, object>? inputs = null)
    {
        inputs ??= new Dictionary<string, object>();
        var step = _workflow.Steps[stepName] ?? throw new Exception($"Step '{stepName}' not found in the workflow.");

        var result = await ExecuteStepAsync(step, inputs);

        if (result is TResult finalResult)
        {
            return finalResult;
        }

        throw new Exception($"Step '{stepName}' did not return the expected result type.");
    }

    // retrieve all the steps that need to be executed in order to reach the target step
    private List<Step> ResolveDependencies(string targetStepName)
    {
        var executionPlan = new List<Step>();
        var visited = new HashSet<string>();
        var visiting = new HashSet<string>();

        void DFS(Step step)
        {
            if (visited.Contains(step.Name) || visiting.Contains(step.Name))
                return;

            visiting.Add(step.Name);

            foreach (var dependency in step.Dependencies)
            {
                var dependencyStep = _workflow.Steps[dependency] ?? throw new Exception($"Dependency '{dependency}' not found in the workflow.");
                DFS(dependencyStep);
            }

            visiting.Remove(step.Name);
            visited.Add(step.Name);
            executionPlan.Add(step);
        }

        var targetStep = _workflow.Steps[targetStepName] ?? throw new Exception($"Step '{targetStepName}' not found in the workflow.");

        DFS(targetStep);

        return executionPlan;
    }

    private async Task<object> ExecuteStepAsync(Step step, Dictionary<string, object> inputs, CancellationToken ct = default)
    {
        _context.Clear();
        _busyTaskRunners = 0;

        // add inputs to context
        foreach (var input in inputs)
        {
            _context[input.Key] = (input.Value, 0);
        }

        // produce initial steps
        var steps = this.ResolveDependencies(step.Name);
        foreach (var s in steps)
        {
            if (s.IsExecuctionConditionSatisfied(_context.ToDictionary(x => x.Key, x => x.Value.Item1)))
            {
                _stepsTaskQueue.Add((s, 0));
            }
        }

        // execute steps
        await Task.WhenAll(Enumerable.Range(0, _maxConcurrency).Select(_ => ExecuteSingleStepAsync(step, ct)));

        _stepsTaskQueue.CompleteAdding();

        if (_context.TryGetValue(step.Name, out var value))
        {
            return value.Item1;
        }

        throw new Exception($"Step '{step.Name}' did not return the expected result.");
    }

    private async Task ExecuteSingleStepAsync(Step finalStep, CancellationToken ct = default)
    {
        foreach (var (step, generation) in _stepsTaskQueue.GetConsumingEnumerable(ct))
        {
            Interlocked.Increment(ref _busyTaskRunners);

            // scenario 1
            // if the step has already been executed, or there is a newer version of the step in the task queue
            // skip the step
            if (_context.TryGetValue(step.Name, out var value) && value.Item2 >= generation)
            {
                _logger?.LogDebug($"Step '{step.Name}' with generation `{generation}` has already been executed.");
                continue;
            }

            if (_stepsTaskQueue.Any(x => x.Item1.Name == step.Name && x.Item2 > generation))
            {
                _logger?.LogDebug($"Step '{step.Name}' with generation `{generation}` has a newer version in the task queue.");
                continue;
            }

            // scenario 2
            // run the step by calling the step.ExecuteAsync method
            // the step.ExecuteAsync will short-circuit if the dependencies are not met
            var res = await step.ExecuteAsync(_context.ToDictionary(x => x.Key, x => x.Value.Item1), ct);

            // if res is null, it means the step is not ready to run, or not producing any result
            // maybe the dependencies are not met, maybe the executor function returns null.
            if (res == null)
            {
                _logger?.LogInformation($"Step '{step.Name}' with generation `{generation}` is not ready to run.");
            }
            else
            {
                // update the context with the result
                // the generation will be {parameter_max_generation} + 1
                var contextGeneration = step.Dependencies switch
                {
                    { Capacity: > 0 } => step.Dependencies.Select(x =>
                    {
                        if (_context.TryGetValue(x, out var value))
                        {
                            return value.Item2;
                        }

                        return 0;
                    }).Max() + 1,
                    _ => 0,
                };

                _context[step.Name] = (res, contextGeneration);

                // update task queue with the next steps
                // find all steps that directly depend on the current step
                var nextSteps = _workflow.Steps.Values.Where(x => x.Dependencies.Contains(step.Name));

                foreach (var nextStep in nextSteps)
                {
                    _stepsTaskQueue.Add((nextStep, contextGeneration));
                }
            }

            // if the final step result is already in the context, stop the execution
            if (_context.ContainsKey(finalStep.Name))
            {
                _stepsTaskQueue.CompleteAdding();
                return;
            }

            // if the task queue is empty and busy task runners are 1, stop the execution
            if (_stepsTaskQueue.Count == 0 && _busyTaskRunners == 1)
            {
                _stepsTaskQueue.CompleteAdding();
                return;
            }
            else
            {
                Interlocked.Decrement(ref _busyTaskRunners);
            }
        }
    }
}
