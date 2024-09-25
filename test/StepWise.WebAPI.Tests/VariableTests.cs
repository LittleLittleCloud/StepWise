// Copyright (c) LittleLittleCloud. All rights reserved.
// VariableTests.cs

using System.Text.Json;
using ApprovalTests;
using ApprovalTests.Namers;
using ApprovalTests.Reporters;
using FluentAssertions;
using StepWise.Core;
using Xunit;

namespace StepWise.WebAPI.Tests;

public class VariableTests
{
    private readonly JsonSerializerOptions _jsonSerializerOptions = new() { WriteIndented = true };
    private readonly Guid _id = Guid.Empty;

    [Fact]
    [UseReporter(typeof(DiffReporter))]
    [UseApprovalSubdirectory("Approvals")]
    public async Task ItCreateVariableDTOFromStringVariable()
    {
        var str = StepVariable.Create("string", "Hello World");

        var variableDTO = VariableDTO.FromVariable(str);

        var json = JsonSerializer.Serialize(variableDTO, _jsonSerializerOptions);
        Approvals.Verify(json);

        var variable = VariableDTO.FromVariableDTO(variableDTO, typeof(string));
        variable.Name.Should().Be("string");
        variable.Value.Should().Be("Hello World");
        variable.Generation.Should().Be(0);
    }

    [Fact]
    [UseReporter(typeof(DiffReporter))]
    [UseApprovalSubdirectory("Approvals")]
    public async Task ItCreateVariableDTOFromPrimitiveVariable()
    {
        StepVariable[] variables = [
            StepVariable.Create("int", 1),
            StepVariable.Create("long", 1L),
            StepVariable.Create("float", 1.0f),
            StepVariable.Create("double", 1.0),
            StepVariable.Create("decimal", 1.0m),
            StepVariable.Create("byte", (byte)1),
            StepVariable.Create("string", "Hello World"),
            StepVariable.Create("char", 'a'),
            StepVariable.Create("bool", true),
            StepVariable.Create("DateTime", new DateTime(2021, 1, 1)),
            StepVariable.Create("Guid", _id),
        ];

        var jsonList = new List<string>();

        foreach (var variable in variables)
        {
            var variableDTO = VariableDTO.FromVariable(variable);

            var json = JsonSerializer.Serialize(variableDTO, _jsonSerializerOptions);
            jsonList.Add(json);

            var restoreVariable = VariableDTO.FromVariableDTO(variableDTO, variable.Value.GetType());
            restoreVariable.Name.Should().Be(variable.Name);
            restoreVariable.Value.Should().Be(variable.Value);
            restoreVariable.Generation.Should().Be(0);
        }

        Approvals.VerifyAll(jsonList, "Numeric Variables");
    }

    [Fact]
    [UseReporter(typeof(DiffReporter))]
    [UseApprovalSubdirectory("Approvals")]
    public async Task ItCreateVariableDTOFromArrayVariable()
    {
        StepVariable[] variables = [
            StepVariable.Create("int[]", new int[] { 1, 2, 3 }),
            StepVariable.Create("long[]", new long[] { 1L, 2L, 3L }),
            StepVariable.Create("string[]", new string[] { "Hello", "World" }),
        ];

        var jsonList = new List<string>();

        foreach (var variable in variables)
        {
            var variableDTO = VariableDTO.FromVariable(variable);

            var json = JsonSerializer.Serialize(variableDTO, _jsonSerializerOptions);
            jsonList.Add(json);

            var restoreVariable = VariableDTO.FromVariableDTO(variableDTO, variable.Value.GetType());
            restoreVariable.Name.Should().Be(variable.Name);
            restoreVariable.Value.Should().BeEquivalentTo(variable.Value);
            restoreVariable.Generation.Should().Be(0);
        }

        Approvals.VerifyAll(jsonList, "Numeric Variables");
    }

    [Fact]
    [UseReporter(typeof(DiffReporter))]
    [UseApprovalSubdirectory("Approvals")]
    public async Task ItCreateVariableDTOFromObjectVariable()
    {
        StepVariable[] variables = [
            StepVariable.Create("tuple", (1, 2, "hello", true)),
        ];

        var jsonList = new List<string>();

        foreach (var variable in variables)
        {
            var variableDTO = VariableDTO.FromVariable(variable);

            var json = JsonSerializer.Serialize(variableDTO, _jsonSerializerOptions);
            jsonList.Add(json);

            var restoreVariable = VariableDTO.FromVariableDTO(variableDTO, variable.Value.GetType());
            restoreVariable.Name.Should().Be(variable.Name);
            restoreVariable.Value.Should().Be(variable.Value);
            restoreVariable.Generation.Should().Be(0);
        }

        Approvals.VerifyAll(jsonList, "Numeric Variables");
    }
}
