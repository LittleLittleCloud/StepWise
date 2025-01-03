// Copyright (c) LittleLittleCloud. All rights reserved.
// Program.cs

using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StepWise.Gallery.Agentic;
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

stepWiseClient.AddWorkflowFromInstance(new README());
stepWiseClient.AddWorkflowFromInstance(new GetWeatherWorkflow());
stepWiseClient.AddWorkflowFromInstance(new CoT());
stepWiseClient.AddWorkflowFromInstance(new DocumentWriter());
stepWiseClient.AddWorkflowFromInstance(new ProfanityDetector());

await host.WaitForShutdownAsync();
