Once you create a workflow, you can publish it to make it available to the public. There are a few options to publish a workflow:
- publish as a dotnet tool
- publish as a web service

## Publish as a dotnet tool
When publishing as a dotnet tool, you essentially create a console application that can be installed as a global tool. The tool can be installed via `dotnet tool instal..` and executed via `dotnet <tool-name>`. This is a good option if you want to share the workflow with others who can run it on their local machine.

For how to create and publish a dotnet tool, please refer to the official documentation: [Create a .NET tool](https://docs.microsoft.com/en-us/dotnet/core/tools/global-tools-how-to-create). Once you have created the tool, you can publish it to NuGet.org or any other NuGet feed.
