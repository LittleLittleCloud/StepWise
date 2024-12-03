// Copyright (c) LittleLittleCloud. All rights reserved.
// UserInput.cs

using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using StepWise.Core;

public class UserInput
{
    [Step(description: """
        This example demonstrates how to use the text, number, switch, and image input in the workflow.
        You can find the source code in [UserInput.cs](https://github.com/LittleLittleCloud/StepWise/blob/main/example/HelloWorld/UserInput.cs).
        """)]
    public async Task<string> Start()
    {
        await Task.Delay(1000);
        return "Start";
    }

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

    [StepWiseUIImageInput(description: "Please upload an image")]
    public async Task<StepWiseImage?> GetImage()
    {
        return null;
    }

    [DependOn(nameof(GetCity))]
    [DependOn(nameof(GetNumber))]
    [DependOn(nameof(GetSwitch))]
    [DependOn(nameof(GetImage))]
    [Step(description: "return the city and number")]
    public async Task<string> Output(
        [FromStep(nameof(GetCity))] string city,
        [FromStep(nameof(GetNumber))] double number,
        [FromStep(nameof(GetSwitch))] bool isSwitchOn,
        [FromStep(nameof(GetImage))] StepWiseImage? image)
    {
        var size = image?.Blob!.Length;
        return $"City: {city}, Number: {number}, Switch: {isSwitchOn} Image size: {size}";
    }

    [Step]
    [DependOn(nameof(GetImage))]
    public async Task<StepWiseImage> FlipHorizontal
        ([FromStep(nameof(GetImage))] StepWiseImage image)
    {
        var newImage = Image.Load(image.Blob!.ToStream());
        newImage.Mutate(x => x.Flip(FlipMode.Horizontal));

        // save
        using var ms = new MemoryStream();
        newImage.SaveAsPng(ms);
        ms.Flush();
        ms.Position = 0;
        return new StepWiseImage
        {
            Blob = BinaryData.FromStream(ms),
            ContentType = "image/png",
            Name = $"flipped-{image.Name}",
        };
    }
}
