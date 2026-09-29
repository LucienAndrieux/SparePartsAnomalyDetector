"""Génère le schéma du POC (FR et EN) en SVG, puis en PNG via Chrome headless.

Usage : python docs/diagrams/poc_diagram.py
"""
import pathlib
import shutil
import subprocess

HERE = pathlib.Path(__file__).parent
W, H = 1100, 1290
CX = 430  # axe de la colonne principale

TEXT = {
    "fr": {
        "tracking": ("Feuille Tracking (Jobs / RFQ)", ["l'équipe saisit et corrige les données"]),
        "sync": "Feuille Sync — colonnes de diff",
        "cols": ("Actuel", "Dernier sync", "Synchronisé"),
        "sync_note": "Actuel = formule live · Dernier sync = écrit par n8n · Synchronisé = Actuel = Dernier sync",
        "read": ("n8n — lecture planifiée", ["chaque nuit à 23h · filtre Synchronisé = N"]),
        "llm": ("LLM — une ligne à la fois", ["Entrée : snapshot « Colonne: valeur »",
                                              "Sortie : tableau d'anomalies (type, champ, description)",
                                              "openai/gpt-oss-120b · pause de 15 s entre deux lignes"]),
        "llm_note": ["Échec ou réponse invalide :", "la ligne reste « N » et", "repasse la nuit suivante"],
        "verdict": ("n8n — applique le verdict", ["contrôle du format · insertion des anomalies",
                                                   "Dernier sync ← Actuel"]),
        "db": ("Supabase", ["anomalies : type, champ, ligne du Sheets", "doublons ignorés par la base"]),
        "dash": ("Dashboard React + Express", ["lecture seule · vues par job et par responsable"]),
        "verif": ("« Marquer comme résolu » — vérification", ["n8n relit la ligne et la fait ré-analyser",
                                                               "anomalie close seulement si elle a disparu",
                                                               "résolue par : acronyme de l'utilisateur"]),
        "loop": ["l'équipe corrige la ligne", "dans la feuille Tracking"],
        "reread": "relit la ligne",
        "write": "écrit le résultat",
    },
    "en": {
        "tracking": ("Tracking sheet (Jobs / RFQ)", ["the team enters and fixes the data"]),
        "sync": "Sync sheet — diff columns",
        "cols": ("Actual", "Last sync", "Synched"),
        "sync_note": "Actual = live formula · Last sync = written by n8n · Synched = Actual = Last sync",
        "read": ("n8n — scheduled read", ["every night at 23:00 · filter Synched = N"]),
        "llm": ("LLM — one row at a time", ["Input: “Column: value” snapshot",
                                            "Output: array of anomalies (type, field, description)",
                                            "openai/gpt-oss-120b · 15 s pause between rows"]),
        "llm_note": ["Failure or invalid response:", "the row stays “N” and", "is retried the next night"],
        "verdict": ("n8n — applies the verdict", ["format check · anomalies inserted",
                                                  "Last sync ← Actual"]),
        "db": ("Supabase", ["anomalies: type, field, Sheets row", "duplicates skipped by the database"]),
        "dash": ("React + Express dashboard", ["read-only · per-job and per-person views"]),
        "verif": ("“Mark as resolved” — verification", ["n8n re-reads the row and has it re-analyzed",
                                                        "anomaly closed only if it is gone",
                                                        "resolved by: the user's acronym"]),
        "loop": ["the team fixes the row", "in the Tracking sheet"],
        "reread": "re-reads the row",
        "write": "writes the result",
    },
}

INK, SUB, LINE = "#1f2933", "#5f6b7a", "#c9c9d1"
ORANGE = ("#f6e2d5", "#b8541f", "#7a2e0e")
GREEN = ("#e6f4ea", "#2e7d4f", "#12331f")


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def box(y, h, title, lines, w=340, colors=None, cx=CX):
    fill, stroke, ink = colors or ("#ffffff", LINE, INK)
    sub = ink if colors else SUB
    x = cx - w / 2
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{stroke}" '
           f'stroke-width="{2 if colors else 1.5}"/>']
    ty = y + 34
    out.append(f'<text x="{cx}" y="{ty}" class="t" fill="{ink}">{esc(title)}</text>')
    for i, line in enumerate(lines):
        out.append(f'<text x="{cx}" y="{ty + 26 + i * 22}" class="s" fill="{sub}">{esc(line)}</text>')
    return "\n".join(out)


