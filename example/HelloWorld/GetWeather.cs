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

    [Step]
    [DependOn(nameof(GetCurrentDateAsync))]
    public async Task<string?> GetWeatherAsync(
        string[] cities,
        [FromStep(nameof(GetCurrentDateAsync))] string date)
    {
        var weathers = cities.Select(city => new Weather(city, date, "Sunny")).ToArray();

        return JsonSerializer.Serialize(weathers);
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
