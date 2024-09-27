// Copyright (c) LittleLittleCloud. All rights reserved.
// Attributes.cs

using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;

namespace StepWise.Core;

[AttributeUsage(AttributeTargets.Method)]
public class StepAttribute : Attribute
{
    public StepAttribute([CallerMemberName] string? name = null,
        string? description = null)
        : base()
    {
        Name = name ?? throw new ArgumentNullException(nameof(name));
        Description = description;
    }

    public string Name { get; set; }

    public string? Description { get; set; }
}

[AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
public class DependOnAttribute : Attribute
{
    public DependOnAttribute(string stepName)
    {
        Name = stepName;
    }

    public string Name { get; set; }
}

[AttributeUsage(AttributeTargets.Parameter)]
public class FromStepAttribute : Attribute
{
    public FromStepAttribute(string name)
    {
        Name = name;
    }

    public string Name { get; set; }
}

[AttributeUsage(AttributeTargets.Method)]
public class StepWiseUITextInputAttribute : Attribute
{
    /// <summary>
    /// This attribute is used to mark a method parameter as a text input in the UI.
    /// </summary>
    /// <param name="name">The name of the text input. If not provided, the name of the parameter will be used.</param>
    /// <param name="description">The description of the text input.</param>
    /// <exception cref="ArgumentNullException"></exception>
    public StepWiseUITextInputAttribute([CallerMemberName] string? name = null,
        string? description = null)
        : base()
    {
        Name = name ?? throw new ArgumentNullException(nameof(name));
        Description = description;
    }

    public string Name { get; set; }

    public string? Description { get; set; }
}
