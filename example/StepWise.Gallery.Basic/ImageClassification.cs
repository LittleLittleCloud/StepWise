// Copyright (c) LittleLittleCloud. All rights reserved.
// ImageClassification.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using AutoGen.Core;
using AutoGen.OpenAI;
using AutoGen.OpenAI.Extension;
using Json.Schema;
using Json.Schema.Generation;
using OpenAI;
using OpenAI.Chat;
using OpenAI.Images;
using StepWise.Core;

namespace StepWise.Gallery;

public partial class ImageClassification
{
    [Function]
    public async Task<string> ClassifyImage(string category, string reason)
    {
        return category;
    }

    private string _apiKey = string.Empty;
    private IAgent? _agent;
    [Step(description: """
        ## Image Classification using OpenAI gpt-4o-mini

        ### Required
        - openai api key
        """)]
    public async Task<string> Start()
    {
        return "Start";
    }


    [StepWiseUITextInput(description: "Please provide the openai api key if env:OPENAI_API_KEY is not set, otherwise leave empty and submit")]
    public async Task<string?> OpenAIApiKey()
    {
        return null;
    }

    [Step(description: "Validate the openai api key")]
    public async Task<string> ValidateOpenAIApiKey(
        [FromStep(nameof(OpenAIApiKey))] string apiKey)
    {
        var functionCallMiddleware = new FunctionCallMiddleware(
            functions: [this.ClassifyImageFunctionContract],
            functionMap: new Dictionary<string, Func<string, Task<string>>>
            {
                [nameof(ClassifyImage)] = this.ClassifyImageWrapper,
            });
        if (Environment.GetEnvironmentVariable("OPENAI_API_KEY") is not string envApiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new Exception("Please provide the openai api key");
            }

            _apiKey = apiKey;
            var client = new OpenAIClient(_apiKey);
            var chatClient = client.GetChatClient("gpt-4o-mini");
            _agent = new OpenAIChatAgent(
                chatClient: chatClient,
                name: "assistant")
                .RegisterMessageConnector()
                .RegisterStreamingMiddleware(functionCallMiddleware)
                .RegisterPrintMessage();

            return "Use provided api key";
        }
        else
        {
            _apiKey = envApiKey;
            var client = new OpenAIClient(_apiKey);
            var chatClient = client.GetChatClient("gpt-4o-mini");
            _agent = new OpenAIChatAgent(
                chatClient: chatClient,
                name: "assistant")
                .RegisterMessageConnector()
                .RegisterStreamingMiddleware(functionCallMiddleware)
                .RegisterPrintMessage();

            return "Use env:OPENAI_API_KEY";
        }
    }

    [Title("Category_Collection")]
    public class ImageClassificationTask
    {
        public ImageClassificationTask(IEnumerable<Category> categories)
        {
            Categories = categories.ToArray();
        }

        public ImageClassificationTask()
        {
        }

        public Category[] Categories { get; set; } = Array.Empty<Category>();

        [Description("Additional note for the image classification task")]
        public string Note { get; set; } = string.Empty;

        public override string ToString()
        {
            var sb = new StringBuilder();
            sb.AppendLine("## Image Classification Categories");
            foreach (var category in Categories)
            {
                sb.AppendLine($"- {category}: {category.Description}");
            }

            return sb.ToString();
        }
    }

    [Title("Category")]
    public class Category
    {
        public Category(string name, string description)
        {
            Name = name;
            Description = description;
        }

        [Description("Image classification category")]
        public string Name { get; }

        [Description("Description of the image classification category")]
        public string Description { get; }

        public override string ToString() => $"{Name}: {Description}";
    }

    [StepWiseUITextInput(description: """
        Please provide the image classification category and description using natural language.

        e.g.:
        - cat: <description>
        - dog: <description>
        """)]
    public async Task<string?> ImageCategoryInput()
    {
        return null;
    }

    [Step(description: """
        Create a collection of image classification categories from user input
        """)]
    [DependOn(nameof(ImageCategoryInput))]
    [DependOn(nameof(ValidateOpenAIApiKey))]
    public async Task<ImageClassificationTask> CreateCategoryCollection(
        [FromStep(nameof(ValidateOpenAIApiKey))] string apiKey,
        [FromStep(nameof(ImageCategoryInput))] string input)
    {
        if (_agent is null)
        {
            throw new Exception("Please provide the openai api key");
        }

        var schema = new JsonSchemaBuilder()
            .FromType<ImageClassificationTask>()
            .Build();

        var inputMessage = new TextMessage(Role.User, input);
        var response = await _agent.GenerateReplyAsync(
            [inputMessage],
            new GenerateReplyOptions
            {
                OutputSchema = schema,
            });

        return JsonSerializer.Deserialize<ImageClassificationTask>(response.GetContent()!) ??
            throw new Exception($"Failed to create category collection from {response.GetContent()!}");
    }

    [StepWiseUITextInput(description: """
        Please provide the path to image folder which contains the images to classify.

        The images should be in the following format:
        - jpg
        - png

        The folder be 1 level deep and contain only images. All files that are not ending with .jpg or .png, or located in subfolders will be ignored.
        e.g.:
        - image_1.jpg
        - image_2.png
        - image_3.jpg
        - image_4.png
        - ...
        """)]
    public Task<string?> ImageFolder()
    {
        return Task.FromResult<string?>(null);
    }

    public record Images(string[] ImagePaths)
    {
        public override string ToString()
        {
            var sb = new StringBuilder();
            sb.AppendLine("## Image to classify");
            foreach (var path in ImagePaths)
            {
                sb.AppendLine($"- {path}");
            }

            return sb.ToString();
        }
    }

    public record ImageToClassify(string ImagePath)
    {
        public override string ToString() => $"Image: {ImagePath}";
    }

    public record ImageClassificationResult(string ImagePath, string Category)
    {
        public override string ToString() => $"Image: {ImagePath}, Category: {Category}";
    }

    [Step(description: "List images in the image folder")]
    public Task<Images> ListImages(
        [FromStep(nameof(ImageFolder))] string folder)
    {
        var images = System.IO.Directory.GetFiles(folder, "*.*", System.IO.SearchOption.TopDirectoryOnly)
            .Where(file => file.EndsWith(".jpg") || file.EndsWith(".png"))
            .ToArray();

        return Task.FromResult(new Images(images));
    }

    [Step(description: """
        Iterate through the images in the image folder and classify them using the image classification categories

        If the image is already classified, it will be skipped
        """)]
    public async Task<ImageToClassify?> Iterator(
        [FromStep(nameof(ListImages))] Images images,
        [FromStep(nameof(CreateCategoryCollection))] ImageClassificationTask categories,
        [FromStep(nameof(ClassifyImage))] ImageClassificationResult? previousResult = null)
    {
        var targetFolders = categories.Categories.Select(c => Path.Combine(System.IO.Path.GetDirectoryName(images.ImagePaths[0])!, c.Name)).ToArray();

        // create the target folders if they do not exist
        foreach (var folder in targetFolders)
        {
            if (!System.IO.Directory.Exists(folder))
            {
                System.IO.Directory.CreateDirectory(folder);
            }
        }

        var classifiedImages = targetFolders
            .SelectMany(folder => System.IO.Directory.GetFiles(folder, "*.*", System.IO.SearchOption.TopDirectoryOnly))
            .Select(path => Path.GetFileName(path))
            .Distinct();

        var unclassifiedImages = images.ImagePaths
            .Where(image => !classifiedImages.Contains(Path.GetFileName(image)))
            .ToArray();

        if (unclassifiedImages.Length == 0)
        {
            return null;
        }

        return new ImageToClassify(unclassifiedImages[0]);
    }

    [Step(description: """
        Classify the in the image folder using the image classification categories

        The classfied image will be saved in the subfolder of the image folder with the same name as the category

        e.g.:
        - image_folder
            - cat
                - image_1.jpg
                - image_2.jpg
            - dog
                - image_3.jpg
                - image_4.jpg
        """)]

    [DependOn(nameof(Iterator))]
    [DependOn(nameof(Image))]
    public async Task<ImageClassificationResult?> ClassifyImage(
        [FromStep(nameof(Image))] StepWiseImage image,
        [FromStep(nameof(CreateCategoryCollection))] ImageClassificationTask categories,
        [FromStep(nameof(Iterator))] ImageToClassify imageToClassify)
    {

        if (_agent is null)
        {
            throw new Exception("Please provide the openai api key");
        }

        var imagePath = imageToClassify.ImagePath;

        var prompt = $"""
            Please classify the image using the following categories:
            ```categories
            {categories}
            ```

            If the image does not belong to any of the categories, classify it as 'unknown'.
            """;

        var textMessage = new TextMessage(Role.User, prompt);
        var imageMessage = new ImageMessage(Role.User, image.Blob!);
        var multiModalMessage = new MultiModalMessage(Role.User, [textMessage, imageMessage]);

        var functionCallMiddleware = new FunctionCallMiddleware(
            functions: [this.ClassifyImageFunctionContract],
            functionMap: new Dictionary<string, Func<string, Task<string>>>
            {
                [nameof(ClassifyImage)] = this.ClassifyImageWrapper,
            });

        var response = await _agent.SendAsync(multiModalMessage);

        if (response is ToolCallAggregateMessage aggregateMessage && aggregateMessage.Message2 is ToolCallResultMessage toolCallResult && toolCallResult.ToolCalls.Count == 1)
        {
            var catogory = toolCallResult.ToolCalls[0].Result!;

            var result = new ImageClassificationResult(imagePath, catogory);

            var categoryFolder = System.IO.Path.Combine(System.IO.Path.GetDirectoryName(imagePath)!, catogory);
            if (!System.IO.Directory.Exists(categoryFolder))
            {
                System.IO.Directory.CreateDirectory(categoryFolder);
            }

            var newImagePath = System.IO.Path.Combine(categoryFolder, System.IO.Path.GetFileName(imagePath));
            System.IO.File.Copy(imagePath, newImagePath);

            return result;
        }

        return null;
    }

    [Step(description: "Show Current Image")]
    [DependOn(nameof(Iterator))]
    public async Task<StepWiseImage> Image(
        [FromStep(nameof(Iterator))] ImageToClassify current)
    {
        var image = System.IO.File.ReadAllBytes(current.ImagePath);
        var mimeType = current.ImagePath.EndsWith(".jpg") ? "image/jpeg" : "image/png";
        return new StepWiseImage()
        {
            Blob = BinaryData.FromBytes(image, mediaType: mimeType),
            ContentType = mimeType,
            Name = System.IO.Path.GetFileName(current.ImagePath),
        };
    }

    [Step(description: "Current Image Classification Result")]
    [DependOn(nameof(ClassifyImage))]
    public async Task<string?> ImageCategory(
        [FromStep(nameof(ClassifyImage))] ImageClassificationResult result)
    {
        return result.Category;
    }
}
