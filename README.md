<a name="readme-top"></a>


<div align="center">

<img src="./asset/stepwise-logo.svg" alt="StepWise Logo" width="100">

# StepWise

<div align="center">
 <strong> <h3> A code-first, event-driven workflow framework for .NET </h3> </strong>
</div>
<p align="center">

[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![NuGet Version](https://img.shields.io/nuget/v/LittleLittleCloud.StepWIse?label=NuGet&labelColor=grey&color=green)](https://www.nuget.org/packages/LittleLittleCloud.StepWise)
[![Doc](https://img.shields.io/badge/Doc-Online-blue)](https://littlelittlecloud.github.io/StepWise/)
[![build](https://github.com/LittleLittleCloud/StepWise/actions/workflows/dotnet-build.yml/badge.svg)](https://github.com/LittleLittleCloud/StepWise/actions/workflows/dotnet-build.yml)
</p>

<p align="center">
    <a href="https://www.linkedin.com/groups/14564165">
        <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" />
    </a>
    <a  href="https://twitter.com/stepwise_ai">
        <img src="https://img.shields.io/twitter/follow/StepWise?style=social" height="28" />
    </a>
</p>

<p align="center">
  <a href="https://stepwisegallery20241128154731.azurewebsites.net/">
      <picture >
        <source width="225" media="(prefers-color-scheme: dark)" srcset="./asset/try-live-demo.svg"  >
        <source width="225" media="(prefers-color-scheme: light)" srcset="./asset/try-live-demo.svg"  >
        <img alt="Try Live Demo" src="./asset/try-live-demo.svg" >
      </picture>
  </a>
</p>

</div>

[Demo](https://github.com/user-attachments/assets/cca9d32d-1b59-455e-b19b-535943047ad0)

## What is StepWise?
StepWise is a .NET framework which assists you to code, visualize and execute event-base workflow. It is designed to help you build complex workflows in a simple and efficient way. StepWise comes with the following key features:
- **Code-First**: Define workflows using C# code in your project.
- **WebUI** Visualize and execute workflows from your favorite browser using StepWise WebUI.
- **Event-Driven**: Execute steps in parallel and resolve dependencies automatically.
- **AI-Powered**: Work with `Geeno`, a built-in AI assistant in StepWise WebUI to help you run and analyze workflows with ease.

## Table of Contents
- [Quick Start with Template](#quick-start-with-template)
- [Quick Start](#quick-start)
- [Visualize stepwise workflow](#visualize-stepwise-workflow)
- [Examples](#examples)
- [Dependency Management between Steps](#dependency-management-between-steps)


## Quick Start with Template
StepWise provides a list of templates to help you get started quickly. To install the template, run the following command:

```bash
dotnet new -i LittleLittleCloud.StepWise.Template
```

This will install the following templates:
- stepwise-console: A console application template with StepWise.

To create a new project using the template, run the following command. This will create a new console application project with StepWise WebUI configured.

```bash
dotnet new stepwise-console
```

After creating the project, you can run the project and visit `http://localhost:5123` to see the StepWise WebUI.

## Quick Start

Here's a simple example of how to define a workflow to prepare dinner. The workflow consists of several steps, such as chopping vegetables, boiling water, cooking pasta, and cooking sauce. The final step is to serve dinner, which depends on all the previous steps. When executed, the workflow will automatically resolve the dependencies between steps and execute them in the parallel if possible.

```csharp
public class PrepareDinner
{
    [Step(description: """
        This example demonstrates how to use stepwise to create a simple dinner preparation workflow.
        - source code: [PrepareDinner.cs](https://github.com/LittleLittleCloud/StepWise/blob/main/example/HelloWorld/PrepareDinner.cs)

        It returns the current time when the workflow starts and then simulates the preparation of dinner.
        """)]
    public async Task<DateTime> Start()
    {
        return DateTime.Now;
    }

    [Step(description: "boil water")]
    [DependOn(nameof(Start))]
    public async Task<string> BoilWater()
    {
        await Task.Delay(2000);

        return "Boiled water in 2 seconds";
    }

    [Step(description: "cut vegetables")]
    [DependOn(nameof(Start))]
    public async Task<string> CutVegetables()
    {
        await Task.Delay(3000);

        return "Cut vegetables in 3 seconds";
    }

    [Step(description: "cook vegetables")]
    [DependOn(nameof(CutVegetables))]
    [DependOn(nameof(BoilWater))]
    public async Task<string> CookVegetables(
        [FromStep(nameof(CutVegetables))] string vegetables,
        [FromStep(nameof(BoilWater))] string water)
    {
        await Task.Delay(4000);

        return $"Cooked vegetables in 4 seconds. {vegetables}, {water}";
    }

    [Step(description: "cook meat")]
    [DependOn(nameof(Start))]
    public async Task<string> CookMeat()
    {
        await Task.Delay(5000);

        return "Cooked meat in 5 seconds";
    }

    [Step(description: """
        Serve dinner.
        This will call all the preparation dinner steps in parallel and return the time taken to prepare the dinner.
        """)]
    [DependOn(nameof(CookVegetables))]
    [DependOn(nameof(CookMeat))]
    public async Task<string> ServeDinner(
        [FromStep(nameof(Start))] DateTime start,
        [FromStep(nameof(CookVegetables))] string vegetables,
        [FromStep(nameof(CookMeat))] string meat)
    {
        var time = DateTime.Now - start;
        return $"Dinner ready in {time.TotalSeconds} seconds";
    }
}
```

## Visualize stepwise workflow

StepWise UI is a built-in WebUI for visualizing and executing workflows. To use StepWise UI, simply add the following code to your project:

```csharp
// program.cs
var host = Host.CreateDefaultBuilder()
    //.UseEnvironment("Development")
    .ConfigureWebHostDefaults(webBuilder =>
    {
        webBuilder.UseUrls("http://localhost:5123");
    })
    .UseStepWiseServer()
    .Build();

await host.StartAsync();
```

Then, use `StepWiseClient` to add workflows to StepWise UI:

```csharp
var stepWiseClient = host.Services.GetRequiredService<StepWiseClient>();

// Add the workflow to the StepWise server
stepWiseClient.AddWorkflow(prepareDinner);

// Wait for the host to shutdown
await host.WaitForShutdownAsync();
```

Now, you can visit `http://localhost:5123` to see the StepWise UI and execute the workflow.

## Examples
You can find more examples in the [examples](https://github.com/LittleLittleCloud/StepWise/tree/main/example) directory.

## Dependency Management between Steps
### Step Dependency
In StepWise, you can define dependencies between steps using the `[DependsOn]` attribute. This ensures that a step is executed only after its dependencies have been satisfied.

> [!Note]
> Prevent circular dependencies between steps, otherwise, the workflow engine will remind you with an exception.

### Variable Dependency
Variable dependencies of a step means that the step requires certain variables to be available in the context before it can be executed. If all variable dependencies are met, the step can be executed in parallel with other steps that don't have dependencies on it. In StepWise, variable dependencies are the input parameters of a step.

> [!Note]
> `[FromStep]` attribute doesn't affect the step dependency. It is used to pass the output of one step as input to another step.

StepWise automatically manages dependencies between Steps:
- Use the `[DependsOn]` attribute to specify dependencies between Steps.
- The StepwiseEngine resolves these dependencies and ensures Steps are executed in the correct order.

## Parallel Execution

StepWise supports parallel execution of steps that do not have step dependencies on each other. This can significantly improve the performance of your workflows by executing independent steps concurrently.

## `StepWiseEngine`
`StepWiseEngine` is the core component of StepWise that manages the execution of workflows. It uses a consumer-producer approach to execute steps in the correct order while handling dependencies between steps and parallel execution when possible. You can visit this [documentation](./article/DeepDiveToStepWiseEngine.md) to learn more about how the `StepWiseEngine` works.

## Primitives

StepWise is built around two main primitives:

### 1. Step

A Step is the smallest unit of work in StepWise. It represents a single task or operation within a workflow.

- **Definition**: A Step is essentially a C# method decorated with the `[Step]` attribute.
- **Properties**:
  - Name: A unique identifier for the step.
  - Input Parameters: The data required by the step to perform its task.
  - Output: The result produced by the step (if any). **Must be a Task or Task<\T>**.
  - Dependencies: Other steps that must be executed before this step. This is specified using the `[DependsOn]` attribute.
- **Usage**: 
  ```csharp
  [Step]
  [DependsOn(nameof(OtherStep))]
  [DependsOn(nameof(AnotherStep))]
  public Task<Data> GetData(int id)
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
      public Task<Data> GetData(int id) { /* ... */ }

      [Step(Name = "ProcessData")]
      [DependsOn(nameof(GetData))]
      public Task<Result> ProcessData([FromStep("GetData")] Data data) { /* ... */ }

      [Step(Name = "SaveResult")]
        [DependsOn(nameof(ProcessData))]
      public Task<string> SaveResult([FromStep("ProcessData")] Result result) { /* ... */ }
  }
  ```

## Contributing

We welcome contributions to StepWise! Please see our [Contributing Guide](https://github.com/LittleLittleCloud/StepWise/tree/main/CONTRIBUTING.md) for more details.

## License

StepWise is released under the MIT License. See the [LICENSE](https://github.com/LittleLittleCloud/StepWise/tree/main/LICENSE) file for details.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub issue tracker.
