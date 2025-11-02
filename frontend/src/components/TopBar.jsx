import { useState } from 'react'

export function TopBar({ onSearch }) {
  const [query, setQuery] = useState('')

  const submit = (event) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    onSearch?.(trimmed)
  }

  return (
    <header className="topbar">
      <div className="brand">NovaSens</div>
      <form className="search" onSubmit={submit} role="search">
        <input
          type="search"
          placeholder="Search a place..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search places"
        />
        <button type="submit">Search</button>
      </form>
    </header>
  )
}
