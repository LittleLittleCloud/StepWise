// Copyright (c) LittleLittleCloud. All rights reserved.
// Parameter.cs

using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Reflection;
using System.Text;

namespace StepWise.Core;

public class Parameter
{
    public Parameter(string name, Type type, string? variableName, bool hasDefaultValue, object? defaultValue = null)
    {
        ParameterName = name;
        Type = type;
        VariableName = variableName ?? name;
        HasDefaultValue = hasDefaultValue;
        DefaultValue = defaultValue;
    }

    /// <summary>
    /// Parameter name.
    /// </summary>
    public string ParameterName { get; set; }

    public Type Type { get; set; }

    /// <summary>
    /// Corresponding variable name accosiated with this parameter.
    /// </summary>
    public string VariableName { get; set; }

    public bool HasDefaultValue { get; set; }

    public object? DefaultValue { get; set; }
}
