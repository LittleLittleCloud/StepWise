// Copyright (c) LittleLittleCloud. All rights reserved.
// HostBuilderExtension.cs

using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;

namespace StepWise.WebAPI;

public static class HostBuilderExtension
{
    public static IHostBuilder UseStepWiseServer(this IHostBuilder hostBuilder)
    {
        hostBuilder.ConfigureServices(services =>
        {
            services.AddSingleton<StepWiseClient>();
        });

        return hostBuilder.ConfigureWebHost(webBuilder =>
        {
            // fix https://github.com/LittleLittleCloud/StepWise/issues/28

            var assemblyLocation = Assembly.GetExecutingAssembly().Location;
            var assemblyDirectory = Path.GetDirectoryName(assemblyLocation) ?? Environment.CurrentDirectory;
            var webRoot = Path.Combine(assemblyDirectory, "wwwroot");
            webBuilder.UseWebRoot(webRoot);

            webBuilder.ConfigureServices(services =>
            {
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
                    builder.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost")
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
                app.UseMvc();
                app.UseHttpsRedirection();
                app.UseDefaultFiles();
                app.UseStaticFiles();
            });
        });
    }
}
