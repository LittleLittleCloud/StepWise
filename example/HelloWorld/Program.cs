// Copyright (c) LittleLittleCloud. All rights reserved.
// Program.cs

// Create a web host running on 5123 port
using Gallery;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StepWise.Core;
using StepWise.WebAPI;

var host = Host.CreateDefaultBuilder()
    //.UseEnvironment("Development")
    .ConfigureWebHostDefaults(webBuilder =>
    {
        webBuilder.UseUrls("http://localhost:5123");
    })
    .UseStepWiseServer()
    .Build();

await host.StartAsync();

var stepWiseClient = host.Services.GetRequiredService<StepWiseClient>();

var helloWorldWorkflow = Workflow.CreateFromInstance(new HelloWorld());
var loopWorkflow = Workflow.CreateFromInstance(new Loop());
var cumulativeWorkflow = Workflow.CreateFromInstance(new Cumulative());
var basicSteps = new BasicSteps();
var releaseMaster = new ReleaseMaster();
var codeInterpreter = CodeInterpreter.Create();

stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(releaseMaster));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(codeInterpreter));
stepWiseClient.AddWorkflow(helloWorldWorkflow);
stepWiseClient.AddWorkflow(cumulativeWorkflow);
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(new PrepareDinner()));
// Wait for the host to shutdown
await host.WaitForShutdownAsync();

