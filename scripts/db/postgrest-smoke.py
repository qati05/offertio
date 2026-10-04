#!/usr/bin/env python3
"""
Every database write the app performs, sent through a real PostgREST.

WHY THIS EXISTS

Offertio's browser talks to PostgREST, and PostgREST does not run the SQL you
would write by hand. A column-level REVOKE that looks right in psql can still
break the app, and nothing in the unit tests can see it, because the unit tests
never reach a database. Migration 035 is the example: it took UPDATE on
profiles.id away from the browser role "so the primary key cannot be rewritten".
PostgREST turns every upsert into

    INSERT ... ON CONFLICT (id) DO UPDATE SET ..., "id" = EXCLUDED."id", ...

so every profile upsert — onboarding, profile settings, the editor's profile
save — failed with "permission denied for table profiles". For every user.

This script replays each write the app performs, with the columns the code
sends (read out of the call sites, not invented), and it also checks that the
protective rules still hold, because a fix that opens a hole is not a fix.

It needs a running PostgREST (v12) on a database with migrations 000-040
applied, and the owner user seeded. scripts/db/README.md has the full recipe.

    PGRST_URL        default http://127.0.0.1:3300
    PGRST_JWT_SECRET must match the jwt-secret PostgREST was started with

Standard library only. Exit status 1 when any check does not behave as expected.
"""

import base64
import hashlib
import hmac
import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ.get("PGRST_URL", "http://127.0.0.1:3300")
SECRET = os.environ.get(
    "PGRST_JWT_SECRET", "super-secret-jwt-token-with-at-least-32-characters-long"
).encode()

OWNER = "11111111-1111-4111-8111-111111111111"
STRANGER = "22222222-2222-4222-8222-222222222222"


def b64(raw: bytes) -> bytes:
    return base64.urlsafe_b64encode(raw).rstrip(b"=")


def token(role: str, sub: str | None = None) -> str:
    claims = {"role": role, "aud": "authenticated", "exp": 4102444800}
    if sub:
        claims["sub"] = sub
    head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = b64(json.dumps(claims).encode())
    sig = b64(hmac.new(SECRET, head + b"." + body, hashlib.sha256).digest())
    return (head + b"." + body + b"." + sig).decode()


USER = token("authenticated", OWNER)
ADMIN = token("service_role")


