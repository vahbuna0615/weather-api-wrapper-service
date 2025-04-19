const express = require('express');
const app = express();
const axios = require('axios');
const redis = require('redis');
const { errorHandler } = require('./middleware/error-handling.middleware');
require('dotenv').config()

const { PORT: port, REDIS_URL: redis_url,  VISUAL_CROSSING_BASE_URL: url, VISUAL_CROSSING_API_KEY: apiKey } = process.env

const redisClient = redis.createClient({
  url: redis_url
});

app.listen(port, () => {
  console.log("Server running")
})

app.get('/', (req, res, next) => {
  res.json("Weather API Wrapper Service")
})

app.get('/forecast', async (req, res, next) => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect()
    }
    const { location } = req.query
    const existingData = await redisClient.get(location)
    if (existingData) {
      await redisClient.disconnect()
      return res.status(200).json(JSON.parse(existingData))
    }
    const requestUrl = `${url}/${location}`
    const response = await axios.post(requestUrl, null, {
      params: {
        key: apiKey
      }
    })
    await redisClient.set(location, JSON.stringify(response.data), 'EX', 3600)
    await redisClient.disconnect()
    return res.status(200).json(response.data)
  } catch (err) {
    await redisClient.disconnect()
    next(err)
  }
})

app.use(errorHandler)