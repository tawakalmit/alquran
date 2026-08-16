const ORIGIN = 'https://alquran.tawakalmit.my.id'

export default async function handler(req, res) {
  const { id } = req.query
  const url = `${ORIGIN}/surah/${encodeURIComponent(id)}`

  try {
    const response = await fetch(url, { cache: 'no-store' })
    // forward status
    res.status(response.status)

    // copy headers except hop-by-hop
    response.headers.forEach((value, name) => {
      if (['transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'upgrade'].includes(name)) return
      res.setHeader(name, value)
    })

    const buffer = await response.arrayBuffer()
    res.send(Buffer.from(buffer))
  } catch (err) {
    console.error('proxy error', err)
    res.status(502).json({ error: 'bad_gateway', detail: String(err) })
  }
}
