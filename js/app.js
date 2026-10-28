import { getForecast, searchCity } from "./api.js";
import weatherCodes from "./weatherCodes.js";
import {
  clearStatus,
  renderCityChoices,
  renderFavorites,
  renderWeather,
  setHeaderDate,
  setTemperatureUnit,
  showError,
  showLoading,
} from "./ui.js";

const DEFAULT_FAVORITES = [
  { name: "London", country: "United Kingdom", latitude: 51.5072, longitude: -0.1276 },
  { name: "New York", country: "United States", latitude: 40.7128, longitude: -74.006 },
  { name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
];
const FAVORITES_KEY = "weather-favorites";
const LAST_VIEWED_KEY = "weather-last-viewed";
const searchForm = document.querySelector("#search-form");
const citySearch = document.querySelector("#city-search");
const locationButton = document.querySelector("#use-location");
let selectedCity = "";
let latestWeather = null;
let favorites = [];
let activeController = null;
let latestRequest = 0;
let temperatureUnit = "C";
let unitStorageWarning = "";

function isLocation(value) {
  return value
    && typeof value.name === "string"
    && typeof value.country === "string"
    && Number.isFinite(value.latitude)
    && Number.isFinite(value.longitude);
}

function sameLocation(first, second) {
  return first.latitude === second.latitude
    && first.longitude === second.longitude;
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    unitStorageWarning = "";
    return true;
  } catch (error) {
    unitStorageWarning = "Could not save your favourites in this browser.";
    showError(unitStorageWarning);
    return false;
  }
}

function updateFavoritesList() {
  renderFavorites(favorites, selectedCity, loadLocationWeatherFromFavorite);
}

function toggleCurrentFavorite() {
  if (!latestWeather) return;

  const location = {
    name: latestWeather.city,
    country: latestWeather.favoriteCountry,
    latitude: latestWeather.latitude,
    longitude: latestWeather.longitude,
  };
  const index = favorites.findIndex((favorite) => sameLocation(favorite, location));
  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push(location);
  }

  saveFavorites();
  latestWeather.isFavorite = index < 0;
  renderCurrentWeather();
  updateFavoritesList();
}

function startRequest() {
  activeController?.abort();
  activeController = new AbortController();
  latestRequest += 1;
  return { controller: activeController, requestId: latestRequest };
}

function isCurrentRequest(requestId) {
  return requestId === latestRequest;
}

function renderCurrentWeather() {
  if (latestWeather) {
    renderWeather(latestWeather, temperatureUnit);
  }
}

async function loadLocationWeatherFromFavorite(location) {
  const { controller, requestId } = startRequest();
  await loadLocationWeather(location, requestId, controller);
}

