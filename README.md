# Weatherly

A responsive weather dashboard built with plain HTML, CSS, and JavaScript ES modules.

## Features

- Current conditions and a seven-day forecast.
- Search for a city and choose among matching locations.
- Save and remove favourite locations; favourites and the last-viewed location persist in `localStorage`.
- Load weather for the device's current location with browser geolocation.
- Switch between Celsius and Fahrenheit; the unit preference persists in `localStorage`.
- Accessible loading, error, and city-choice states.
- Responsive glassmorphism-inspired layout.

## API

Weatherly uses the free [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) to find cities and the [Open-Meteo Forecast API](https://open-meteo.com/en/docs) to fetch current conditions and daily forecasts. No API key is required.

## Run locally

Open this folder through a local development server (for example, VS Code Live Server) and visit `index.html`. A local server is recommended for ES modules and is required for browser geolocation, which is restricted to secure contexts such as `localhost` and HTTPS.

## Screenshots

_Screenshot placeholder: add a desktop dashboard screenshot here._

_Screenshot placeholder: add a mobile dashboard screenshot here._

## What I learned

- Using `async`/`await`, `fetch`, and `AbortController` to manage network requests and prevent stale searches from winning.
- Converting API values in the browser and keeping user preferences in `localStorage`.
- Handling geolocation permissions and errors as part of the user experience.
- Rendering external data with DOM elements and `textContent` rather than treating API strings as HTML.
- Making responsive layouts and loading states accessible.