def call(who: str, method: str, path: str, payload=None, prefer: str | None = None):
    headers = {"Authorization": f"Bearer {who}", "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(URL + path, method=method, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            text = resp.read().decode()
            return resp.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as err:
        text = err.read().decode()
        try:
            return err.code, json.loads(text)
        except ValueError:
            return err.code, text


results: list[tuple[bool, str, str]] = []


def check(label: str, got, expect: str, note: str = ""):
    """expect is 'ok' (2xx) or 'refused' (4xx)."""
    status = got[0]
    ok = (200 <= status < 300) if expect == "ok" else (400 <= status < 500)
    detail = ""
    if not ok or expect == "refused":
        body = got[1]
        detail = (body.get("message") or body.get("hint") or str(body))[:90] if isinstance(body, dict) else str(body)[:90]
    results.append((ok, label, f"HTTP {status}" + (f"  {detail}" if detail else "")))
    return got


ME = f"?id=eq.{OWNER}"
MERGE = "resolution=merge-duplicates,return=minimal"

# ---- the columns each call site sends (read from the source) -----------------
ONBOARDING = dict(
    id=OWNER, email="owner@example.ch", sprache="de", land="CH", firmenname="Muster Reinigung GmbH",
    beruf="Reinigung", vorname="Max", nachname="Muster", adresse="Bahnhofstrasse 12", plz="8001",
    ort="Zürich", telefon="+41 79 123 45 67", iban="CH5604835012345678009", bic="",
    uid_mwst="CHE-123.456.789 MWST", steuernummer="", fn_nr="", zahlungsfrist=30, onboarding_complete=True,
)
PROFIL_PAGE = {**{k: v for k, v in ONBOARDING.items() if k != "onboarding_complete"}, "kleinunternehmer": False}
EDITOR = {**ONBOARDING, "logo_url": ""}

# ---- A. what the browser does -------------------------------------------------
check("onboarding: upsert profile", call(USER, "POST", "/profiles?on_conflict=id", ONBOARDING, MERGE), "ok")
check("settings: upsert profile", call(USER, "POST", "/profiles?on_conflict=id", PROFIL_PAGE, MERGE), "ok")
check("editor: persist profile", call(USER, "POST", "/profiles?on_conflict=id", EDITOR, MERGE), "ok")
# The app lower-cases the colour (pdf-colors.ts normalizeHex) and only sends one
# for the "farbig" template; the column's check constraint is ^#[0-9a-f]{6}$.
check("settings: template farbig + accent colour", call(USER, "PATCH", "/profiles" + ME, {"pdf_template": "farbig", "pdf_accent_color": "#c8793d"}), "ok")
check("settings: another template, no colour", call(USER, "PATCH", "/profiles" + ME, {"pdf_template": "modern", "pdf_accent_color": None}), "ok")
check("settings: remove logo", call(USER, "PATCH", "/profiles" + ME, {"logo_url": ""}), "ok")

created = call(USER, "POST", "/vorlagen", {"user_id": OWNER, "name": "Neue Vorlage", "beruf": "",
               "positionen": [{"bezeichnung": "Position 1", "einheit": "Std.", "menge": 1, "preis": 0}]}, "return=representation")
check("templates: create", created, "ok")
vid = created[1][0]["id"] if created[0] == 201 else None
if vid:
    check("templates: edit", call(USER, "PATCH", f"/vorlagen?id=eq.{vid}", {"name": "Reinigung", "positionen": []}), "ok")
    check("templates: delete", call(USER, "DELETE", f"/vorlagen?id=eq.{vid}"), "ok")

# ---- B. what the save route does (admin client) ------------------------------
cust = call(ADMIN, "POST", "/customers?on_conflict=user_id,lookup_key",
            {"user_id": OWNER, "display_name": "Keller AG", "email": "k@example.ch", "adresse": "Marktgasse 1",
             "plz": "3011", "ort": "Bern", "lookup_key": "keller-ag", "updated_at": "2026-10-04T10:00:00Z"},
            "resolution=merge-duplicates,return=representation")
check("save: upsert customer", cust, "ok")
cid = cust[1][0]["id"] if cust[0] in (200, 201) else None


def document(nummer: str, typ: str, status: str):
    return {"user_id": OWNER, "typ": typ, "nummer": nummer, "objekt": "Büroreinigung", "kundenname": "Keller AG",
            "customer_id": cid, "kunde_email": "k@example.ch", "kunde_adresse": "Marktgasse 1", "kunde_plz": "3011",
            "kunde_ort": "Bern", "betrag": 1050.19, "datum": "2026-10-04", "leistungsdatum": "2026-10-01",
            "pdf_url": f"{OWNER}/{nummer}.pdf", "status": status, "steuerfall": "standard",
            "positionen": [{"bezeichnung": "Reinigung", "einheit": "Std.", "menge": 12, "preis": 58}],
            "mwst_satz": 8.1, "preis_mode": "exkl"}


def make(nummer, typ, status):
    got = call(ADMIN, "POST", "/dokumente", document(nummer, typ, status), "return=representation")
    return got, (got[1][0]["id"] if got[0] == 201 else None)


g, offerte = make("OF-2026-0001", "offerte", "gesendet"); check("save: new quotation (sent)", g, "ok")
g, rechnung = make("RE-2026-0001", "rechnung", "gesendet"); check("save: new invoice (sent)", g, "ok")
g, zweite = make("RE-2026-0002", "rechnung", "gesendet"); check("save: second invoice (sent)", g, "ok")

# ---- C. what the status routes do (user client) ------------------------------
check("dashboard: list own documents", call(USER, "GET", "/dokumente?select=id,typ,nummer,status,betrag,datum&order=datum.desc&limit=200"), "ok")
if offerte:
    check("status: quotation -> accepted", call(USER, "PATCH", f"/dokumente?id=eq.{offerte}&user_id=eq.{OWNER}", {"status": "angenommen"}), "ok")
if rechnung:
    check("reminder: stage 1 + overdue", call(USER, "PATCH", f"/dokumente?id=eq.{rechnung}&user_id=eq.{OWNER}",
          {"mahnstufe": 1, "last_mahnung_at": "2026-11-10T09:00:00Z", "status": "ueberfaellig"}), "ok")
    check("payment: mark as paid", call(USER, "PATCH", f"/dokumente?id=eq.{rechnung}&user_id=eq.{OWNER}",
          {"status": "bezahlt", "payment_received_at": "2026-11-12T09:00:00Z", "mahnstufe": 0}), "ok")
if zweite:
    check("cancel: invoice -> storno", call(USER, "PATCH", f"/dokumente?id=eq.{zweite}&user_id=eq.{OWNER}&status=neq.storniert",
          {"status": "storniert", "storniert_at": "2026-11-12T10:00:00Z", "storno_grund": "Fehlerhafte Angaben"}), "ok")

if rechnung:
    sched = call(USER, "POST", "/recurring_schedules", {"user_id": OWNER, "template_dokument_id": rechnung,
                 "frequency": "monthly", "next_generation_at": "2026-12-01", "end_date": None, "active": True}, "return=representation")
    check("recurring: create series", sched, "ok")

# ---- D. the rules that must still hold, through the browser's own path -------
if rechnung:
    check("GUARD: change amount of an issued invoice", call(USER, "PATCH", f"/dokumente?id=eq.{rechnung}", {"betrag": 1.0}), "refused")
    check("GUARD: swap the archived PDF of an issued invoice", call(USER, "PATCH", f"/dokumente?id=eq.{rechnung}", {"pdf_url": f"{OWNER}/other.pdf"}), "refused")
    check("GUARD: send an issued invoice back to draft", call(USER, "PATCH", f"/dokumente?id=eq.{rechnung}", {"status": "entwurf"}), "refused")
    check("GUARD: delete an issued invoice", call(USER, "DELETE", f"/dokumente?id=eq.{rechnung}"), "refused")
if zweite:
    check("GUARD: reactivate a cancelled invoice", call(USER, "PATCH", f"/dokumente?id=eq.{zweite}", {"status": "gesendet"}), "refused")
check("GUARD: grant myself a paid plan", call(USER, "PATCH", "/profiles" + ME, {"plan": "pro_yearly"}), "refused")
check("GUARD: grant myself a trial", call(USER, "PATCH", "/profiles" + ME, {"trial_ends_at": "2099-01-01T00:00:00Z"}), "refused")

# Rewriting the primary key. A column grant on `id` is only safe if RLS stops this,
# so it is checked rather than assumed: the row must not move, and the call must
# not hand someone else's id to this user.
moved = call(USER, "PATCH", "/profiles" + ME, {"id": STRANGER}, "return=representation")
check("GUARD: rewrite my profile id to someone else's", (400 if moved[0] >= 400 or not moved[1] else 200, moved[1]), "refused")
still_mine = call(USER, "GET", "/profiles" + ME + "&select=id")
results.append((bool(still_mine[1]) and still_mine[1][0]["id"] == OWNER, "GUARD: my profile is still mine afterwards", f"HTTP {still_mine[0]}"))

# ---- report -------------------------------------------------------------------
width = max(len(label) for _, label, _ in results)
for ok, label, detail in results:
    print(f"{'PASS' if ok else 'FAIL'}  {label.ljust(width)}  {detail}")
failed = [label for ok, label, _ in results if not ok]
print(f"\n{len(results) - len(failed)} of {len(results)} behave as expected")
sys.exit(1 if failed else 0)
