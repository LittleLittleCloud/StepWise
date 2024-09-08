using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;
using Microsoft.Extensions.Logging;

namespace StepWise.Core;

public class WorkflowEngine : IWorkflowEngine
{
    private readonly Workflow _workflow;
    private readonly ILogger? _logger = null;
    private readonly int _maxConcurrency = 1;
    private BlockingCollection<(Step, int)> _stepsTaskQueue = new BlockingCollection<(Step, int)>();
    private int _busyTaskRunners = 0;
    private ConcurrentDictionary<string, (object, int)> _context = new ConcurrentDictionary<string, (object, int)>();
    private BlockingCollection<(string, object)> _stepResultQueue = new BlockingCollection<(string, object)>();

    public WorkflowEngine(Workflow workflow, int maxConcurrency = 1, ILogger? logger = null)
    {
        _workflow = workflow;
        _logger = logger;
        _maxConcurrency = maxConcurrency;
    }

    public async Task<TResult> ExecuteStepAsync<TResult>(string stepName, Dictionary<string, object>? inputs = null)
    {
        var context = new Dictionary<string, object>();
        await foreach (var (name, result) in ExecuteStepAsync(stepName, inputs))
        {
            context[name] = result;
        }

        if (context.TryGetValue(stepName, out var finalResult) && finalResult is TResult)
        {
            return (TResult)finalResult;
        }

        throw new Exception($"Step '{stepName}' did not return the expected result type.");
    }

    public IAsyncEnumerable<(string, object)> ExecuteStepAsync(string targetStep, Dictionary<string, object>? inputs = null)
    {
        inputs ??= new Dictionary<string, object>();
        var step = _workflow.Steps[targetStep] ?? throw new Exception($"Step '{targetStep}' not found in the workflow.");

        return ExecuteStepAsync(step, inputs);
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

    private async IAsyncEnumerable<(string, object)> ExecuteStepAsync(
        Step step,
        Dictionary<string, object> inputs,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        _context.Clear();
        _busyTaskRunners = 0;
        _stepsTaskQueue = new BlockingCollection<(Step, int)>();
        _stepResultQueue = new BlockingCollection<(string, object)>();

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
                _logger?.LogInformation($"Adding initial step '{s.Name}' to the task queue.");
                _stepsTaskQueue.Add((s, 0));
            }
        }

        _logger?.LogInformation($"Starting the workflow engine with max concurrency {_maxConcurrency}.");

        // execute steps
        var executeStepTask = Task.WhenAll(Enumerable.Range(0, _maxConcurrency).Select(i => ExecuteSingleStepAsync(i, step, ct)));

        foreach (var (name, result) in _stepResultQueue.GetConsumingEnumerable(ct))
        {
            yield return (name, result);
        }


        _logger?.LogInformation($"Workflow engine has completed.");
        _stepsTaskQueue.CompleteAdding();
        await executeStepTask;
    }

    private async Task ExecuteSingleStepAsync(
        int runnerId,
        Step finalStep,
        CancellationToken ct = default)
    {
        foreach (var (step, generation) in _stepsTaskQueue.GetConsumingEnumerable(ct))
        {
            Interlocked.Increment(ref _busyTaskRunners);
            // exit if early stop
            if (_stepResultQueue.IsAddingCompleted || _stepsTaskQueue.IsAddingCompleted)
            {
                Interlocked.Decrement(ref _busyTaskRunners);
                return;
            }

            // scenario 1
            // if the step has already been executed, or there is a newer version of the step in the task queue
            // skip the step
            if (_context.TryGetValue(step.Name, out var value) && value.Item2 > generation)
            {
                _logger?.LogInformation($"[Runner {runnerId}]: Step '{step.Name}' with generation `{generation}` has already been executed.");

                Interlocked.Decrement(ref _busyTaskRunners);
                continue;
            }

            //if (_stepsTaskQueue.Any(x => x.Item1.Name == step.Name && x.Item2 > generation))
            //{
            //    _logger?.LogInformation($"[Runner {runnerId}]: Step '{step.Name}' with generation `{generation}` has a newer version in the task queue.");

            //    continue;
            //}

            // scenario 2
            // run the step by calling the step.ExecuteAsync method
            // the step.ExecuteAsync will short-circuit if the dependencies are not met
            _logger?.LogInformation($"[Runner {runnerId}]: Running step '{step.Name}' with generation `{generation}`.");
            var res = await step.ExecuteAsync(_context.ToDictionary(x => x.Key, x => x.Value.Item1), ct);

            // if res is null, it means the step is not ready to run, or not producing any result
            // maybe the dependencies are not met, maybe the executor function returns null.
            if (res == null)
            {
                _logger?.LogInformation($"[Runner {runnerId}]: Step '{step.Name}' with generation `{generation}` returns null. Skipping.");
            }
            else
            {
                _logger?.LogInformation($"[Runner {runnerId}]: Step '{step.Name}' with generation `{generation}` has been executed.");
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

                _logger?.LogInformation($"[Runner {runnerId}]: updating context with the result of step '{step.Name}' with generation `{contextGeneration}`.");
                _logger?.LogInformation($"[Runner {runnerId}]: result of step '{step.Name}' is '{res}'.");
                _context[step.Name] = (res, contextGeneration);
                _stepResultQueue.Add((step.Name, res));

                // update task queue with the next steps
                // find all steps that directly depend on the current step
                var nextSteps = _workflow.Steps.Values.Where(x => x.Dependencies.Contains(step.Name));

                foreach (var nextStep in nextSteps)
                {
                    _logger?.LogInformation($"[Runner {runnerId}]: Adding step '{nextStep.Name}' with generation `{contextGeneration}` to the task queue.");
                    _stepsTaskQueue.Add((nextStep, contextGeneration));
                }
            }

            Interlocked.Decrement(ref _busyTaskRunners);

            // if the final step result is already in the context, stop the execution
            if (_context.ContainsKey(finalStep.Name) && _busyTaskRunners == 0)
            {
                _logger?.LogInformation($"[Runner {runnerId}]: The final step '{finalStep.Name}' has been executed. Early stopping.");
                _stepsTaskQueue.CompleteAdding();
                _stepResultQueue.CompleteAdding();

                return;
            }

            // if the task queue is empty and busy task runners are 0, stop the execution
            if (_stepsTaskQueue.Count == 0 && _busyTaskRunners == 0)
            {
                _logger?.LogInformation($"[Runner {runnerId}]: The task queue is empty and there is only no busy task runner. Setting the task queue as complete.");
                _stepsTaskQueue.CompleteAdding();
                _stepResultQueue.CompleteAdding();

                return;
            }
        }
    }

}
