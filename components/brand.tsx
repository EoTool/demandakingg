import Image from "next/image"

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand${compact ? " brand-compact" : ""}`} aria-label="KINGG, Addex Company">
      <span className="brand-mark-frame">
        <Image src="/kingg-mark.svg" alt="" aria-hidden="true" width={32} height={32} priority />
      </span>
      <span className="brand-word-stack">
        <span className="brand-word">KINGG</span>
        {!compact && <span className="brand-caption">ADDEX COMPANY</span>}
      </span>
    </div>
  )
}
