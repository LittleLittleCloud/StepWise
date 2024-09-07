# StepWise

StepWise is a powerful and flexible C# library for defining and executing workflows. It allows you to break down complex processes into manageable steps, define dependencies between them, and execute them in the correct order.

## Features

- Define workflows as a series of steps
- Automatic dependency resolution between steps
- Attribute-based workflow definition for clean and readable code
- Programmatic workflow building for dynamic scenarios
- Flexible input and output handling for each step
- Built-in error handling and custom exceptions

## Primitives

StepWise is built around two main primitives:

### 1. Step

A Step is the smallest unit of work in StepWise. It represents a single task or operation within a workflow.

- **Definition**: A Step is essentially a C# method decorated with the `[Step]` attribute.
- **Properties**:
  - Name: A unique identifier for the step.
  - Input Parameters: The data required by the step to perform its task.
  - Output: The result produced by the step (if any).
  - Dependencies: Other steps that must be executed before this step.
- **Usage**: 
  ```csharp
  [Step(Name = "GetData")]
  public Data GetData(int id)
  {
      // Implementation
  }
  ```

### 2. Workflow

A Workflow is a collection of Steps that together accomplish a larger task.

- **Definition**: A Workflow is typically represented by a class containing multiple Step methods.
- **Properties**:
  - Name: A identifier for the workflow.
  - Steps: The collection of Steps that make up the workflow.
- **Usage**: 
  ```csharp
  public class DataProcessingWorkflow
  {
      [Step(Name = "GetData")]
      public Data GetData(int id) { /* ... */ }

      [Step(Name = "ProcessData")]
      public Result ProcessData([From(SourceStep = "GetData")] Data data) { /* ... */ }

      [Step(Name = "SaveResult")]
      public void SaveResult([From(SourceStep = "ProcessData")] Result result) { /* ... */ }
  }
  ```

### Dependency Management

StepWise automatically manages dependencies between Steps:

- Use the `[From]` attribute to specify that a Step requires output from another Step.
- The WorkflowEngine resolves these dependencies and ensures Steps are executed in the correct order.

Example:
```csharp
[Step(Name = "CombineData")]
public CombinedData CombineData([From(SourceStep = "GetDataA")] DataA dataA, 
                                [From(SourceStep = "GetDataB")] DataB dataB)
{
    // Implementation
}
```

These primitives form the foundation of StepWise, allowing you to create complex workflows while maintaining clarity and modularity in your code.

### Parallel Execution

StepWise wisely supports parallel execution of steps that do not have dependencies on each other. This can significantly improve the performance of your workflows by executing independent steps concurrently.

## Quick Start

Here's a simple example of how to define and execute a workflow using StepWise:

```csharp
using StepWise;

public class SimpleWorkflow
{
    [Step(Name = "GetNumber")]
    public int GetNumber()
    {
        return 42;
    }

    [Step(Name = "DoubleNumber")]
    public int DoubleNumber([From(SourceStep = "GetNumber")] int number)
    {
        return number * 2;
    }

    [Step(Name = "PrintResult")]
    public void PrintResult([From(SourceStep = "DoubleNumber")] int result)
    {
        Console.WriteLine($"The result is: {result}");
    }
}

// Usage
var workflow = typeof(SimpleWorkflow).BuildWorkflowFromType();
var engine = new WorkflowEngine();
engine.ExecuteWorkflow(workflow, "PrintResult");
```

## Defining Steps

Steps are defined as methods within a class, decorated with the `[Step]` attribute:

```csharp
[Step(Name = "StepName")]
public ReturnType StepMethod(ParameterType param)
{
    // Step implementation
}
```

## Defining Dependencies

Dependencies between steps are defined using the `[From]` attribute on step parameters:

```csharp
[Step(Name = "DependentStep")]
public void DependentStep([From(SourceStep = "PreviousStep")] int input)
{
    // Step implementation using the output from PreviousStep
}
```

## Executing Workflows

Workflows can be executed using the `WorkflowEngine`:

```csharp
var workflow = typeof(YourWorkflowClass).BuildWorkflowFromType();
var engine = new WorkflowEngine();
var result = engine.ExecuteWorkflow(workflow, "FinalStepName");
```

## Advanced Usage

For more complex scenarios, you can use the `WorkflowBuilder` to programmatically construct workflows:

```csharp
var builder = new WorkflowBuilder();
builder.AddStep("Step1", () => 42)
       .AddStep("Step2", (int x) => x * 2)
       .AddStep("Step3", (int x) => Console.WriteLine(x));

var workflow = builder.Build();
var engine = new WorkflowEngine();
engine.ExecuteWorkflow(workflow, "Step3");
```

## Contributing

We welcome contributions to StepWise! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

StepWise is released under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub issue tracker.