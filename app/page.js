'use client'
import { useState } from 'react'
import io from 'socket.io-client'

const ROLES_HELP = `OLOMBELONA, OMBIASY, MPAMOSAVY, MPIANDRY_OMBY,
ZAZA_ADALA, KAMBANA, LOLONDRANO,
JAOMARENGA, TRIMO, IKAKY_BE_MASO`

const PRESETS = {
  6: 'OLOMBELONA,OMBIASY,MPAMOSAVY,JAOMARENGA,TRIMO,IKAKY_BE_MASO',
  8: 'OLOMBELONA,OLOMBELONA,OLOMBELONA,OMBIASY,MPAMOSAVY,ZAZA_ADALA,JAOMARENGA,TRIMO',
  8_L: 'OLOMBELONA,OLOMBELONA,OMBIASY,MPAMOSAVY,ZAZA_ADALA,LOLONDRANO,JAOMARENGA,TRIMO',
  10: 'OLOMBELONA,OLOMBELONA,OLOMBELONA,OLOMBELONA,OMBIASY,MPAMOSAVY,ZAZA_ADALA,KAMBANA,JAOMARENGA,IKAKY_BE_MASO',
  12: 'OLOMBELONA,OLOMBELONA,OLOMBELONA,OLOMBELONA,OLOMBELONA,OLOMBELONA,OMBIASY,MPAMOSAVY,ZAZA_ADALA,KAMBANA,TRIMO,JAOMARENGA'
}

export default function Home(){
  const [code,setCode]=useState('')
  const [name,setName]=useState('')
  const [socket,setSocket]=useState(null)
  const [phase,setPhase]=useState('LOBBY')
  const [players,setPlayers]=useState([])
  const [role,setRole]=useState(null)
  const [serverUrl,setServerUrl]=useState('') // ex: https://ton-api.onrender.com
  const [room,setRoom]=useState(null)
  const [votes,setVotes]=useState({})
  const [deaths,setDeaths]=useState([])
  const [comp,setComp]=useState('')

  function connect(){
    if(!serverUrl) return alert('Entre l\'URL du serveur Render/Railway.')
    const s = io(serverUrl, { transports:['websocket'] })
    setSocket(s)
    s.on('room:update', (r)=> setPlayers(r?.players||[]))
    s.on('phase:change', ({phase})=> setPhase(phase))
    s.on('dm:role', ({role})=> setRole(role))
    s.on('system:nightResult', ({deaths})=> setDeaths(deaths||[]))
    s.on('vote:update', setVotes)
    s.on('system:end', (res)=> alert('Fin de partie — Gagnants: '+res.winner))
    s.on('connect_error', (e)=> alert('Connexion impossible: '+e.message))
  }

  function createRoom(){
    if(!socket) return alert('Connecte d’abord au serveur ci-dessus.')
    socket.emit('room:create', {options:{}}, ({code})=>{
      setRoom(code); setCode(code)
    })
  }
  function joinRoom(){
    if(!socket) return alert('Connecte d’abord au serveur ci-dessus.')
    if(!code) return alert('Entre un code de salle.')
    socket.emit('room:join', {code, name:name||'Anona'}, (res)=>{})
  }

  function setPreset(n, withLolo=false){
    if(n===8 && withLolo) setComp(PRESETS['8_L'])
    else setComp(PRESETS[n] || '')
  }

  function adaptToPlayers(){
    const n = players.length
    if(n===6) return setPreset(6)
    if(n===8) return setPreset(8)
    if(n===10) return setPreset(10)
    if(n===12) return setPreset(12)
    alert(`Aucun preset prévu pour ${n} joueur(s). Utilise 6/8/10/12 ou édite à la main.`)
  }

  function startGame(){
    if(!socket) return alert('Connecte d’abord au serveur.')
    if(!code) return alert('Pas de salle. Clique “Créer” ou “Rejoindre”.')
    const arr = comp.split(',').map(s=>s.trim()).filter(Boolean)
    if(arr.length !== players.length){
      const ok = confirm(
        `Tu as ${players.length} joueur(s) mais ${arr.length} rôle(s).\n` +
        `Continuer ? (cela échouera côté serveur)`
      )
      if(!ok) return
    }
    socket.emit('game:start', {code, composition:arr}, (res)=>{
      if(res?.error) alert(res.error)
    })
  }

  function advance(){ socket?.emit('phase:advance',{code}) }
  function vote(targetId){ socket?.emit('vote:cast',{code, targetId}) }

  return (
    <div>
      <p>1) Renseigne l’URL du serveur (Render/Railway) puis clique « Se connecter ».</p>
      <input style={{width:'100%',maxWidth:500}} placeholder="https://ton-api.onrender.com" value={serverUrl} onChange={e=>setServerUrl(e.target.value)} />
      <button onClick={connect}>Se connecter</button>
      <hr/>
      <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
        <input placeholder="Code salle" value={code} onChange={e=>setCode(e.target.value)} />
        <input placeholder="Votre pseudo" value={name} onChange={e=>setName(e.target.value)} />
        <button onClick={createRoom}>Créer</button>
        <button onClick={joinRoom}>Rejoindre</button>
      </div>

      <p>Phase: <b>{phase}</b> — Salle: <b>{room||code||'-'}</b> — Rôle: <b>{role||'-'}</b></p>

      <div style={{border:'1px solid #ddd', padding:12, borderRadius:8, maxWidth:800}}>
        <h3>Composition des rôles</h3>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', margin:'8px 0'}}>
          <button onClick={()=>setPreset(6)}>Preset 6</button>
          <button onClick={()=>setPreset(8)}>Preset 8</button>
          <button onClick={()=>setPreset(8, true)}>Preset 8 (avec Lolondrano)</button>
          <button onClick={()=>setPreset(10)}>Preset 10</button>
          <button onClick={()=>setPreset(12)}>Preset 12</button>
          <button onClick={adaptToPlayers}>Adapter au nombre de joueurs ({players.length})</button>
        </div>
        <textarea
          rows={3}
          style={{width:'100%'}}
          placeholder="Liste de rôles, séparés par des virgules"
          value={comp}
          onChange={e=>setComp(e.target.value)}
        />
        <small>Rôles valides : <code>{ROLES_HELP}</code></small>
      </div>

      <div style={{marginTop:8}}>
        <button onClick={startGame}>Démarrer (hôte)</button>
        <button onClick={advance}>Avancer la phase (hôte)</button>
      </div>

      <h3>Joueurs</h3>
      <ul>{players.map(p=>(
        <li key={p.id}>
          {p.name} {p.alive? '' : '💀'}{' '}
          <button onClick={()=>vote(p.id)}>Voter contre</button>
        </li>
      ))}</ul>

      {!!deaths.length && <p>Morts cette nuit: {deaths.join(', ')}</p>}

      <details><summary>Aide — noms de rôles</summary>
        <pre>{ROLES_HELP}</pre>
      </details>
    </div>
  )
}
