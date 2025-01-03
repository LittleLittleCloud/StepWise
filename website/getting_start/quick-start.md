You can easily create a new StepWise project using the StepWise template. The template provides a basic project structure with a sample workflow to help you get started quickly.

## Install StepWise Template
```bash
dotnet new -i LittleLittleCloud.StepWise.Template
```

After installing the template, you can create a new StepWise project using the following command from dotnet-cli:

```bash
dotnet new stepwise-console -n MyFirstStepWiseProject
```

This will create a new StepWise console app project with the following structure:

```
MyFirstStepWiseProject/
├── MyFirstStepWiseProject.csproj
├── Program.cs
```

Where `Program.cs` contains the basic configuration for StepWise server and a sample workflow. You can run the project using the following command:

```bash
cd MyFirstStepWiseProject
dotnet run
```

The StepWise server will be hosted on `http://localhost:5123`. You can visit the URL to see the StepWise UI and execute the sample workflow.

## Breakdown of the Template Project

In the template project, `Program.cs` is to configure the StepWise server and add a `HelloWorld` workflow to the server.

To configure the StepWise server, `Program.cs` first registers a `StepWiseService` and its relevant dependencies in the `Host` builder via `UseStepWiseServer` extension method.

```csharp
var host = Host.CreateDefaultBuilder()
    .ConfigureWebHostDefaults(webBuilder =>
    {
        webBuilder.UseUrls("http://localhost:5123");
    })
    .UseStepWiseServer()
    .Build();

await host.StartAsync();
```

The template projects also contain a sample `HelloWorld` workflow. The `HelloWorld` workflow contains two steps: `Name` and `Greeting`. The `Name` step is a text input step that prompts the user to enter their name. The `Greeting` step takes the name from the `Name` step and returns a greeting message.

```csharp
public class HelloWorld
{
    [StepWiseUITextInput(description: "Enter your name")]
    public Task<string?> Name()
    {
        return Task.FromResult<string?>(null);
    }

    [Step]
    [DependOn(nameof(Name))]
    public async Task<string> Greeting(
        [FromStep(nameof(Name))] string name)
    {
        return $"Hello world, {name}!";
    }
}
```

After the workflow is defined, this workflow is added to the StepWise server using the `StepWiseClient` instance so it can be executed in the StepWise UI.

```csharp
var stepWiseClient = host.Services.GetRequiredService<StepWiseClient>();

var helloWorld = new HelloWorld();
var workflow = Workflow.CreateFromInstance(helloWorld);
stepWiseClient.AddWorkflow(workflow);
```

## Next Steps
- [Create Workflow](./define-workflow.md): Learn more about how to define a workflow in StepWise.