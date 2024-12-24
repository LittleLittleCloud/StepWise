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
    public Parameter(
        string name,
        Type type,
        string variableName,
        string stepName,
        bool hasDefaultValue,
        object? defaultValue = null,
        bool isConfigurableFromWebUI = false,
        string description = "")
    {
        ParameterName = name;
        Type = type;
        VariableName = variableName;
        HasDefaultValue = hasDefaultValue;
        DefaultValue = defaultValue;
        StepName = stepName;
        IsConfigurableFromWebUI = isConfigurableFromWebUI;
        Description = description;
    }

    /// <summary>
    /// Parameter name.
    /// </summary>
    public string ParameterName { get; set; }

    public string StepName { get; set; }

    public Type Type { get; set; }

    /// <summary>
    /// Corresponding variable name accosiated with this parameter.
    /// </summary>
    public string VariableName { get; set; }

    public bool HasDefaultValue { get; set; }

    public object? DefaultValue { get; set; }

    public bool IsConfigurableFromWebUI { get; set; }

    public string Description { get; set; }
}
