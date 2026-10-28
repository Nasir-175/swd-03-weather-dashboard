const forecastList = document.querySelector("#forecast-list");
const favoritesList = document.querySelector("#favorites-list");
const statusMessage = document.querySelector("#status-message");
const errorMessage = document.querySelector("#error-message");
const cityChoices = document.querySelector("#city-choices");
const weatherSkeleton = document.querySelector("#weather-skeleton");
const currentCard = document.querySelector("#current-weather");
const favoriteToggle = document.querySelector("#favorite-toggle");

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function getForecastDay(date) {
  const forecastDate = new Date(`${date}T00:00:00Z`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    timeZone: "UTC",
  }).format(forecastDate);
}

function formatLocalTime(time) {
  const [, hours, minutes] = time.match(/T(\d{2}):(\d{2})/) ?? [];
  if (hours === undefined || minutes === undefined) return time;

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, Number(hours), Number(minutes))));
}

function convertTemperature(celsius, unit) {
  return Math.round(unit === "F" ? (celsius * 9) / 5 + 32 : celsius);
}

export function renderWeather(weather, unit) {
  document.querySelector("#city-name").textContent = weather.city;
  document.querySelector("#city-country").textContent = weather.country;
  document.querySelector("#current-temperature").replaceChildren(
    document.createTextNode(String(convertTemperature(weather.temperature, unit))),
    Object.assign(document.createElement("span"), { textContent: `°${unit}` }),
  );
  document.querySelector("#current-condition").textContent = weather.condition;
  document.querySelector("#current-icon").textContent = weather.icon;
  document.querySelector("#wind-speed").textContent = `${weather.windSpeed} km/h`;
  document.querySelector("#local-time").textContent = formatLocalTime(weather.localTime);
  document.querySelector("#humidity").textContent = `${weather.humidity}%`;
  favoriteToggle.setAttribute("aria-label", `${weather.isFavorite ? "Remove" : "Add"} ${weather.city} ${weather.isFavorite ? "from" : "to"} favourites`);
  favoriteToggle.setAttribute("aria-pressed", String(weather.isFavorite));
  favoriteToggle.title = weather.isFavorite ? "Remove from favourites" : "Add to favourites";
  favoriteToggle.textContent = weather.isFavorite ? "★" : "☆";

  forecastList.replaceChildren(...weather.forecast.map((day, index) => {
    const card = createElement("article", "forecast-card");
    card.append(
      createElement("span", "forecast-day", getForecastDay(day.date)),
      createElement("span", "forecast-icon", day.icon),
    );
    card.lastElementChild.setAttribute("aria-hidden", "true");

    const temperatures = createElement("div", "forecast-temperatures");
    temperatures.append(
      createElement("span", "", `${convertTemperature(day.high, unit)}°`),
      createElement("span", "forecast-low", `${convertTemperature(day.low, unit)}°`),
    );
    card.append(temperatures);
    return card;
  }));

}

export function renderFavorites(favorites, selectedCity, onSelect) {
  document.querySelector("#favorites-count").textContent = String(favorites.length);
  favoritesList.replaceChildren(...favorites.map((location) => {
    const item = document.createElement("li");
    const button = createElement("button", "favorite-button");
    button.type = "button";
    button.dataset.latitude = String(location.latitude);
    button.dataset.longitude = String(location.longitude);
    button.setAttribute("aria-label", `Show weather for ${location.name}, ${location.country}`);
    if (location.name.toLocaleLowerCase() === selectedCity.toLocaleLowerCase()) {
      button.setAttribute("aria-current", "true");
    }
    button.addEventListener("click", () => onSelect(location));

    const icon = createElement("span", "favorite-icon", "⌖");
    icon.setAttribute("aria-hidden", "true");
    const copy = createElement("span", "favorite-copy");
    copy.append(
      createElement("strong", "", location.name),
      createElement("span", "", location.country),
    );
    button.append(icon, copy);
    item.append(button);
    return item;
  }));
}

export function renderCityChoices(locations, onSelect) {
  cityChoices.replaceChildren(...locations.map((location, index) => {
    const option = createElement(
      "button",
      "city-choice",
      [location.name, location.region, location.country].filter(Boolean).join(", "),
    );
    option.type = "button";
    option.id = `city-choice-${index}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.addEventListener("click", () => onSelect(location));
    return option;
  }));
  cityChoices.hidden = false;
}

export function clearCityChoices() {
  cityChoices.replaceChildren();
  cityChoices.hidden = true;
}

export function setTemperatureUnit(unit) {
  document.querySelector("#unit-c").setAttribute("aria-pressed", String(unit === "C"));
  document.querySelector("#unit-f").setAttribute("aria-pressed", String(unit === "F"));
}

export function showLoading() {
  clearCityChoices();
  weatherSkeleton.hidden = false;
  currentCard.classList.add("is-loading");
  statusMessage.classList.add("sr-only");
  statusMessage.textContent = "Loading weather forecast";
  errorMessage.hidden = true;
  errorMessage.textContent = "";
  forecastList.replaceChildren(...Array.from({ length: 7 }, () => {
    const card = createElement("div", "forecast-card forecast-card--skeleton");
    card.setAttribute("aria-hidden", "true");
    card.append(
      createElement("span", "skeleton-line skeleton-line--day"),
      createElement("span", "skeleton-line skeleton-line--icon"),
      createElement("span", "skeleton-line skeleton-line--temps"),
    );
    return card;
  }));
}

function hideLoading() {
  weatherSkeleton.hidden = true;
  currentCard.classList.remove("is-loading");
  statusMessage.classList.remove("sr-only");
  if (forecastList.querySelector(".forecast-card--skeleton")) {
    forecastList.replaceChildren();
  }
}

export function showError(message) {
  hideLoading();
  clearCityChoices();
  statusMessage.textContent = "";
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

export function clearStatus() {
  hideLoading();
  statusMessage.textContent = "";
  errorMessage.textContent = "";
  errorMessage.hidden = true;
}

export function setFavoriteToggleHandler(onToggle) {
  favoriteToggle.addEventListener("click", onToggle);
}

export function setHeaderDate(date) {
  document.querySelector("#header-date").textContent = new Intl.DateTimeFormat(
    undefined,
    { weekday: "long", month: "long", day: "numeric" },
  ).format(date);
}
