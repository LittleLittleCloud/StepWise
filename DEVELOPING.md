# Development Setup
This document outlines the steps to set up a development environment for the project.

## Prerequisites
- **.NET 8.0 or later**: Ensure you have the latest version of .NET installed on your machine. You can download it from the [.NET website](https://dotnet.microsoft.com/download).
- Node.js and NPM: This is required for building `stepwise-studio`. You can download it from the [Node.js website](https://nodejs.org/).

## Building the Project
Firstly, build the `stepwise-studio` first. This is the web UI for the project and is required for compiling the dotnet project.

```bash
# Navigate to the stepwise-studio directory

cd stepwise-studio

# Install the dependencies using npm
npm install

# Build the project using npm
npm run build
```

After building the `stepwise-studio`, you can proceed to build the main project.

```bash
# Navigate to the root directory of the project (where the .sln file is located)
cd ..

dotnet build
```

## Testing the Project
After building the project, you can run all tests using standard .NET test command. This will execute all the unit tests in the solution to ensure everything is working as expected.

```bash
dotnet test
```