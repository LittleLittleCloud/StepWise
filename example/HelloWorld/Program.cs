// Copyright (c) LittleLittleCloud. All rights reserved.
// Program.cs

// Create a web host running on 5123 port
using System.IdentityModel.Tokens.Jwt;
using System.Reflection;
using System.Security.Claims;
using Gallery;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Logging;
using Microsoft.IdentityModel.Tokens;
using StepWise.Core;
using StepWise.Core.Extension;
using StepWise.Gallery;
using StepWise.WebAPI;


var host = Host.CreateDefaultBuilder()
    .UseEnvironment(Environments.Development)
    .UseStepWiseServer()
    .ConfigureWebHostDefaults(webBuilder =>
    {
        webBuilder.UseUrls("http://localhost:51234");
    })
    .Build();

await host.StartAsync();

var stepWiseClient = host.Services.GetRequiredService<StepWiseClient>();

var userInputWorkflow = Workflow.CreateFromInstance(new UserInput());
var loopWorkflow = Workflow.CreateFromInstance(new Loop());
var cumulativeWorkflow = Workflow.CreateFromInstance(new Cumulative());
var basicSteps = new BasicSteps();
var releaseMaster = new ReleaseMaster();
var ocrWorkflow = new OCR();
var sequential = new Sequential();
var ifElse = new IfElseBranching();
var parallel = new ParallelWorkflow();
var textToImage = new TextToImage();
var getWeather = new GetWeatherWorkflow();

stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(sequential));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(ifElse));
stepWiseClient.AddWorkflow(loopWorkflow);
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(parallel));
stepWiseClient.AddWorkflow(userInputWorkflow);
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(getWeather));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(new PrepareDinner()));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(releaseMaster));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(ocrWorkflow));
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(textToImage));

// Wait for the host to shutdown
await host.WaitForShutdownAsync();




