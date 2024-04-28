# Weather.com Scraper

Weather.com uses Weather Underground under the hood.

Weather Underground has the most accurate service and its API was one of the cheapest. It was then bought out by The Weather Company who was then bought out by IBM in 2016. IBM proceeded to obliterate its service in 2018. IBM sold The Weather Company to a private equity firm in 2023, estimated at more than $1B. We can safely assume weather.com will greatly suffer under these soulless sharks' managment.

In the meantime, enjoy a free weather.com API 🤗  
https://weather.victr.me/

#### Note

This api may be subject to change. Do not use `https://*.victr.*` urls in production !

## Queries

| Query | Type        | Description                         |
| ----- | ----------- | ----------------------------------- |
| lat   | Float       | Latitude coordinates                |
| lon   | Float       | Longitude coordinates               |
| get   | today, hour | Get todays weather, or hour by hour |
| unit  | m, f        | Use metric or football fields       |

## Returns

### Today

Getting information from `https://weather.com/weather/today/`

```ts
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

## Install

Using Cloudflare Workers:

```bash
# Install wrangler and its dependencies
npm install

# Should open http://127.0.0.1:8787
npm dev

# Classic deploy
npm deploy
```
