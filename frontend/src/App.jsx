import { useState } from "react"

import hyperchargeIcon from "./hypercharge.png"

function UnlockIcon({ id, owned, type, name }) {
  const urls = {
    gadget: `https://brawlify.com/images/gadgets/${id}.png`,
    starpower: `https://brawlify.com/images/star-powers/${id}.png`,
    gear: `https://cdn.brawlify.com/gears/regular/${id}.png`,
  }

  const ownedColor = type === "gadget"
    ? "bg-green-400 text-gray-900"
    : type === "starpower"
    ? "bg-yellow-400 text-gray-900"
    : "bg-blue-400 text-gray-900"

  return (
    <div title={name} className="relative w-7 h-7">
      <img
        src={urls[type]}
        alt={name}
        className={`w-full h-full object-contain ${!owned ? "opacity-30 grayscale" : ""}`}
        onError={e => {
          e.target.style.display = "none"
          e.target.nextSibling.style.display = "flex"
        }}
      />
      <div
        style={{ display: "none" }}
        className={`w-full h-full rounded-full items-center justify-center text-xs ${owned ? ownedColor : "bg-gray-600 text-gray-400"}`}
        title={name}
      >
        ?
      </div>
    </div>
  )
}

function HyperchargeIndicator({ allHC, ownedHC }) {
  const hasInGame = allHC.length > 0
  const owned = ownedHC.length > 0

  return (
    <div className="flex flex-col gap-1 items-center">
      <span className="text-gray-500 text-xs">HC</span>
      <img
        src={hyperchargeIcon}
        alt="Hypercharge"
        title={hasInGame ? (owned ? allHC[0]?.name : `Missing: ${allHC[0]?.name}`) : "No hypercharge"}
        className={`w-7 h-7 object-contain ${!hasInGame || !owned ? "opacity-20 grayscale" : ""}`}
      />
    </div>
  )
}

function BrawlerCard({ b }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
      <div className="flex justify-between items-start p-2 pb-0">
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-xs">Gadgets</span>
          <div className="flex gap-1">
            {b.allGadgets.map(item => (
              <UnlockIcon
                key={item.id}
                id={item.id}
                owned={b.ownedGadgets.includes(item.id)}
                type="gadget"
                name={item.name}
              />
            ))}
          </div>
        </div>
        <HyperchargeIndicator allHC={b.allHyperCharges} ownedHC={b.ownedHyperCharges} />
      </div>

      <div className="flex flex-col items-center px-2 py-1">
        {b.icon && (
          <img src={b.icon} alt={b.name} className="w-16 h-16 object-contain" />
        )}
        <p className="font-semibold text-sm text-white">{b.name}</p>
        <p className="text-yellow-400 text-xs">{b.trophies} 🏆</p>
        <p className="text-gray-400 text-xs">Power {b.power}</p>
        <p className="text-white font-bold text-sm mt-1">Score: {b.displayScore}</p>
      </div>

      <div className="flex justify-between items-end p-2 pt-0">
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-xs">Star Powers</span>
          <div className="flex gap-1">
            {b.allStarPowers.map(item => (
              <UnlockIcon
                key={item.id}
                id={item.id}
                owned={b.ownedStarPowers.includes(item.id)}
                type="starpower"
                name={item.name}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-gray-500 text-xs">Gears</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {b.allGears.map(item => (
              <UnlockIcon
                key={item.id}
                id={item.id}
                owned={b.ownedGears.includes(item.id)}
                type="gear"
                name={item.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [tag, setTag] = useState("")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPlayer = async () => {
    if (!tag) return
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const response = await fetch(`http://localhost:8000/player/${tag}`)
      if (!response.ok) throw new Error("Player not found — check your tag")
      const json = await response.json()
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchPlayer()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Brawl Stars Trophy Optimizer</h1>
      <p className="text-gray-400 mb-6">Enter your player tag to find your best brawlers</p>

      <div className="flex gap-3 mb-8">
        <input
          type="text"
          placeholder="#2LOPOGVJJL"
          value={tag}
          onChange={e => setTag(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 w-64 focus:outline-none focus:border-yellow-400"
        />
        <button
          onClick={fetchPlayer}
          className="bg-yellow-400 text-gray-950 font-bold px-6 py-2 rounded-lg hover:bg-yellow-300 transition"
        >
          Search
        </button>
      </div>

      {loading && <p className="text-gray-400">Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {data && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{data.name} — {data.tag}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data.brawlers.map(b => (
              <BrawlerCard key={b.id} b={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App