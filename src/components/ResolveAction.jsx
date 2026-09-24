import { useState } from 'react'

export default function ResolveAction({ anomalyId, onResolve }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  async function handleResolve() {
    setPending(true)
    setError(null)
    try {
      await onResolve(anomalyId)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button type="button" className="button button-small" onClick={handleResolve} disabled={pending}>
        {pending ? 'En cours…' : 'Marquer comme résolu'}
      </button>
      {error && (
        <span className="inline-error" role="alert">
          {error}
        </span>
      )}
    </>
  )
}