def arrow(y1, y2, x=CX):
    return f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2 - 2}" stroke="{INK}" stroke-width="2" marker-end="url(#a)"/>'


def svg(t):
    p = []
    # 1. Feuille Tracking
    p.append(box(30, 80, *t["tracking"]))
    p.append(arrow(110, 150))

    # 2. Feuille Sync (tableau de diff)
    sx, sw, sy, sh = CX - 310, 620, 150, 210
    p.append(f'<rect x="{sx}" y="{sy}" width="{sw}" height="{sh}" rx="10" fill="#fff" stroke="{LINE}" stroke-width="1.5"/>')
    p.append(f'<text x="{CX}" y="{sy + 34}" class="t" fill="{INK}">{esc(t["sync"])}</text>')
    colx = [sx + 110, sx + 310, sx + 510]
    rows = [("Job 1042 · OK", "Job 1042 · OK", "Y"), ("Job 1058 · 22/03", "Job 1058 · 19/03", "N")]
    for x, head in zip(colx, t["cols"]):
        p.append(f'<text x="{x}" y="{sy + 72}" class="h" fill="{SUB}">{esc(head)}</text>')
    for i, row in enumerate(rows):
        y = sy + 108 + i * 34
        for j, (x, val) in enumerate(zip(colx, row)):
            color = ORANGE[2] if val == "N" else INK
            weight = ' font-weight="700"' if j == 2 else ""
            p.append(f'<text x="{x}" y="{y}" class="c" fill="{color}"{weight}>{esc(val)}</text>')
    p.append(f'<line x1="{sx + 40}" y1="{sy + 86}" x2="{sx + sw - 40}" y2="{sy + 86}" stroke="{LINE}"/>')
    p.append(f'<line x1="{sx + 40}" y1="{sy + 120}" x2="{sx + sw - 40}" y2="{sy + 120}" stroke="{LINE}"/>')
    for x in (sx + 210, sx + 410):
        p.append(f'<line x1="{x}" y1="{sy + 54}" x2="{x}" y2="{sy + 152}" stroke="{LINE}"/>')
    p.append(f'<text x="{CX}" y="{sy + 186}" class="n" fill="{SUB}">{esc(t["sync_note"])}</text>')
    p.append(arrow(360, 400))

    # 3. Lecture planifiée
    p.append(box(400, 80, *t["read"]))
    p.append(arrow(480, 520))

    # 4. LLM, avec la note sur les échecs
    p.append(box(520, 130, *t["llm"], w=440, colors=ORANGE))
    nx = 690
    p.append(f'<rect x="{nx}" y="540" width="220" height="90" rx="8" fill="#fff" stroke="{LINE}" stroke-dasharray="5 4"/>')
    for i, line in enumerate(t["llm_note"]):
        p.append(f'<text x="{nx + 110}" y="{568 + i * 20}" class="n" fill="{SUB}">{esc(line)}</text>')
    p.append(f'<line x1="652" y1="585" x2="{nx}" y2="585" stroke="{LINE}" stroke-dasharray="4 4"/>')
    p.append(arrow(650, 690))

    # 5. Verdict
    p.append(box(690, 100, *t["verdict"]))
    p.append(arrow(790, 830))

    # 6. Supabase (cylindre)
    cy, ch, cw = 830, 140, 300
    x0 = CX - cw / 2
    p.append(f'<path d="M{x0},{cy + 18} v{ch - 36} a{cw / 2},18 0 0 0 {cw},0 v{-(ch - 36)}" fill="#fff" stroke="{LINE}" stroke-width="1.5"/>')
    p.append(f'<ellipse cx="{CX}" cy="{cy + 18}" rx="{cw / 2}" ry="18" fill="#fff" stroke="{LINE}" stroke-width="1.5"/>')
    title, lines = t["db"]
    p.append(f'<text x="{CX}" y="{cy + 72}" class="t" fill="{INK}">{esc(title)}</text>')
    for i, line in enumerate(lines):
        p.append(f'<text x="{CX}" y="{cy + 98 + i * 22}" class="s" fill="{SUB}">{esc(line)}</text>')
    p.append(arrow(970, 1010))

    # 7. Dashboard
    p.append(box(1010, 80, *t["dash"]))
    p.append(arrow(1090, 1130))

    # 8. Vérification
    p.append(box(1130, 130, *t["verif"], w=440, colors=GREEN))

    # Boucle : l'équipe corrige dans la feuille Tracking (côté gauche)
    p.append(f'<path d="M{CX - 170},1050 H60 V70 H{CX - 172}" fill="none" stroke="{INK}" stroke-width="1.6" '
             f'stroke-dasharray="2 5" marker-end="url(#a)"/>')
    for i, line in enumerate(t["loop"]):
        p.append(f'<text x="72" y="{44 + i * 17}" class="n" fill="{SUB}" text-anchor="start">{esc(line)}</text>')

    # Vérification : relit la ligne (Sync) et écrit le résultat (Supabase), côté droit
    p.append(f'<path d="M{CX + 220},1170 H1000 V255 H{CX + 312}" fill="none" stroke="{GREEN[1]}" stroke-width="1.6" '
             f'stroke-dasharray="6 5" marker-end="url(#g)"/>')
    p.append(f'<text x="{CX + 330}" y="246" class="n" fill="{GREEN[1]}" text-anchor="start">{esc(t["reread"])}</text>')
    p.append(f'<path d="M{CX + 220},1215 H850 V900 H{CX + 152}" fill="none" stroke="{GREEN[1]}" stroke-width="1.6" '
             f'stroke-dasharray="6 5" marker-end="url(#g)"/>')
    p.append(f'<text x="{CX + 170}" y="891" class="n" fill="{GREEN[1]}" text-anchor="start">{esc(t["write"])}</text>')

    body = "\n".join(p)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{INK}"/></marker>
<marker id="g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{GREEN[1]}"/></marker>
<style>
text {{ font-family: Georgia, 'Times New Roman', serif; text-anchor: middle; }}
.t {{ font-size: 19px; font-weight: 700; }}
.s {{ font-size: 15px; }}
.h {{ font-size: 15px; font-weight: 700; }}
.c {{ font-size: 14px; }}
.n {{ font-size: 13px; }}
</style>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
{body}
</svg>'''


def find_chrome():
    candidates = [r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                  shutil.which("chrome"), shutil.which("google-chrome"), shutil.which("chromium")]
    return next(c for c in candidates if c and pathlib.Path(c).exists())


def main():
    chrome = find_chrome()
    for lang, t in TEXT.items():
        html = HERE / f"poc_diagram_{lang}.html"
        html.write_text('<!doctype html><meta charset="utf-8">'
                        '<style>html,body{margin:0;background:#fff}</style>' + svg(t), encoding="utf-8")
        png = HERE / f"poc_diagram_{lang}.png"
        subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--force-device-scale-factor=2", f"--window-size={W},{H}",
                        f"--screenshot={png}", html.as_uri()], check=True, capture_output=True)
        html.unlink()
        print(png)


if __name__ == "__main__":
    main()
