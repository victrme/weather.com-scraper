import striptags from 'striptags'

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url)
		const unit = url.searchParams.get('unit') ?? 'm'
		const get = url.searchParams.get('get') ?? 'today'
		const lat = url.searchParams.get('lat')
		const lon = url.searchParams.get('lon')

		const placeId = await getPlaceIdFromCoords(lat, lon)
		const type = get === 'hour' ? 'hourbyhour' : 'today'
		const path = `https://weather.com/weather/${type}/l/${placeId}?unit=${unit}`
		const iPhoneUserAgent = `Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_1 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8B117 Safari/6531.22.7 (compatible; Googlebot-Mobile/2.1; +http://www.google.com/bot.html)`
		const resp = await fetch(path, { headers: { 'User-Agent': iPhoneUserAgent } })
		let html = await resp.text()

		html = html.slice(html.indexOf('</head>'))
		html = html.slice(0, html.indexOf('</main>'))

		if (get === 'today') {
			html = html.slice(html.indexOf('CurrentConditions--body--'))
			html = html.slice(html.indexOf('">') + 2)
			html = html.slice(0, html.indexOf('CurrentConditions--secondary--'))

			html = striptags(html)

			const result = {
				now: parseInt(html.slice(0, html.indexOf('°'))),
				day: parseInt(html.slice(html.indexOf('Day') + 4, html.indexOf('° '))),
				night: parseInt(html.slice(html.indexOf('Night') + 6)),
				description: html.slice(html.indexOf('°') + 1, html.indexOf('Day')),
			}

			return new Response(JSON.stringify(result), {
				headers: { 'content-type': 'application/json' },
			})
		}

		if (get === 'hour') {
			//
		}

		return new Response('Not implemented yet')
	},
}

/**
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string>}
 */
async function getPlaceIdFromCoords(lat, lon) {
	const body = `[{"name":"getSunV3LocationSearchUrlConfig","params":{"query":"${lat}, ${lon}","language":"en-US","locationType":"locale"}}]`

	const resp = await fetch('https://weather.com/api/v1/p/redux-dal', {
		method: 'POST',
		body: body,
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
