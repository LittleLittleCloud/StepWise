The following example shows how to create a stepwise workflow in C#. Overall, you put the `Step` attribute on the method you want to define as a step. You can also use the `DependOn` attribute to define the dependencies between steps. The `FromStep` attribute is used to pass the output of one step to another step.

### Step 1: Create a console application and install the StepWise package

```bash
dotnet new console -n StepWiseExample
cd StepWiseExample
dotnet add package LittleLittleCloud.StepWise
```

### Step 2: Define a stepwise workflow in Program.cs

```csharp
// file: Program.cs
public class PrepareDinner
{
    [Step]
    public async Task<string> ChopVegetables()
    {
        var vegetables = new[] { "onion", "tomato", "bell pepper" };
        await Task.Delay(3000);

        return $"Chopped {string.Join(", ", vegetables)} in 3 seconds";
    }

    [Step]
    public async Task<string> BoilWater()
    {
        await Task.Delay(2000);

        return "Boiled water in 2 seconds";
    }

    [Step]
    public async Task<string> CookPasta()
    {
        await Task.Delay(5000);

        return "Cooked pasta in 5 seconds";
    }

    [Step]
    public async Task<string> CookSauce()
    {
        await Task.Delay(4000);

        return "Cooked sauce in 4 seconds";
    }

    [Step]
    [DependOn(nameof(ChopVegetables))]
    [DependOn(nameof(BoilWater))]
    [DependOn(nameof(CookPasta))]
    [DependOn(nameof(CookSauce))]
    public async Task<string> ServeDinner(
        [FromStep(nameof(ChopVegetables))] string vegetables,
        [FromStep(nameof(BoilWater))] string water,
        [FromStep(nameof(CookPasta))] string pasta,
        [FromStep(nameof(CookSauce))] string sauce)
    {
        return $"Dinner ready! {string.Join(", ", vegetables)}, {water}, {pasta}, {sauce}";
    }
}
```

In the code above, a `PrepareDinner` class is defined with five methods, each representing a step in the workflow. The `ServeDinner` method depends on all the previous steps. When executed, the workflow will automatically resolve the dependencies between steps and execute them in parallel if maximum parallelism is larger than 1.

### Step 3: Execute the workflow
You can execute the workflow step-by-step using `StepWiseEngine.ExecuteAsync` method. It will execute the steps in the order of their dependencies and return the result of each step.

```csharp
var prepareDinner = new PrepareDinner();
var engine = StepWiseEngine.CreateFromInstance(prepareDinner, maxConcurrency: 5);

await foreach (var result in engine.ExecuteAsync(nameof(PrepareDinner.ServeDinner)))
{
    Console.WriteLine(result);
}
```

When you run the application, you will see the following output:

```bash
ChopVegetables[0]()[status: Queue]
BoilWater[0]()[status: Queue]
CookPasta[0]()[status: Queue]
CookSauce[0]()[status: Queue]
CookSauce[0]()[status: Running]
BoilWater[0]()[status: Running]
CookPasta[0]()[status: Running]
ChopVegetables[0]()[status: Running]
BoilWater[0]()[status: Completed]
ChopVegetables[0]()[status: Completed]
CookSauce[0]()[status: Completed]
CookPasta[0]()[status: Completed]
ServeDinner[1](BoilWater[0], CookPasta[0], CookSauce[0], ChopVegetables[0])[status: Queue]
ServeDinner[1](BoilWater[0], CookPasta[0], CookSauce[0], ChopVegetables[0])[status: Running]
ServeDinner[1](BoilWater[0], CookPasta[0], CookSauce[0], ChopVegetables[0])[status: Completed]
```

As you can see, the steps are executed in the order of their dependencies. Because the workflow engine has a maximum parallelism of 5, the steps are executed in parallel when possible.