async function loadLocationWeather(location, requestId, controller) {
  showLoading();

  try {
    const forecast = await getForecast(
      location.latitude,
      location.longitude,
      { signal: controller.signal },
    );
    if (!isCurrentRequest(requestId)) return;

    const currentConditions = weatherCodes[forecast.current.weather_code]
      ?? { label: "Unknown conditions", emoji: "🌡️" };
    const weather = {
      city: location.name,
      country: [location.region, location.country].filter(Boolean).join(", "),
      favoriteCountry: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      temperature: forecast.current.temperature_2m,
      condition: currentConditions.label,
      icon: currentConditions.emoji,
      windSpeed: Math.round(forecast.current.wind_speed_10m),
      localTime: forecast.current.time,
      humidity: forecast.current.relative_humidity_2m,
      forecast: forecast.daily.time.map((date, index) => {
        const conditions = weatherCodes[forecast.daily.weather_code[index]]
          ?? { label: "Unknown conditions", emoji: "🌡️" };
        return {
          date,
          icon: conditions.emoji,
          high: forecast.daily.temperature_2m_max[index],
          low: forecast.daily.temperature_2m_min[index],
        };
      }),
      isFavorite: favorites.some((favorite) => sameLocation(favorite, location)),
    };

    latestWeather = weather;
    selectedCity = weather.city;
    try {
      localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify({
        name: location.name,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
    } catch (error) {
      unitStorageWarning = "Weather loaded, but this browser could not save your last-viewed city.";
    }
    renderCurrentWeather();
    updateFavoritesList();
    if (unitStorageWarning) {
      showError(unitStorageWarning);
    } else {
      clearStatus();
    }
  } catch (error) {
    if (isCurrentRequest(requestId) && error?.name !== "AbortError") {
      showError(error instanceof Error ? error.message : "Unable to load weather. Please try again.");
    }
  }
}

async function loadCityWeather(city) {
  const { controller, requestId } = startRequest();
  showLoading();

  try {
    if (isLocation(city)) {
      await loadLocationWeather(city, requestId, controller);
      return;
    }
    const matches = await searchCity(city, { signal: controller.signal });
    if (!isCurrentRequest(requestId)) return;
    if (matches.length === 0) {
      showError(`We couldn't find "${city}". Check the spelling or try another city.`);
      return;
    }

    if (matches.length > 1) {
      renderCityChoices(matches, (location) => {
        void loadLocationWeather(location, requestId, controller);
      });
      clearStatus();
      return;
    }

    await loadLocationWeather(matches[0], requestId, controller);
  } catch (error) {
    if (isCurrentRequest(requestId) && error?.name !== "AbortError") {
      showError(error instanceof Error ? error.message : "Unable to load weather. Please try again.");
    }
  }
}

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location services are not available in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        name: "My location",
        country: "Current location",
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location permission was denied. Allow location access in your browser settings, then try again."));
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          reject(new Error("Your location is unavailable right now. Try again or search for a city."));
        } else if (error.code === error.TIMEOUT) {
          reject(new Error("Finding your location timed out. Please try again."));
        } else {
          reject(new Error("Could not get your location. Please try again."));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  });
}

try {
  if (localStorage.getItem("weather-unit") === "F") {
    temperatureUnit = "F";
  }
  const storedFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "null");
  favorites = Array.isArray(storedFavorites) && storedFavorites.every(isLocation)
    ? storedFavorites
    : DEFAULT_FAVORITES;
  if (!Array.isArray(storedFavorites)) saveFavorites();
} catch (error) {
  favorites = DEFAULT_FAVORITES;
  unitStorageWarning = "Could not read saved preferences. Using the default settings.";
}

setHeaderDate(new Date());
setTemperatureUnit(temperatureUnit);
updateFavoritesList();

async function initialize() {
  let savedLocation = null;
  try {
    savedLocation = JSON.parse(localStorage.getItem(LAST_VIEWED_KEY) ?? "null");
  } catch (error) {
    unitStorageWarning = "Could not read the last-viewed city. Showing London instead.";
  }

  if (isLocation(savedLocation)) {
    await loadCityWeather(savedLocation);
    return;
  }

  if (navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "granted") {
        const location = await getBrowserLocation();
        await loadCityWeather(location);
        return;
      }
    } catch (error) {
      unitStorageWarning = "Could not check location permission. Showing London instead.";
    }
  }

  await loadCityWeather(DEFAULT_FAVORITES[0]);
}

void initialize();

for (const unit of ["C", "F"]) {
  document.querySelector(`#unit-${unit.toLowerCase()}`).addEventListener("click", () => {
    temperatureUnit = unit;
    setTemperatureUnit(temperatureUnit);
    renderCurrentWeather();
    try {
      localStorage.setItem("weather-unit", temperatureUnit);
      unitStorageWarning = "";
      clearStatus();
    } catch (error) {
      unitStorageWarning = "Temperature updated, but this browser could not save your preference.";
      showError(unitStorageWarning);
    }
  });
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const city = citySearch.value.trim();
  if (!city) {
    showError("Enter a city name to search.");
    citySearch.focus();
    return;
  }

  void loadCityWeather(city);
});

document.querySelector("#favorite-toggle").addEventListener("click", toggleCurrentFavorite);

locationButton.addEventListener("click", async () => {
  const { controller, requestId } = startRequest();
  showLoading();
  locationButton.disabled = true;
  try {
    const location = await getBrowserLocation();
    if (!isCurrentRequest(requestId)) return;
    await loadLocationWeather(location, requestId, controller);
  } catch (error) {
    if (isCurrentRequest(requestId)) {
      showError(error instanceof Error ? error.message : "Could not get your location.");
    }
  } finally {
    locationButton.disabled = false;
  }
});
