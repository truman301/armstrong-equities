import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRoleBySlug, type Role } from '@/lib/roles'

// POST /api/firm/activate -- activate a role for real.
//
// Writes .claude/agents/<slug>.md to the firm repo on main via the GitHub
// Contents API, inserts a proposed_hires row with status='active', and
// returns the commit SHA. The /agents floor then renders the new hire at
// full color (not ghost).
//
// This route is gated by session auth (it's called from the authed UI),
// not the firm bearer token. The endpoint itself uses
// FIRM_REPO_GITHUB_TOKEN to write to the firm repo.
export const dynamic = 'force-dynamic'

const FIRM_REPO_OWNER = 'truman301'
const FIRM_REPO_NAME = 'armstrong-equities-firm'

function buildAgentMarkdown(role: Role): string {
  // YAML frontmatter description has to be a single line or a block scalar.
  // We collapse newlines for safety; the body carries the long-form prose.
  const yamlDesc = role.pitch.replace(/\s+/g, ' ').trim()
  return `---
name: ${role.slug}
description: >
  ${yamlDesc}
tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch
model: opus
---

# You are the ${role.name}.

${role.description.trim()}
`
}

type CommitResult =
  | { ok: true; sha: string | null }
  | { ok: false; error: string }

async function commitAgentFile(
  slug: string,
  content: string,
): Promise<CommitResult> {
  const token = process.env.FIRM_REPO_GITHUB_TOKEN
  if (!token) {
    return { ok: false, error: 'FIRM_REPO_GITHUB_TOKEN not set on the server.' }
  }

  const path = `.claude/agents/${slug}.md`
  const url = `https://api.github.com/repos/${FIRM_REPO_OWNER}/${FIRM_REPO_NAME}/contents/${path}`

  // Refuse to overwrite an existing file.
  const checkRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  })
  if (checkRes.status === 200) {
    return {
      ok: false,
      error: `An agent file already exists at ${path}. This role looks already activated.`,
    }
  }
  if (checkRes.status !== 404) {
    const text = await checkRes.text()
    return {
      ok: false,
      error: `GitHub check failed (${checkRes.status}): ${text.slice(0, 200)}`,
    }
  }

  const b64 = Buffer.from(content, 'utf8').toString('base64')
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Activate role: ${slug}`,
      content: b64,
      branch: 'main',
    }),
  })
  if (!putRes.ok) {
    const text = await putRes.text()
    return {
      ok: false,
      error: `GitHub commit failed (${putRes.status}): ${text.slice(0, 200)}`,
    }
  }
  const data = (await putRes.json()) as { commit?: { sha?: string } }
  return { ok: true, sha: data.commit?.sha ?? null }
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const roleSlug = typeof body.role_slug === 'string' ? body.role_slug.trim() : ''
  const customDescription =
    typeof body.description === 'string' ? body.description.trim() : ''
  if (!roleSlug) {
    return NextResponse.json({ error: 'role_slug is required' }, { status: 400 })
  }

  const role = getRoleBySlug(roleSlug)
  if (!role) {
    return NextResponse.json(
      { error: `Unknown role slug: ${roleSlug}` },
      { status: 400 },
    )
  }

  const effectiveRole: Role = customDescription
    ? { ...role, description: customDescription }
    : role
  const markdown = buildAgentMarkdown(effectiveRole)

  const commit = await commitAgentFile(role.slug, markdown)
  if (!commit.ok) {
    return NextResponse.json({ error: commit.error }, { status: 500 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('proposed_hires')
    .insert({
      role_slug: role.slug,
      role_name: role.name,
      pitch: role.pitch,
      description: effectiveRole.description,
      status: 'active',
    })
    .select('id')
    .single()
  if (error) {
    // The agent file is in the firm repo at this point; the row insert
    // failed. Surface both pieces so Truman can reconcile by hand.
    return NextResponse.json(
      {
        error: `Agent file committed but DB insert failed: ${error.message}`,
        commit_sha: commit.sha,
        agent_file_path: `.claude/agents/${role.slug}.md`,
      },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      ok: true,
      hire_id: data.id,
      role_slug: role.slug,
      role_name: role.name,
      commit_sha: commit.sha,
      agent_file_path: `.claude/agents/${role.slug}.md`,
    },
    { status: 201 },
  )
}
