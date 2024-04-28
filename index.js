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
 * @prop {number} timestamp - Forecast timestamp
 * @prop {number} temp - Forecasted temperature
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

		if (get === 'today') {
			const placeId = id ?? (await getPlaceIdFromCoords(lat, lon))
			const html = await getWeatherHTML(placeId, 'today', unit)

			const json = parseToday(html)
			const body = JSON.stringify(json)
			const headers = { 'content-type': 'application/json' }

			return new Response(body, { headers })
		}

		if (get === 'hour') {
			const placeId = id ?? (await getPlaceIdFromCoords(lat, lon))
			const html = await getWeatherHTML(placeId, 'hour', unit)

			const json = parseHour(html)
			const body = JSON.stringify(json)
			const headers = { 'content-type': 'application/json' }

			return new Response(body, { headers })
		}

		return new Response('Wrong weather request, either "today" or "hour"', {
			status: 400,
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
	/** @type {WeatherComHour} */
	let result = []
	let lasthour = 0
	let date = new Date()

	html = html.slice(
		html.indexOf('HourlyForecast--DisclosureList--'),
		html.indexOf('HourlyForecast--footerButton--')
	)

	html = html.slice(html.indexOf('">') + 2)

	for (let summary of html.split('<summary')) {
		summary = summary.slice(summary.indexOf('">') + 2, summary.indexOf('</summary>'))
		summary = striptags(summary, undefined, '\n')

		const arr = summary.split('\n').filter((val) => !!val && !val.includes('Arrow'))

		const timestamp = date.getTime()
		const description = arr[1]
		const temp = parseInt(arr[2])
		const rain = arr[5]

		if (timestamp !== undefined && temp !== undefined && description && rain) {
			result.push({ timestamp, description, temp, rain })
			date.setHours(date.getHours() + 1)
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
 * @param {"today" | "hour"} type - Types of weather, using the same name as their site
 * @returns {Promise<string>}
 */
async function getWeatherHTML(id, type, unit) {
	type = type === 'hour' ? 'hourbyhour' : 'today'

	const path = `https://weather.com/weather/${type}/l/${id}?unit=${unit}`
	const iPhoneUserAgent = `Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_1 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8B117 Safari/6531.22.7 (compatible; Googlebot-Mobile/2.1; +http://www.google.com/bot.html)`

	const resp = await fetch(path, {
		headers: {
			'Accept-Language': 'en,en-US;q=0.9',
			'User-Agent': iPhoneUserAgent,
		},
	})

	const text = await resp.text()

	return text.slice(text.indexOf('</head>'), text.indexOf('</main>'))
}
