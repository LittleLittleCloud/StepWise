# StepWise

StepWise is a powerful and flexible C# library for defining and executing workflows. It allows you to break down complex workflows into manageable steps, define dependencies between them, and execute them in the correct order.

## Features

- Define workflows as a series of steps
- Automatic dependency resolution between steps
- Attribute-based workflow definition for clean and readable code
- Programmatic workflow building for dynamic scenarios
- Flexible input and output handling for each step
- Built-in error handling and custom exceptions

## Quick Start

Here's a simple example of how to define a workflow to prepare dinner. The workflow consists of several steps, such as chopping vegetables, boiling water, cooking pasta, and cooking sauce. The final step is to serve dinner, which depends on all the previous steps. When executed, the workflow will automatically resolve the dependencies between steps and execute them in the parallel if possible.

```csharp
using StepWise;

public class PrepareDinner
{
    [Step]
    public async Task<string> ChopVegetables(string[] vegetables)
    {
        await Task.Delay(3000);

        return $"Chopped {string.Join(", ", vegetables)}";
    }

    [Step]
    public async Task<string> BoilWater()
    {
        await Task.Delay(2000);

        return "Boiled water";
    }

    [Step]
    public async Task<string> CookPasta()
    {
        await Task.Delay(5000);

        return "Cooked pasta";
    }

    [Step]
    public async Task<string> CookSauce()
    {
        await Task.Delay(4000);

        return "Cooked sauce";
    }

    [Step]
    [DependOn(nameof(ChopVegetables))]
    [DependOn(nameof(BoilWater))]
    [DependOn(nameof(CookPasta))]
    [DependOn(nameof(CookSauce))]
    public async Task<string> ServeDinner(
        [FromStep(nameof(ChopVegetables))] string[] vegetables,
        [FromStep(nameof(BoilWater))] string water,
        [FromStep(nameof(CookPasta))] string pasta,
        [FromStep(nameof(CookSauce))] string sauce)
    {
        return $"Dinner ready!";
    }
}

// Usage
var prepareDinner = new PrepareDinner();
var workflow = Workflow.CreateFromInstance(prepareDinner);
var engine = new WorkflowEngine(workflow, maxConcurrency: 10);
var stopwatch = System.Diagnostics.Stopwatch.StartNew();
var result = await engine.ExecuteStepAsync<string>(nameof(ServeDinner), new Dictionary<string, object>
{
    [nameof(ChopVegetables)] = new[] { "tomato", "onion", "garlic" },
});
stopwatch.Stop();

// Because the steps are executed in parallel, the total time should be less than the sum of individual step times
stopwatch.ElapsedMilliseconds.Should().BeLessThan(6000);
```

## Examples
You can find more examples in the [examples](./example) directory.


## Primitives

StepWise is built around two main primitives:

### 1. Step

A Step is the smallest unit of work in StepWise. It represents a single task or operation within a workflow.

- **Definition**: A Step is essentially a C# method decorated with the `[Step]` attribute.
- **Properties**:
  - Name: A unique identifier for the step.
  - Input Parameters: The data required by the step to perform its task.
  - Output: The result produced by the step (if any).
  - Dependencies: Other steps that must be executed before this step. This is specified using the `[DependsOn]` attribute.
- **Usage**: 
  ```csharp
  [Step(Name = "GetData")]
  [DependsOn(nameof(OtherStep))]
  [DependsOn(nameof(AnotherStep))]
  public Data GetData(int id)
  {
      // Implementation
  }
  ```

### 2. Workflow

A Workflow is a collection of Steps that together accomplish a larger task.

- **Definition**: A Workflow is typically represented by a class containing multiple Step methods.
- **Usage**: 
  ```csharp
  public class DataProcessingWorkflow
  {
      [Step(Name = "GetData")]
      public Data GetData(int id) { /* ... */ }

      [Step(Name = "ProcessData")]
      [DependsOn(nameof(GetData))]
      public Result ProcessData([FromStep("GetData")] Data data) { /* ... */ }

      [Step(Name = "SaveResult")]
        [DependsOn(nameof(ProcessData))]
      public void SaveResult([FromStep("ProcessData")] Result result) { /* ... */ }
  }
  ```

## Dependency Management

> [!Note]
> `[FromStep]` attribute doesn't affect the dependency between steps. It is used to pass the output of one step as input to another step.

> [!Note]
> Prevent circular dependencies between steps, otherwise, the workflow engine will remind you with an exception.

StepWise automatically manages dependencies between Steps:
- Use the `[DependsOn]` attribute to specify dependencies between Steps.
- The WorkflowEngine resolves these dependencies and ensures Steps are executed in the correct order.

## Parallel Execution

StepWise wisely supports parallel execution of steps that do not have dependencies on each other. This can significantly improve the performance of your workflows by executing independent steps concurrently.


## Contributing

We welcome contributions to StepWise! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

StepWise is released under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub issue tracker.