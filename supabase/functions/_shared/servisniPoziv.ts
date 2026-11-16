// Edge funkcije koje pokreće samo cron: anon ključ je takođe važeći JWT, pa sam
// verify_jwt ne sprečava da ih pozove bilo ko sa javnim ključem.
export function servisniPozivJeDozvoljen(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
): boolean {
  const authorization = req.headers.get('authorization')
  if (authorization === `Bearer ${serviceRoleKey}`) return true
  if (!authorization?.startsWith('Bearer ')) return false

  try {
    const token = authorization.slice(7)
    const payloadSegment = token.split('.')[1]
    if (!payloadSegment) return false

    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]

    // Gateway sa uključenim verify_jwt prethodno proverava potpis ovog tokena.
    return payload.role === 'service_role' && payload.ref === projectRef
  } catch {
    return false
  }
}
