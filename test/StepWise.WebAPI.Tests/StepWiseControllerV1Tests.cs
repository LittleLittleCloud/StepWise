// Copyright (c) LittleLittleCloud. All rights reserved.
// StepWiseControllerV1Tests.cs

using ApprovalTests;
using ApprovalTests.Namers;
using ApprovalTests.Reporters;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace StepWise.WebAPI.Tests;

public class StepWiseControllerV1Tests
{
    [Fact]
    [UseReporter(typeof(DiffReporter))]
    [UseApprovalSubdirectory("Approvals")]
    public async Task TestSwagger()
    {
        using var host = await Host.CreateDefaultBuilder()
                            .UseEnvironment("Development")
                            .ConfigureWebHost(webBuilder =>
                            {
                                webBuilder
                                .UseTestServer()
                                .Configure(app => { });

                            })
                            .UseStepWiseServer()
                            .StartAsync();

        var server = host.GetTestServer();

        using (var client = server.CreateClient())
        {
            var source = Path.GetFullPath("Schema/StepWiseControllerV1.schema.json");
            var sourceContent = File.ReadAllText(source);
            string result = await client.GetStringAsync("/swagger/v1/swagger.json");

            Approvals.Verify(result);
            Approvals.Verify(sourceContent);

            //var schemaFile = "chatroom_client_swagger_schema.json";
            //var schemaFilePath = Path.Join("Schema", schemaFile);
            //var schemaJson = File.ReadAllText(schemaFilePath);
            //var schema = JObject.Parse(schemaJson).ToString();
            //var resultJson = JObject.Parse(result).ToString();
            //resultJson.Should().BeEquivalentTo(schema);
        }
    }
}
