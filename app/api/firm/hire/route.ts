import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Hire endpoint called by the /agents page's New Hire flow. Inserts a row in
// proposed_hires; the page renders these as pending agents on the floor.
//
// No bearer auth: this is invoked from the same-origin browser UI. The
// downside is anyone with the URL can POST garbage; mitigated by Truman
// being able to flip status to 'declined' or delete rows in the table.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const roleSlug = typeof body.role_slug === 'string' ? body.role_slug.trim() : ''
  const roleName = typeof body.role_name === 'string' ? body.role_name.trim() : ''
  const pitch = typeof body.pitch === 'string' ? body.pitch : null
  const description =
    typeof body.description === 'string' ? body.description.trim() : ''

  if (!roleSlug || !roleName || !description) {
    return Response.json(
      { error: 'role_slug, role_name, and description are required' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('proposed_hires')
    .insert({
      role_slug: roleSlug,
      role_name: roleName,
      pitch,
      description,
    })
    .select('id')
    .single()
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, hire_id: data.id }, { status: 201 })
}
