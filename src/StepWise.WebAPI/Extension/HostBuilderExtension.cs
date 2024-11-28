// Copyright (c) LittleLittleCloud. All rights reserved.
// HostBuilderExtension.cs

using System.Reflection;
using Auth0.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using Serilog;

namespace StepWise.WebAPI;

public static class HostBuilderExtension
{
    public static IHostBuilder UseStepWiseServer(
        this IHostBuilder hostBuilder,
        StepWiseServiceConfiguration? configuration = null)
    {
        configuration ??= new StepWiseServiceConfiguration();
        var dateTimeNow = DateTime.Now;
        var clientLogPath = Path.Combine(configuration.Workspace.FullName, StepWiseServiceConfiguration.LogFolderName, $"clients-{dateTimeNow:yyyy-MM-dd_HH-mm-ss}.log");
        var debugLogTemplate = "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] ({SourceContext}) {Message:lj}{NewLine}{Exception}";

        hostBuilder.ConfigureLogging(loggingBuilder =>
        {
            loggingBuilder.ClearProviders();

            var serilogLogger = new LoggerConfiguration()
                .Enrich.FromLogContext()
                .WriteTo.File(clientLogPath, outputTemplate: debugLogTemplate)
#if DEBUG
                .WriteTo.Console(outputTemplate: debugLogTemplate)
#else
                .WriteTo.Conditional((le) => le.Level >= Serilog.Events.LogEventLevel.Information, lc => lc.Console(outputTemplate: "{Message:lj}{NewLine}{Exception}"))
#endif
                .CreateLogger();

            loggingBuilder.AddSerilog(serilogLogger);
        });

        // ...
        hostBuilder.ConfigureServices(services =>
        {
            services.AddSingleton<StepWiseClient>();
            services.AddSingleton(configuration);
        });

        return hostBuilder.ConfigureWebHost(webBuilder =>
        {
            // fix https://github.com/LittleLittleCloud/StepWise/issues/28

            var assemblyLocation = Assembly.GetExecutingAssembly().Location;
            var assemblyDirectory = Path.GetDirectoryName(assemblyLocation) ?? Environment.CurrentDirectory;
            var webRoot = Path.Combine(assemblyDirectory, "wwwroot");
            webBuilder.UseWebRoot(webRoot);

            webBuilder.ConfigureServices((ctx, services) =>
            {
                var configuration = ctx.Configuration;
                services
                .AddControllers()
                .AddMvcOptions(options =>
                {
                    options.EnableEndpointRouting = false;
                })
                .ConfigureApplicationPartManager(manager =>
                {
                    manager.FeatureProviders.Add(new StepWiseControllerV1Provider());
                });

                services.AddAuth0WebAppAuthentication(options =>
                {
                    options.Domain = ctx.Configuration["Auth0:Domain"] ?? string.Empty;
                    options.ClientId = ctx.Configuration["Auth0:ClientId"] ?? string.Empty;

                    // add email to scope
                    options.Scope = "openid profile email";
                });

                services.AddSwaggerGen(c =>
                {
                    c.SwaggerDoc("v1", new OpenApiInfo { Title = "StepWise Controller", Version = "v1" });
                });
            });

            webBuilder.Configure((ctx, app) =>
            {
                var env = ctx.HostingEnvironment;
                if (env.IsDevelopment())
                {
                    app.UseSwagger();
                    app.UseSwaggerUI(c =>
                    {
                        c.SwaggerEndpoint("/swagger/v1/swagger.json", "StepWise Controller V1");
                    });
                    app.UseDeveloperExceptionPage();
                }

                // enable cors from the same origin
                app.UseCors(builder =>
                {
                    builder.SetIsOriginAllowed(origin => origin.Contains("localhost"))
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
                app.UseAuthentication();
                app.UseAuthorization();
                app.UseMvc();
                app.UseHttpsRedirection();
                app.UseDefaultFiles();
                app.UseStaticFiles();

            });
        });
    }
}
