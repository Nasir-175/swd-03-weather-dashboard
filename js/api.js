const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

async function fetchJson(url, { signal } = {}) {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(
        `Open-Meteo request failed (${response.status} ${response.statusText}).`,
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith("Open-Meteo request failed")) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new Error("Open-Meteo returned an invalid response.", { cause: error });
    }
    throw new Error("Could not reach Open-Meteo. Check your connection and try again.", {
      cause: error,
    });
  }
}

export async function searchCity(name, { signal } = {}) {
  const cityName = name.trim();
  if (!cityName) {
    throw new Error("Enter a city name to search.");
  }

  try {
    const data = await fetchJson(
      `${GEOCODING_URL}?name=${encodeURIComponent(cityName)}&count=5`,
      { signal },
    );
    return (data.results ?? []).map((city) => ({
      name: city.name,
      region: city.admin1 ?? "",
      country: city.country ?? "",
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone,
    }));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new Error(
      error instanceof Error ? error.message : "Could not search for that city.",
      { cause: error },
    );
  }
}

export async function getForecast(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
  });
  return fetchJson(`${FORECAST_URL}?${params}`, { signal });
}
