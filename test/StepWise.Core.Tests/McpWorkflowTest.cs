// Copyright (c) LittleLittleCloud. All rights reserved.
// McpWorkflowTest.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using Meziantou.Extensions.Logging.Xunit;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Client;
using ModelContextProtocol.Server;
using StepWise.Core.Extension;
using Xunit;
using Xunit.Abstractions;

namespace StepWise.Core.Tests;

[Collection("Sequential")]
public class McpWorkflowTest
{
    private readonly ITestOutputHelper _testOutputHelper;
    private readonly ILogger _logger;

    public McpWorkflowTest(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
        _logger = new XUnitLoggerProvider(testOutputHelper).CreateLogger(nameof(GuessNumberWorkflowTest));
    }

    [Step]
    public async Task<string> McpInstanceInjectStep(
        IMcpClient? client = null,
        IMcpServer? server = null)
    {
        if (client is not null)
        {
            return "client is not null";
        }
        if (server is not null)
        {
            return "server is not null";
        }

        return "Hello world!";
    }

    [Fact]
    public async Task ItShouldNotIncludeMcpClassIntoScheme()
    {
        var workflow = Workflow.CreateFromInstance(this);
        var engine = StepWiseEngine.CreateFromInstance(this);
        var tools = engine.GetAIFunctions();

        tools.Count().Should().Be(1);

        var mcpStep = tools.First();

        mcpStep.Name.Should().Be(nameof(McpInstanceInjectStep));

        // Check the JsonSchema
        // the property "client" and "server" should not be in the JsonSchema
        var jsonSchema = mcpStep.JsonSchema;
        jsonSchema.TryGetProperty("properties", out var properties).Should().BeTrue();
        var propertiesObject = properties.EnumerateObject().ToDictionary(x => x.Name, x => x.Value);
        propertiesObject.Should().NotContainKey("client"); // because it is a IMcpClient
        propertiesObject.Should().NotContainKey("server"); // because it is a IMcpServer
    }

    [Fact]
    public async Task ItShouldInjectMcpServerInstanceFromRequestContext()
    {
        var workflow = Workflow.CreateFromInstance(this);
        var engine = StepWiseEngine.CreateFromInstance(this);
        var tools = engine.GetAIFunctions();
        var mcpStep = tools.First();
        var mcpServerMock = Moq.Mock.Of<IMcpServer>();
        var requestContext = new RequestContext<int>(mcpServerMock, 1);
        var result = await mcpStep.InvokeAsync([
            new KeyValuePair<string, object?>("context", requestContext),
            ], default);
        result.Should().Be("server is not null");
    }
}
