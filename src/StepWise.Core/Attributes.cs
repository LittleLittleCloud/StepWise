using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;

namespace StepWise.Core;

[AttributeUsage(AttributeTargets.Method)]
public class StepAttribute : Attribute
{
    public StepAttribute([CallerMemberName] string? name = null)
        : base()
    {
        Name = name ?? throw new ArgumentNullException(nameof(name));
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
