import { useState } from 'react'

function App(): JSX.Element {
  const [count, setCount] = useState(0)

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1>Pandora One — Core</h1>
      <p>Socle commun de l'application (Electron + React + TypeScript).</p>
      <button onClick={() => setCount((c) => c + 1)}>Compteur : {count}</button>
    </div>
  )
}

export default App
