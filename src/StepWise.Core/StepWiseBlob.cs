// Copyright (c) LittleLittleCloud. All rights reserved.
// StepWiseBlob.cs

using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace StepWise.Core;

public class StepWiseBlobJsonConverter : JsonConverter<StepWiseBlob>
{
    public override StepWiseBlob? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.StartObject)
        {
            return null;
        }

        using var jsonDocument = JsonDocument.ParseValue(ref reader);
        var root = jsonDocument.RootElement;

        var blobType = root.GetProperty("blob_type").GetString();
        var url = root.GetProperty("url").GetString();
        var name = root.GetProperty("name").GetString();

        return blobType switch
        {
            "image" => new StepWiseImage()
            {
                Url = url,
                Name = name,
            },
            _ => throw new NotSupportedException($"Blob type '{blobType}' is not supported."),
        };
    }

    public override void Write(Utf8JsonWriter writer, StepWiseBlob value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();
        writer.WriteString("blob_type", value.BlobType);
        writer.WriteString("url", value.Url);
        writer.WriteString("name", value.Name);
        writer.WriteEndObject();
    }
}

public abstract class StepWiseBlob
{
    public StepWiseBlob()
    {
    }

    [JsonPropertyName("blob_type")]
    public abstract string BlobType { get; }

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonIgnore]
    public BinaryData? Blob { get; set; }
}

public class StepWiseImage : StepWiseBlob
{
    public StepWiseImage() : base()
    {
    }

    [JsonPropertyName("content_type")]
    public string? ContentType { get; set; }

    public override string BlobType => "image";
}
