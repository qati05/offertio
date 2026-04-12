$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $projectRoot ".env.local"
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^[^#][^=]*=') {
    $parts = $_ -split '=', 2
    [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process')
  }
}

$script = @'
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

(async () => {
  const runId = Date.now();
  const email = `auth-smoke-${runId}@example.com`;
  const password = `AuthSmoke!${runId}`;
  let userId = null;

  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;
    console.log("createUser:ok");

    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error) throw login.error;
    console.log("passwordLogin:ok");

    const profile = await client.from("profiles").upsert({
      id: userId,
      email,
      land: "CH",
      sprache: "de",
      firmenname: "Smoke Test GmbH",
      beruf: "Handwerk / Bau",
      vorname: "Smoke",
      zahlungsfrist: 30,
      onboarding_complete: false,
      plan: "free"
    }, { onConflict: "id" });
    if (profile.error) throw profile.error;
    console.log("profileUpsert:ok");
  } finally {
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
      console.log("cleanupUser:ok");
    }
  }
})().catch((err) => {
  console.error("AUTH_SMOKE_FAILED:" + err.message);
  process.exit(1);
});
'@

$script | node -
