// services/external/weatherService.js
const axios = require('axios')
const { logger } = require('../../utils/logger')

class WeatherService {
    constructor() {
        this.apiKey = process.env.OPENWEATHER_API_KEY
        this.baseUrl = 'https://api.openweathermap.org/data/2.5'
    }

    async getCurrentWeather(lat, lng) {
        try {
            if (!this.apiKey) {
                return { success: false, error: 'Weather API key not configured' }
            }

            const response = await axios.get(`${this.baseUrl}/weather`, {
                params: {
                    lat,
                    lon: lng,
                    appid: this.apiKey,
                    units: 'metric',
                },
            })

            return {
                success: true,
                data: {
                    temperature: response.data.main.temp,
                    feelsLike: response.data.main.feels_like,
                    humidity: response.data.main.humidity,
                    description: response.data.weather[0].description,
                    main: response.data.weather[0].main,
                    windSpeed: response.data.wind.speed,
                    visibility: response.data.visibility,
                    rain: response.data.rain?.['1h'] || 0,
                },
            }
        } catch (error) {
            logger.error('Get current weather error:', error)
            return { success: false, error: error.message }
        }
    }

    isRainy(weatherData) {
        return weatherData.main === 'Rain' || weatherData.rain > 0
    }

    affectsTransport(weatherData) {
        return this.isRainy(weatherData) || 
               weatherData.main === 'Thunderstorm' ||
               weatherData.windSpeed > 10
    }
}

module.exports = new WeatherService()