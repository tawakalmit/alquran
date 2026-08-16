import express from 'express'

const app = express()
const PORT = process.env.PORT || 7777
const ORIGIN = 'https://alquran.tawakalmit.my.id'

app.get('/proxy/surah/:id', async (req, res) => {
  const id = req.params.id
  const url = `${ORIGIN}/surah/${encodeURIComponent(id)}`
  try {
    const response = await fetch(url, {cache: 'no-store'})
    // copy status
    res.status(response.status)
    // copy selected headers
    response.headers.forEach((value, name) => {
      // prevent hop-by-hop headers from being forwarded
      if (['transfer-encoding', 'content-encoding', 'content-length', 'connection'].includes(name)) return
      res.setHeader(name, value)
    })
    // stream body
    const body = await response.arrayBuffer()
    res.send(Buffer.from(body))
  } catch (err) {
    console.error('Proxy fetch failed:', err)
    res.status(502).send({error: 'Bad Gateway', detail: String(err)})
  }
})

app.listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`))
