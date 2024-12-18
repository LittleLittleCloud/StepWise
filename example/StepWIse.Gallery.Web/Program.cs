// Copyright (c) LittleLittleCloud. All rights reserved.
// Program.cs

// Create a web host running on 5123 port
using System.IdentityModel.Tokens.Jwt;
using System.Reflection;
using System.Security.Claims;
using Gallery;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Logging;
using Microsoft.IdentityModel.Tokens;
using StepWise.Core;
using StepWise.Core.Extension;
using StepWise.Gallery;
using StepWise.WebAPI;

var stepwiseConfig = new StepWiseServiceConfiguration
{
    EnableAuth0Authentication = true,
    Auth0Domain = "dev-7obvli7fq57vx30r.us.auth0.com",
    Auth0ClientId = "ok4Im5Rt4blubBzvDRbM4SUixpmEGi8F",
    Auth0Audience = "https://stepwisegallery20241128154731.azurewebsites.net/",
};
var assemblyLocation = Assembly.GetExecutingAssembly().Location;
var assemblyDirectory = Path.GetDirectoryName(assemblyLocation) ?? Environment.CurrentDirectory;
var webRoot = Path.Combine(assemblyDirectory, "wwwroot");
var option = new WebApplicationOptions
{
    WebRootPath = webRoot,
    EnvironmentName = "Development",
    Args = args,
    ApplicationName = "StepWise",
};
var builder = WebApplication.CreateBuilder(option);

builder.WebHost.UseStepWiseServer(stepwiseConfig);
builder.WebHost.UseWebRoot(webRoot);
builder.UseStepWiseServer(configuration: stepwiseConfig);
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.Authority = $"https://{stepwiseConfig.Auth0Domain}";
    options.Audience = stepwiseConfig.Auth0Audience;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        NameClaimType = ClaimTypes.NameIdentifier,
        RoleClaimType = "role",
    };
});
builder.Services.AddAuthorization();

var app = builder.Build();

// enable cors from the same origin
app.UseCors(builder =>
{
    builder.SetIsOriginAllowed(origin => origin.Contains("localhost"))
        .AllowAnyHeader()
        .AllowAnyMethod();
});

app.UseAuthentication();
app.UseAuthorization();
#pragma warning disable MVC1005 // Cannot use UseMvc with Endpoint Routing
app.UseMvc();
#pragma warning restore MVC1005 // Cannot use UseMvc with Endpoint Routing
app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();

await app.StartAsync();

var stepWiseClient = app.Services.GetRequiredService<StepWiseClient>();

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
var checkScore = new CheckScore();

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
stepWiseClient.AddWorkflow(Workflow.CreateFromInstance(checkScore));

// Wait for the host to shutdown
await app.WaitForShutdownAsync();
