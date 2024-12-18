// Copyright (c) LittleLittleCloud. All rights reserved.
// GetWeather.cs
using System.Text.Json;
using StepWise.Core;
namespace StepWise.Gallery;

public class GetWeatherWorkflow
{
    [Step]
    public async Task<string?> GetCurrentDateAsync()
    {
        return DateTime.Now.ToString("yyyy-MM-dd");
    }

    [StepWiseUITextInput]
    public async Task<string?> GetCityAsync()
    {
        return null;
    }

    [Step]
    [DependOn(nameof(GetCurrentDateAsync))]
    [DependOn(nameof(GetCityAsync))]
    public async Task<Weather> GetWeatherAsync(
        [FromStep(nameof(GetCityAsync))] string city,
        [FromStep(nameof(GetCurrentDateAsync))] string date)
    {
        string[] weathers = ["sunny", "rainy", "cloudy", "snowy"];
        var random = new Random();
        var forecast = weathers[random.Next(weathers.Length)];

        return new Weather(city, date, forecast);
    }

    public class Weather
    {
        public Weather(string city, string date, string forecast)
        {
            City = city;
            Date = date;
            Forecast = forecast;
        }
        public string City { get; }

        public string Date { get; }

        public string Forecast { get; }

        public override string ToString()
        {
            return JsonSerializer.Serialize(this);
        }
    }
}
