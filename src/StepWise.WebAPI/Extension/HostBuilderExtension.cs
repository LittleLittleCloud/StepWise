// Copyright (c) LittleLittleCloud. All rights reserved.
// HostBuilderExtension.cs

using System.Reflection;
using System.Reflection.PortableExecutable;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Authorization;
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
                var cfg = ctx.Configuration;
                services
                .AddControllers()
                .AddMvcOptions(options =>
                {
                    options.EnableEndpointRouting = false;
                    if (!configuration.EnableAuth0Authentication)
                    {
                        options.Filters.Add(new AllowAnonymousFilter());
                    }
                })
                .ConfigureApplicationPartManager(manager =>
                {
                    manager.FeatureProviders.Add(new StepWiseControllerV1Provider());
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

    public static THostApplicationBuilder UseStepWiseServer<THostApplicationBuilder>(
        this THostApplicationBuilder hostBuilder,
        StepWiseServiceConfiguration? configuration = null)
        where THostApplicationBuilder : IHostApplicationBuilder
    {
        configuration ??= new StepWiseServiceConfiguration();
        var dateTimeNow = DateTime.Now;
        var clientLogPath = Path.Combine(configuration.Workspace.FullName, StepWiseServiceConfiguration.LogFolderName, $"clients-{dateTimeNow:yyyy-MM-dd_HH-mm-ss}.log");
        var debugLogTemplate = "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] ({SourceContext}) {Message:lj}{NewLine}{Exception}";

        hostBuilder.Logging.Configure(loggingBuilder =>
        {
            var serilogLogger = new LoggerConfiguration()
                .Enrich.FromLogContext()
                .WriteTo.File(clientLogPath, outputTemplate: debugLogTemplate)
#if DEBUG
                .WriteTo.Console(outputTemplate: debugLogTemplate)
#else
                .WriteTo.Conditional((le) => le.Level >= Serilog.Events.LogEventLevel.Information, lc => lc.Console(outputTemplate: "{Message:lj}{NewLine}{Exception}"))
#endif
                .CreateLogger();
        });

        // ...
        hostBuilder.Services.AddSingleton<StepWiseClient>();
        hostBuilder.Services.AddSingleton(configuration);

        return hostBuilder;
    }

    public static IWebHostBuilder UseStepWiseServer(
        this IWebHostBuilder webHostBuilder,
        StepWiseServiceConfiguration? configuration = null)
    {
        configuration ??= new StepWiseServiceConfiguration();
        var dateTimeNow = DateTime.Now;
        var clientLogPath = Path.Combine(configuration.Workspace.FullName, StepWiseServiceConfiguration.LogFolderName, $"clients-{dateTimeNow:yyyy-MM-dd_HH-mm-ss}.log");
        var debugLogTemplate = "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] ({SourceContext}) {Message:lj}{NewLine}{Exception}";

        webHostBuilder.ConfigureLogging(loggingBuilder =>
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
        webHostBuilder.ConfigureServices(services =>
        {
            services.AddSingleton<StepWiseClient>();
            services.AddSingleton(configuration);
        });

        webHostBuilder.ConfigureServices((ctx, services) =>
        {
            services
            .AddControllers()
            .AddMvcOptions(options =>
            {
                options.EnableEndpointRouting = false;
                if (!configuration.EnableAuth0Authentication)
                {
                    options.Filters.Add(new AllowAnonymousFilter());
                }
            })
            .ConfigureApplicationPartManager(manager =>
            {
                manager.FeatureProviders.Add(new StepWiseControllerV1Provider());
            })
            .PartManager.ApplicationParts.Add(new AssemblyPart(typeof(StepWiseControllerV1).Assembly));

            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "StepWise Controller", Version = "v1" });
            });
        });

        //webHostBuilder.Configure((ctx, app) =>
        //{
        //    var env = ctx.HostingEnvironment;
        //    if (env.IsDevelopment())
        //    {
        //        app.UseSwagger();
        //        app.UseSwaggerUI(c =>
        //        {
        //            c.SwaggerEndpoint("/swagger/v1/swagger.json", "StepWise Controller V1");
        //        });
        //        app.UseDeveloperExceptionPage();
        //    }

        //    // enable cors from the same origin
        //    app.UseCors(builder =>
        //    {
        //        builder.SetIsOriginAllowed(origin => origin.Contains("localhost"))
        //            .AllowAnyHeader()
        //            .AllowAnyMethod();
        //    });

        //    app.UseAuthentication();
        //    app.UseAuthorization();
        //    app.UseMvc();
        //    app.UseHttpsRedirection();
        //    app.UseDefaultFiles();
        //    app.UseStaticFiles();

        //});

        return webHostBuilder;
    }
}
