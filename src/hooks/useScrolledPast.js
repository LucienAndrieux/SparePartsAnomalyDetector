import { useEffect, useState } from 'react'

/**
 * Vrai quand `element` est entièrement remonté au-dessus de la ligne située à `topOffset`
 * pixels du haut de la fenêtre (sous la barre du haut, par exemple).
 * Reste faux si l'élément est absent ou si IntersectionObserver n'existe pas.
 */
export function useScrolledPast(element, topOffset = 0) {
  const [scrolledPast, setScrolledPast] = useState(false)

  useEffect(() => {
    if (!element || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      ([entry]) => setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < topOffset),
      { rootMargin: `-${topOffset}px 0px 0px 0px` },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      setScrolledPast(false)
    }
  }, [element, topOffset])

  return scrolledPast
}
