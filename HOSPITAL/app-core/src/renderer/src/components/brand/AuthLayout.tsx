import { useEffect, useState, type ReactNode } from 'react'
import logo from '../../assets/pandora_health_logo.png'

// Écrans de marque (connexion, activation du poste) — identité « Néon clinique »
// (HOSPITAL/Plan-Refonte-Graphique.md) : toujours sombres, quel que soit le thème choisi. Fond encre
// avec halo vert, logo entouré de son orbite dorée, pouls ECG qui défile en bas de l'écran.

const ECG_PATH =
  'M0 35 H120 L132 35 L140 22 L148 35 H170 L180 35 L188 6 L198 62 L206 35 H240 L252 28 L262 35 ' +
  'H520 L532 35 L540 22 L548 35 H570 L580 35 L588 6 L598 62 L606 35 H640 L652 28 L662 35 ' +
  'H920 L932 35 L940 22 L948 35 H970 L980 35 L988 6 L998 62 L1006 35 H1040 L1052 28 L1062 35 H1200'

export function OrbitLogo({ size = 168 }: { size?: number }): JSX.Element {
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <img
        src={logo}
        alt="Pandora Health"
        className="rounded-[28px] shadow-[0_0_60px_rgba(52,204,107,0.35)]"
        style={{ width: size * 0.76 }}
      />
      <span className="animate-orbit absolute -inset-1.5 rounded-full border-[1.5px] border-transparent border-t-gold-500 border-r-gold-500/35">
        <span className="absolute right-3.5 top-3.5 h-2.5 w-2.5 rounded-full bg-[#34cc6b] shadow-[0_0_12px_#34cc6b]" />
      </span>
    </div>
  )
}

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps): JSX.Element {
  const [hospitalName, setHospitalName] = useState<string | null>(null)

  useEffect(() => {
    window.api.setup
      .getActivation()
      .then((info) => setHospitalName(info.hospitalName))
      .catch(() => undefined)
  }, [])

  return (
    <div className="relative flex min-h-screen w-full items-center overflow-hidden bg-ink-950 bg-[radial-gradient(900px_480px_at_28%_42%,#0d2a19_0%,#060c09_62%)] px-6 py-10 text-[#d3e0d8]">
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-6 h-[70px] w-full opacity-55"
        viewBox="0 0 1200 70"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="animate-ecg"
          d={ECG_PATH}
          fill="none"
          stroke="#34cc6b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 4px #34cc6b)' }}
        />
      </svg>

      <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="hidden flex-col items-start gap-6 lg:flex">
          <OrbitLogo />
          <h1 className="text-[40px] font-extrabold leading-[1.1] text-white">
            Pandora <span className="text-[#34cc6b]">Health</span>
          </h1>
          <p className="max-w-[38ch] text-[15px] text-[#8fa398]">
            La gestion hospitalière complète, même hors connexion.
          </p>
          {hospitalName && (
            <p className="flex items-center gap-2 text-xs text-[#8fa398]">
              <span className="animate-pulse-dot h-[7px] w-[7px] rounded-full bg-[#34cc6b]" />
              {hospitalName}
            </p>
          )}
        </div>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <OrbitLogo size={120} />
            <p className="font-display text-2xl font-extrabold text-white">
              Pandora <span className="text-[#34cc6b]">Health</span>
            </p>
          </div>
          <div className="rounded-[20px] border border-white/[0.08] bg-[rgba(13,24,18,0.72)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Styles partagés des champs et boutons des écrans de marque (fond toujours sombre). */
export const authInputClass =
  'w-full rounded-[10px] border border-[#1b2b22] bg-[#08120d] px-3 py-2.5 text-sm text-white placeholder:text-[#5d6f65] focus:border-[#34cc6b] focus:outline-none focus:ring-4 focus:ring-[#34cc6b]/15'

export const authLabelClass = 'mb-1.5 block text-xs font-medium text-[#d3e0d8]'

export const authButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-b from-[#45d97a] to-[#22b85a] px-4 py-3 text-sm font-semibold text-[#03140a] shadow-[0_8px_24px_rgba(52,204,107,0.25)] transition-shadow hover:shadow-[0_8px_30px_rgba(52,204,107,0.45)] disabled:cursor-not-allowed disabled:opacity-60'

export const authErrorClass = 'rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-[#fca5a5]'
