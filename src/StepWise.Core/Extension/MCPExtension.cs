// Copyright (c) LittleLittleCloud. All rights reserved.
// MCPExtension.cs

using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;
using ModelContextProtocol.Server;

namespace StepWise.Core.Extension;

public static class MCPExtension
{
    public static McpServerToolCollection GetMcpServerToolCollection(this IStepWiseEngine engine)
    {
        var aiFunctions = engine.GetAIFunctions();

        var collection = new McpServerToolCollection();
        foreach (var aiFunction in aiFunctions)
        {
            collection.Add(McpServerTool.Create(aiFunction));
        }

        return collection;
    }
}
