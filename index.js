import striptags from 'striptags'

/**
 * @typedef {Object} WeatherComToday
 * @prop {number} current - Recorded current temperature
 * @prop {number} feels - Felt current temperature
 * @prop {number} day - Temperature during the day
 * @prop {number} night - Temperature at night
 * @prop {string} description - What can we see outside right now
 */

/**
 * @typedef {Object[]} WeatherComHour
 * @prop {number} timestamp - Hourly forecast timestamp
 * @prop {number} temp - Forecasted temperature
 * @prop {string} rain - Forecasted chance of rain
 * @prop {string} description - What we might see outside
 */

/**
 * @typedef {Object[]} WeatherComDay
 * @prop {number} timestamp - Daily forecast timestamp
 * @prop {number} day - Forecasted temperature for the day
 * @prop {number} night - Forecasted temperature for the night
 * @prop {string} rain - Forecasted chance of rain
 * @prop {string} description - What we might see outside
 */

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url)
		const unit = url.searchParams.get('unit') ?? 'm'
		const get = url.searchParams.get('get') ?? 'today'
		const lat = url.searchParams.get('lat')
		const lon = url.searchParams.get('lon')
		const id = url.searchParams.get('id')

		if (!get.match(/hour|day|today|/)) {
			const error = 'Wrong weather request, either "today" or "hour"'
			return new Response(error, { status: 400 })
		}

		const placeId = id ?? (await getPlaceIdFromCoords(lat, lon))
		const html = await getWeatherHTML(placeId, get, unit)
		let json

		if (get === 'today') json = parseToday(html)
		if (get === 'hour') json = parseHour(html)
		if (get === 'day') json = parseTenDay(html)

		return new Response(JSON.stringify(json), {
			headers: { 'content-type': 'application/json' },
		})
	},
}

// Parse

/**
 * Use the HTML body from "weather.com/weather/today"
 * @param {string} html
 * @returns {WeatherComToday}
 */
function parseToday(html) {
	/** @type {WeatherComToday} */
	let result = {}

	let primary = html.slice(
		html.indexOf('CurrentConditions--primary--'),
		html.indexOf('CurrentConditions--secondary--')
	)

	let feels = html.slice(
		html.indexOf('TodayDetailsCard--feelsLikeTempValue--'),
		html.indexOf('TodayDetailsCard--detailsContainer--')
	)

	primary = primary.slice(primary.indexOf('">') + 2)
	feels = feels.slice(feels.indexOf('">') + 2)

	primary = striptags(primary)
	feels = striptags(feels)

	result.current = parseInt(primary.slice(0, primary.indexOf('°')))
	result.feels = parseInt(feels.replace('°', ''))
	result.day = parseInt(primary.slice(primary.indexOf('Day') + 4, primary.indexOf('° ')))
	result.night = parseInt(primary.slice(primary.indexOf('Night') + 6))
	result.description = primary.slice(primary.indexOf('°') + 1, primary.indexOf('Day'))

	return result
}

/**
 * Use the HTML body from "weather.com/weather/hourbyhour"
 * @param {string} html
 * @returns {WeatherComHour}
 */
function parseHour(html) {
	let date = new Date()

	/** @type {WeatherComHour} */
	let result = []

	html = html.slice(
		html.indexOf('HourlyForecast--DisclosureList--'),
		html.indexOf('HourlyForecast--footerButton--')
	)

	date.getMinutes(0)
	date.getSeconds(0)
	date.getMilliseconds(0)

	for (let summary of html.split('<summary')) {
		summary = summary.slice(summary.indexOf('">') + 2, summary.indexOf('</summary>'))
		summary = striptags(summary, undefined, '\n')

		const matches = (val) => val !== '' && !val.includes('Arrow')
		const arr = summary.split('\n').filter(matches)

		const timestamp = date.getTime()
		const description = arr[1]
		const temp = parseInt(arr[2])
		const rain = arr[5]
		const isNumberTemp = Number.isNaN(temp) === false

		if (timestamp && description && rain && isNumberTemp) {
			date.setHours(date.getHours() + 1)

			result.push({
				timestamp,
				description,
				temp,
				rain,
			})
		}
	}

	return result
}

/**
 * Use the HTML body from "weather.com/weather/tenday"
 * @param {string} html
 * @returns {WeatherComDay}
 */
function parseTenDay(html) {
	let date = new Date()

	/** @type {WeatherComDay} */
	let result = []

	html = html.slice(
		html.indexOf('DailyForecast--DisclosureList--'),
		html.indexOf('DynamicMap--dynamicMapContainer--')
	)

	date.getMinutes(0)
	date.getSeconds(0)
	date.getMilliseconds(0)

	for (let summary of html.split('<summary')) {
		summary = summary.slice(summary.indexOf('">') + 2, summary.indexOf('</summary>'))
		summary = striptags(summary, undefined, '\n')

		const matches = (v) => v !== '' && v !== '/' && v !== '°' && !v.includes('Arrow')
		const arr = summary.split('\n').filter(matches)

		const timestamp = date.getTime()
		const description = arr[1]
		const day = parseInt(arr[2])
		const night = parseInt(arr[3])
		const rain = arr[5]
		const isNumberDay = Number.isNaN(day) === false
		const isNumberNight = Number.isNaN(night) === false

		if (timestamp && description && rain && isNumberDay && isNumberNight) {
			date.setDate(date.getDate() + 1)

			result.push({
				timestamp,
				description,
				day,
				night,
				rain,
			})
		}
	}

	return result
}

// Requests

/**
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string>}
 */
async function getPlaceIdFromCoords(lat, lon) {
	const post = [
		{
			name: 'getSunV3LocationSearchUrlConfig',
			params: {
				query: `${lat}, ${lon}`,
				language: 'en-US',
				locationType: 'locale',
			},
		},
	]

	const resp = await fetch('https://weather.com/api/v1/p/redux-dal', {
		method: 'POST',
		body: JSON.stringify(post),
		headers: {
			'content-type': 'application/json',
		},
	})

	if (resp.status !== 200) {
		throw 'Cannot get weather.com API, code: ' + resp.status
	}

	const json = await resp.json()
	const data = Object.values(json.dal.getSunV3LocationSearchUrlConfig)[0].data
	const placeId = data.location.placeId[0]

	return placeId
}

/**
 * Return weather.com HTML page with all the necessery information
 *
 * @param {string} id - Place ID used by weather.com to store each locations
 * @param {"m" | "f"} unit - Celsius or Farenheit, they use metric or football fields
 * @param {"today" | "hour" | "day"} type - Types of weather, using a smaller naming as their site
 * @returns {Promise<string>}
 */
async function getWeatherHTML(id, type, unit) {
	if (type === 'day') type = 'tenday'
	if (type === 'hour') type = 'hourbyhour'

	const path = `https://weather.com/weather/${type}/l/${id}?unit=${unit}`
	const firefoxAndroid = 'Mozilla/5.0 (Android 14; Mobile; rv:109.0) Gecko/124.0 Firefox/124.0'

	const resp = await fetch(path, {
		headers: {
			'Accept-Language': 'en,en-US;q=0.9',
			'User-Agent': firefoxAndroid,
		},
	})

	const text = await resp.text()

	return text.slice(text.indexOf('</head>'), text.indexOf('</main>'))
}
