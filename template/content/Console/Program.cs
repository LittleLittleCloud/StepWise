using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StepWise.Core;
using StepWise.WebAPI;

var host = Host.CreateDefaultBuilder()
    .ConfigureWebHostDefaults(webBuilder =>
    {
        webBuilder.UseUrls("http://localhost:5123");
    })
    .UseStepWiseServer()
    .Build();

await host.StartAsync();

var stepWiseClient = host.Services.GetRequiredService<StepWiseClient>();

var helloWorld = new HelloWorld();
var workflow = Workflow.CreateFromInstance(helloWorld);
stepWiseClient.AddWorkflow(workflow);

await host.WaitForShutdownAsync();

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