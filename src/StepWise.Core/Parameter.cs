using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Reflection;
using System.Text;

namespace StepWise.Core;

public class Parameter
{
    public Parameter(string name, Type type, string? sourceStep, bool hasDefaultValue)
    {
        Name = name;
        Type = type;
        SourceStep = sourceStep;
        HasDefaultValue = hasDefaultValue;
    }

    public string Name { get; set; }

    public Type Type { get; set; }

    public string? SourceStep { get; set; }

    public bool HasDefaultValue { get; set; }
}
