# Weather.com Scraper

Weather.com uses Weather Underground under the hood.

Weather Underground has the most accurate service and its API was one of the cheapest. It was then bought out by The Weather Company who was then bought out by IBM in 2016. IBM proceeded to obliterate its service in 2018. IBM sold The Weather Company to a private equity firm in 2023, estimated at more than $1B. We can safely assume weather.com will greatly suffer under these soulless sharks' managment.

In the meantime, enjoy a free weather.com API 🤗  
https://weather.victr.me/

#### Note

This api may be subject to change. Do not use `https://*.victr.*` urls in production !

## Queries

| Query | Type                      | Description                                       |
| ----- | ------------------------- | ------------------------------------------------- |
| lat   | Float                     | Latitude coordinates                              |
| lon   | Float                     | Longitude coordinates                             |
| get   | "today", "hour", or "day" | Get todays weather, hour by hour, or ten day      |
| unit  | "m" or "f"                | Use metric or football fields                     |
| id    | string                    | A 64 chars hash of a location used by weather.com |

## Returns

### Today

Getting information from `https://weather.com/weather/today/`  
[Live example](https://weather.victr.me/)

```js
/**
 * @typedef {Object} WeatherComToday
 * @prop {number} current - Recorded current temperature
 * @prop {number} feels - Felt current temperature
 * @prop {number} day - Temperature during the day
 * @prop {number} night - Temperature at night
 * @prop {string} description - What can we see outside right now
 */

const example = {
  current: 9,
  feels: 9,
  day: 12,
  night: 7,
  description: 'Cloudy',
}
```

### Hour by hour

Hour by hour forecast from `https://weather.com/weather/hourbyhour/`  
[Live example](https://weather.victr.me?get=hour)

```js
/**
 * @typedef {Object[]} WeatherComHour
 * @prop {number} timestamp - Forecast timestamp
 * @prop {number} temp - Forecasted temperature
 * @prop {string} rain - Forecasted chance of rain
 * @prop {string} description - What we might see outside
 */

const example = [
  {
    timestamp: 1714324275446,
    description: 'Scattered Showers',
    temp: 16,
    rain: '46%',
  },
  {
    timestamp: 1714327875446,
    description: 'Scattered Showers',
    temp: 14,
    rain: '47%',
  },
]
```

### Ten day

Hour by hour forecast from `https://weather.com/weather/tenday/`. Slightly different from `hour`, watch out !  
[Live example](https://weather.victr.me?get=day)

```js
/**
 * @typedef {Object[]} WeatherComDay
 * @prop {number} timestamp - Daily forecast timestamp
 * @prop {number} day - Forecasted temperature for the day
 * @prop {number} night - Forecasted temperature for the night
 * @prop {string} rain - Forecasted chance of rain
 * @prop {string} description - What we might see outside
 */

const example = [
  {
    timestamp: 1714378064551,
    description: 'Partly Cloudy',
    day: 20,
    night: 12,
    rain: '2%',
  },
  {
    timestamp: 1714464464551,
    description: 'Scattered Showers',
    day: 19,
    night: 12,
    rain: '57%',
  },
]
```

## Types

Here is a namespace to use in typescript codebases

```ts
namespace WeatherCom {
  export type Today = {
    current: number
    feels: number
    day: number
    night: number
    description: string
  }

  export type Hour = {
    timestamp: number
    description: string
    temp: number
    rain: string
  }[]

  export type Day = {
    timestamp: number
    description: string
    day: number
    night: number
    rain: string
  }[]
}
```

## Deploy your own

Using Cloudflare Workers, you can get 100k request per day without even adding a payment option. Deploying this worker is very simple:

-   Install Node on your system: https://nodejs.org/en/download
-   Create an account on Cloudflare in https://dash.cloudflare.com
-   Download this repo as a .zip by clicking the green button
-   Extract these files and open a terminal in this folder
-   Run this command `npm install --global wrangler@latest`
-   And deploy with `wrangler deploy`

```bash
npm install --global wrangler@latest

# ... npm stuff
#
# changed 73 packages in 9s

wrangler deploy

# Attempting to login via OAuth...
#
# Total Upload: 12.99 KiB / gzip: 3.58 KiB
# Uploaded weathercom-scraper (3.41 sec)
# Published weathercom-scraper (1.31 sec)
#   https://weathercom-scraper.your-account.workers.dev
```
