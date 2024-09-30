// Copyright (c) LittleLittleCloud. All rights reserved.
// UserInput.cs

using StepWise.Core;

public class UserInput
{
    [StepWiseUITextInput(description: "Please enter the city name")]
    public async Task<string?> GetCity()
    {
        return null;
    }

    [StepWiseUINumberInput(description: "Please enter a number")]
    public async Task<double?> GetNumber()
    {
        return null;
    }

    [StepWiseUISwitchInput(description: "Please toggle the switch")]
    public async Task<bool?> GetSwitch()
    {
        return null;
    }

    [DependOn(nameof(GetCity))]
    [DependOn(nameof(GetNumber))]
    [DependOn(nameof(GetSwitch))]
    [Step(description: "return the city and number")]
    public async Task<string> Output(
        [FromStep(nameof(GetCity))] string city,
        [FromStep(nameof(GetNumber))] double number,
        [FromStep(nameof(GetSwitch))] bool isSwitchOn)
    {
        return $"City: {city}, Number: {number}, Switch: {isSwitchOn}";
    }
}
