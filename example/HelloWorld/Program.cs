// Copyright (c) LittleLittleCloud. All rights reserved.
// Program.cs

// Create a web host running on 5123 port
using Gallery;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StepWise.Core;
using StepWise.Gallery;
using StepWise.WebAPI;

var stepwiseConfig = new StepWiseServiceConfiguration
{
    EnableAuth0Authentication = false,
};

var host = Host.CreateDefaultBuilder()
    .UseEnvironment("Development")
    .ConfigureWebHostDefaults(webBuilder =>
    {
        webBuilder.UseUrls("http://localhost:5123");
    })
    .UseStepWiseServer(stepwiseConfig)
    .Build();

await host.StartAsync();

var stepWiseClient = host.Services.GetRequiredService<StepWiseClient>();

var userInputWorkflow = Workflow.CreateFromInstance(new UserInput());
var helloWorldWorkflow = Workflow.CreateFromInstance(new HelloWorld());
var loopWorkflow = Workflow.CreateFromInstance(new Loop());
var cumulativeWorkflow = Workflow.CreateFromInstance(new Cumulative());
var basicSteps = new BasicSteps();
var releaseMaster = new ReleaseMaster();
var codeInterpreter = CodeInterpreter.Create();
var ocrWorkflow = new OCR();
var sequential = new Sequential();
var ifElse = new IfElseBranching();
var parallel = new ParallelWorkflow();
var textToImage = new TextToImage();
var imageClassification = new ImageClassification();

stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(sequential));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(ifElse));
stepWiseClient.AddWorkflow(loopWorkflow);
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(parallel));
stepWiseClient.AddWorkflow(userInputWorkflow);

stepWiseClient.AddWorkflow(helloWorldWorkflow);
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(new PrepareDinner()));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(releaseMaster));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(codeInterpreter));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(ocrWorkflow));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(textToImage));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(imageClassification));

// Wait for the host to shutdown
await host.WaitForShutdownAsync();

