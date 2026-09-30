import { execFile } from 'child_process'

// Localisation du poste (gestion des présences : position de l'établissement dans Paramètres, et
// pointage à la connexion). `navigator.geolocation` ne fonctionne pas dans Electron sans clé
// d'API Google : on interroge directement le service de localisation de Windows (Wi-Fi/GPS, via
// PowerShell et System.Device), puis, à défaut, une localisation approximative par l'adresse IP.

export type LocationResult =
  | { ok: true; latitude: number; longitude: number; accuracyMeters: number | null; source: 'windows' | 'ip' }
  | { ok: false; error: string }

const WINDOWS_SCRIPT = `
Add-Type -AssemblyName System.Device
$w = New-Object System.Device.Location.GeoCoordinateWatcher([System.Device.Location.GeoPositionAccuracy]::High)
$w.Start()
$sw = [Diagnostics.Stopwatch]::StartNew()
while (($w.Status -ne 'Ready') -and ($w.Permission -ne 'Denied') -and ($sw.Elapsed.TotalSeconds -lt 12)) { Start-Sleep -Milliseconds 200 }
$loc = $w.Position.Location
$c = [Globalization.CultureInfo]::InvariantCulture
if ($w.Status -eq 'Ready' -and -not $loc.IsUnknown) { 'OK;' + $loc.Latitude.ToString($c) + ';' + $loc.Longitude.ToString($c) + ';' + $loc.HorizontalAccuracy.ToString($c) } else { 'FAIL;' + $w.Status + ';' + $w.Permission }
$w.Stop()
`

function fromWindows(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ ok: false, error: 'Service de localisation Windows indisponible.' })
      return
    }
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', WINDOWS_SCRIPT],
      { timeout: 20000, windowsHide: true },
      (error, stdout) => {
        const line = String(stdout ?? '').trim().split(/\r?\n/).pop() ?? ''
        const [status, lat, lon, accuracy] = line.split(';')
        if (error || status !== 'OK') {
          const denied = line.includes('Denied')
          resolve({
            ok: false,
            error: denied
              ? 'Localisation refusée : activez « Localisation » dans les paramètres de confidentialité de Windows.'
              : 'Le service de localisation de Windows ne répond pas.'
          })
          return
        }
        const accuracyValue = Number(accuracy)
        resolve({
          ok: true,
          latitude: Number(lat),
          longitude: Number(lon),
          accuracyMeters: Number.isFinite(accuracyValue) ? Math.round(accuracyValue) : null,
          source: 'windows'
        })
      }
    )
  })
}

async function fromIp(): Promise<LocationResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch('https://ipwho.is/', { signal: controller.signal })
    const body = (await response.json()) as { success?: boolean; latitude?: number; longitude?: number }
    if (!body.success || typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      return { ok: false, error: 'Localisation par Internet indisponible.' }
    }
    return { ok: true, latitude: body.latitude, longitude: body.longitude, accuracyMeters: null, source: 'ip' }
  } catch {
    return { ok: false, error: 'Localisation impossible (pas de connexion Internet).' }
  } finally {
    clearTimeout(timeout)
  }
}

export async function getCurrentLocation(): Promise<LocationResult> {
  const windows = await fromWindows()
  if (windows.ok) return windows
  const ip = await fromIp()
  return ip.ok ? ip : windows
}
