"""
Romanoti Infrastructure Visualizer (RIV)
Protected Flask backend for Romanoti RIV.

File:
- src/api/server.py

Purpose:
- Provide the Romanoti-branded login page.
- Protect RIV behind username/password authentication.
- Protect RIV frontend pages and API endpoints.
- Serve modular frontend pages from src/web.
- Preserve the current login flow and environment-variable credentials.
- Prepare RIV for a commercial/pilot product architecture.

Product direction:
- RIV should not grow as one overloaded HTML page.
- Each feature should become its own protected page:
  - dashboard.html
  - rack-view.html
  - multi-rack.html
  - connectivity-map.html
  - connection-details.html
  - smart-hands.html
  - tools.html

Environment variables expected in Render:
- RIV_USERNAME
- RIV_PASSWORD
- RIV_SECRET_KEY

Optional:
- RIV_SESSION_TIMEOUT_MINUTES
- RIV_DISPLAY_NAME
- RIV_DISPLAY_ROLE
- RIV_COMPANY

Important:
- This file does NOT change credentials.
- This file does NOT add a login bypass.
- Local testing still requires setting RIV_USERNAME and RIV_PASSWORD
  in PowerShell before running Flask.
"""

import os
from datetime import timedelta
from functools import wraps
from pathlib import Path

from flask import (
    Flask,
    jsonify,
    make_response,
    redirect,
    request,
    send_from_directory,
    session,
    url_for,
)

from flask_cors import CORS

from src.engine.verification_engine import VerificationEngine
from src.engine.closure_generator import ClosureGenerator
from src.engine.runbook_generator import RunbookGenerator
from src.engine.ticket_parser import TicketParser


# ============================================================
# APPLICATION SETUP
# ============================================================

app = Flask(__name__)

# Secret key used by Flask to sign session cookies.
# In Render this must come from RIV_SECRET_KEY.
app.secret_key = os.getenv("RIV_SECRET_KEY", "romanoti-riv-local-dev-secret")

# Session timeout in minutes.
# Render can override this with RIV_SESSION_TIMEOUT_MINUTES.
SESSION_TIMEOUT_MINUTES = int(os.getenv("RIV_SESSION_TIMEOUT_MINUTES", "60"))
app.permanent_session_lifetime = timedelta(minutes=SESSION_TIMEOUT_MINUTES)

# Session cookie hardening.
# SESSION_COOKIE_SECURE is enabled automatically in Render/production.
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = bool(os.getenv("RENDER"))

# CORS is kept because the original RIV pilot used it.
# supports_credentials allows authenticated browser requests to keep session cookies.
CORS(app, supports_credentials=True)


# ============================================================
# RIV CONFIGURATION
# ============================================================

# Credentials are stored securely in Render Environment Variables.
# Do not hardcode production credentials here.
RIV_USERNAME = os.getenv("RIV_USERNAME", "")
RIV_PASSWORD = os.getenv("RIV_PASSWORD", "")

# User profile shown to the frontend.
# Later this can come from CRM/Supabase/SSO.
RIV_DISPLAY_NAME = os.getenv("RIV_DISPLAY_NAME", "Mauricio Romero")
RIV_DISPLAY_ROLE = os.getenv("RIV_DISPLAY_ROLE", "Romanoti Admin")
RIV_COMPANY = os.getenv("RIV_COMPANY", "RomanoTI-Solutions Inc.")

# Absolute path to the existing frontend folder.
BASE_DIR = Path(__file__).resolve().parents[2]
WEB_DIR = BASE_DIR / "src" / "web"


# ============================================================
# MODULAR FRONTEND PAGE MAP
# ============================================================

"""
Each protected frontend module should eventually have its own HTML file.

Current migration behavior:
- /dashboard serves dashboard.html when it exists.
- Until dashboard.html is created, /dashboard falls back to the existing index.html.
- Other module routes show a protected placeholder until their HTML files are created.

This lets us migrate safely, one complete file at a time.
"""

MODULAR_PAGES = {
    "dashboard": {
        "route": "/dashboard",
        "filename": "dashboard.html",
        "title": "Operations Hub",
        "fallback": "index.html",
    },
    "rack_view": {
        "route": "/rack-view",
        "filename": "rack-view.html",
        "title": "Rack View",
        "fallback": None,
    },
    "multi_rack": {
        "route": "/multi-rack",
        "filename": "multi-rack.html",
        "title": "Multi-Rack Visualization",
        "fallback": None,
    },
    "connectivity_map": {
        "route": "/connectivity-map",
        "filename": "connectivity-map.html",
        "title": "Connectivity Map",
        "fallback": None,
    },
    "connection_details": {
        "route": "/connection-details",
        "filename": "connection-details.html",
        "title": "Connection Details",
        "fallback": None,
    },
    "smart_hands": {
        "route": "/smart-hands",
        "filename": "smart-hands.html",
        "title": "Smart Hands Workflow",
        "fallback": None,
    },
    "tools": {
        "route": "/tools",
        "filename": "tools.html",
        "title": "Current Tools",
        "fallback": None,
    },
}


# ============================================================
# AUTHENTICATION HELPERS
# ============================================================

def is_authenticated():
    """
    Returns True when the current browser session has passed login.
    """
    return session.get("riv_authenticated") is True


def login_required(route_function):
    """
    Decorator used to protect RIV pages and API endpoints.
    """

    @wraps(route_function)
    def wrapper(*args, **kwargs):
        if not is_authenticated():
            # API calls receive JSON so frontend code can handle the error clearly.
            if request.path == "/run-demo" or request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required"}), 401

            # Browser navigation is redirected to the login screen.
            return redirect(url_for("login_page"))

        # Refresh session lifetime on each authenticated request.
        session.permanent = True
        session.modified = True

        return route_function(*args, **kwargs)

    return wrapper


def is_protected_frontend_path(path):
    """
    Returns True when the path is part of the protected RIV frontend.

    This is used for no-cache headers so the browser does not keep
    protected app pages after logout.
    """
    protected_paths = {
        "/dashboard",
        "/rack-view",
        "/multi-rack",
        "/connectivity-map",
        "/connection-details",
        "/smart-hands",
        "/tools",
        "/styles.css",
        "/app.js",
    }

    return path in protected_paths or path.startswith("/api/")


@app.after_request
def add_security_headers(response):
    """
    Add basic security and no-cache headers.

    No-cache is important so browser back button does not show protected
    dashboard content after logout.
    """
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    if is_protected_frontend_path(request.path):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    return response


# ============================================================
# FRONTEND SERVING HELPERS
# ============================================================

def web_file_exists(filename):
    """
    Checks whether a frontend file exists inside src/web.
    """
    return (WEB_DIR / filename).exists()


def serve_protected_web_page(filename, title, fallback_filename=None):
    """
    Serves a protected modular frontend page.

    Behavior:
    - If filename exists, serve it.
    - If fallback_filename exists, serve that instead.
      This keeps /dashboard working during migration.
    - If neither exists, show a protected placeholder page.
      This avoids 404 while we create module pages one by one.
    """
    if web_file_exists(filename):
        return send_from_directory(WEB_DIR, filename)

    if fallback_filename and web_file_exists(fallback_filename):
        return send_from_directory(WEB_DIR, fallback_filename)

    return render_module_placeholder(title=title, expected_file=filename)


def render_module_placeholder(title, expected_file):
    """
    Temporary protected placeholder for modules whose HTML file has not
    been created yet.

    This is not a bypass and not public.
    The user must be authenticated to see it.
    """
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Romanoti RIV - {title}</title>

  <style>
    * {{
      box-sizing: border-box;
    }}

    body {{
      margin: 0;
      min-height: 100vh;
      font-family: Arial, Helvetica, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(201, 178, 126, 0.14), transparent 32%),
        linear-gradient(135deg, #071225 0%, #10233f 52%, #0b1220 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
    }}

    .placeholder-shell {{
      width: min(980px, 100%);
      border-radius: 28px;
      padding: 42px;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.10);
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.35);
    }}

    .eyebrow {{
      color: #f3dfad;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 12px;
      font-weight: 900;
      margin: 0 0 10px;
    }}

    h1 {{
      margin: 0 0 12px;
      font-size: clamp(36px, 6vw, 64px);
      letter-spacing: -0.05em;
      line-height: 1;
    }}

    p {{
      color: rgba(255, 255, 255, 0.74);
      font-size: 17px;
      line-height: 1.65;
      max-width: 760px;
    }}

    code {{
      display: inline-flex;
      padding: 4px 8px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.10);
      color: #f3dfad;
      font-weight: 800;
    }}

    .actions {{
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 26px;
    }}

    a {{
      text-decoration: none;
      padding: 13px 18px;
      border-radius: 999px;
      font-weight: 900;
      color: #0f172a;
      background: #f3dfad;
    }}

    a.secondary {{
      color: #ffffff;
      background: rgba(255, 255, 255, 0.10);
      border: 1px solid rgba(255, 255, 255, 0.16);
    }}
  </style>
</head>

<body>
  <main class="placeholder-shell">
    <p class="eyebrow">Romanoti RIV · Protected Module</p>
    <h1>{title}</h1>

    <p>
      This module route is protected and ready. The frontend file
      <code>{expected_file}</code> has not been created yet.
      We will add it in the next implementation step.
    </p>

    <div class="actions">
      <a href="/dashboard">Back to Operations Hub</a>
      <a class="secondary" href="/logout">Logout</a>
    </div>
  </main>
</body>
</html>
"""


# ============================================================
# LOGIN PAGE
# ============================================================

@app.route("/", methods=["GET"])
def login_page():
    """
    Romanoti-branded login page for RIV.

    If the user is already authenticated, send them directly to the dashboard.
    """
    if is_authenticated():
        return redirect(url_for("dashboard"))

    login_error = request.args.get("error") == "1"
    expired = request.args.get("expired") == "1"

    error_html = ""
    if login_error:
        error_html = """
          <div class="login-error">
            Invalid username or password. Please try again.
          </div>
        """

    expired_html = ""
    if expired:
        expired_html = """
          <div class="login-warning">
            Your RIV session expired. Please sign in again.
          </div>
        """

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Romanoti RIV Login</title>

  <style>
    * {{
      box-sizing: border-box;
    }}

    body {{
      margin: 0;
      min-height: 100vh;
      font-family: Arial, Helvetica, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(37, 99, 235, 0.28), transparent 32%),
        linear-gradient(135deg, #071225 0%, #10233f 52%, #0b1220 100%);
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
    }}

    .login-shell {{
      width: min(980px, 100%);
      display: grid;
      grid-template-columns: 1fr 1fr;
      background: #ffffff;
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.35);
    }}

    .login-brand {{
      position: relative;
      padding: 56px 48px;
      color: #ffffff;
      background:
        linear-gradient(rgba(15, 23, 42, 0.70), rgba(15, 23, 42, 0.82)),
        radial-gradient(circle at top left, rgba(239, 68, 68, 0.46), transparent 30%),
        linear-gradient(145deg, #111827, #1e3a5f);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 560px;
    }}

    .romanoti-mark {{
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: linear-gradient(135deg, #ef4444, #b91c1c);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 30px;
      box-shadow: 0 18px 40px rgba(239, 68, 68, 0.34);
    }}

    .access-pill {{
      display: inline-flex;
      width: fit-content;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.20);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 22px;
    }}

    .login-brand h1 {{
      font-size: clamp(38px, 5vw, 58px);
      line-height: 1.02;
      margin: 0 0 20px;
      letter-spacing: -0.04em;
    }}

    .login-brand p {{
      margin: 0;
      font-size: 17px;
      line-height: 1.7;
      color: rgba(255, 255, 255, 0.82);
      max-width: 420px;
    }}

    .login-form-panel {{
      padding: 56px 48px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }}

    .form-title-row {{
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }}

    .accent-bar {{
      width: 14px;
      height: 42px;
      border-radius: 999px;
      background: linear-gradient(180deg, #2563eb, #ef4444);
    }}

    .login-form-panel h2 {{
      margin: 0;
      font-size: 32px;
      line-height: 1.1;
      color: #0f172a;
      letter-spacing: -0.03em;
    }}

    .subtitle {{
      margin: 0 0 32px;
      color: #64748b;
      font-size: 15px;
    }}

    label {{
      display: block;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #64748b;
      margin: 18px 0 8px;
    }}

    input {{
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 15px 16px;
      font-size: 15px;
      outline: none;
      background: #f8fafc;
    }}

    input:focus {{
      border-color: #2563eb;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
      background: #ffffff;
    }}

    .login-button {{
      width: 100%;
      margin-top: 28px;
      border: none;
      border-radius: 14px;
      padding: 16px 18px;
      background: #0f172a;
      color: #ffffff;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
    }}

    .login-button:hover {{
      background: #1e293b;
    }}

    .back-link {{
      display: block;
      text-align: center;
      margin-top: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 14px 18px;
      text-decoration: none;
      color: #0f172a;
      font-weight: 800;
      background: #ffffff;
    }}

    .login-error {{
      margin: 18px 0 4px;
      padding: 12px 14px;
      border-radius: 12px;
      background: #fee2e2;
      color: #991b1b;
      font-weight: 700;
      font-size: 14px;
    }}

    .login-warning {{
      margin: 18px 0 4px;
      padding: 12px 14px;
      border-radius: 12px;
      background: #fef3c7;
      color: #92400e;
      font-weight: 700;
      font-size: 14px;
    }}

    .authorized-note {{
      margin-top: 22px;
      color: #64748b;
      font-size: 13px;
    }}

    @media (max-width: 820px) {{
      body {{
        padding: 18px;
      }}

      .login-shell {{
        grid-template-columns: 1fr;
      }}

      .login-brand {{
        min-height: auto;
        padding: 42px 30px;
      }}

      .login-form-panel {{
        padding: 42px 30px;
      }}
    }}
  </style>
</head>

<body>
  <main class="login-shell">

    <section class="login-brand">
      <div class="romanoti-mark">R</div>

      <div class="access-pill">
        Romanoti Internal Access
      </div>

      <h1>Secure sign-in for RIV.</h1>

      <p>
        Access the Romanoti Infrastructure Visualizer using authorized
        Romanoti credentials.
      </p>
    </section>

    <section class="login-form-panel">
      <div class="form-title-row">
        <div class="accent-bar"></div>

        <div>
          <h2>Romanoti RIV</h2>
          <p class="subtitle">Infrastructure Visualizer sign-in</p>
        </div>
      </div>

      {error_html}
      {expired_html}

      <form method="POST" action="/login">
        <label for="username">Email</label>
        <input
          id="username"
          name="username"
          type="email"
          autocomplete="username"
          required
        />

        <label for="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
        />

        <button class="login-button" type="submit">
          Sign in to RIV
        </button>
      </form>

      <a class="back-link" href="https://romanoti-solutions.com/platform/riv.html">
        ← Back to Romanoti
      </a>

      <p class="authorized-note">
        Authorized Romanoti personnel only. Session timeout: {SESSION_TIMEOUT_MINUTES} minutes.
      </p>
    </section>
  </main>
</body>
</html>
"""


@app.route("/login", methods=["POST"])
def login():
    """
    Validate credentials submitted from the login form.

    Credentials are not hardcoded here.
    They come from:
    - RIV_USERNAME
    - RIV_PASSWORD
    """
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")

    if username == RIV_USERNAME and password == RIV_PASSWORD:
        session.clear()
        session.permanent = True
        session["riv_authenticated"] = True
        session["riv_username"] = username
        session["riv_display_name"] = RIV_DISPLAY_NAME
        session["riv_display_role"] = RIV_DISPLAY_ROLE
        session["riv_company"] = RIV_COMPANY
        return redirect(url_for("dashboard"))

    return redirect(url_for("login_page", error="1"))


@app.route("/logout", methods=["GET"])
def logout():
    """
    Clear session and send the user back to the login page.
    """
    session.clear()
    response = make_response(redirect(url_for("login_page")))
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


# ============================================================
# PROTECTED FRONTEND ROUTES
# ============================================================

@app.route("/dashboard", methods=["GET"])
@login_required
def dashboard():
    """
    Serve the RIV Operations Hub.

    During migration:
    - dashboard.html will be preferred once created.
    - index.html is used as fallback so the current app does not break.
    """
    page = MODULAR_PAGES["dashboard"]
    return serve_protected_web_page(
        filename=page["filename"],
        title=page["title"],
        fallback_filename=page["fallback"],
    )


@app.route("/rack-view", methods=["GET"])
@login_required
def rack_view():
    """
    Serve the dedicated Rack View module.
    """
    page = MODULAR_PAGES["rack_view"]
    return serve_protected_web_page(
        filename=page["filename"],
        title=page["title"],
        fallback_filename=page["fallback"],
    )


@app.route("/multi-rack", methods=["GET"])
@login_required
def multi_rack():
    """
    Serve the dedicated Multi-Rack Visualization module.
    """
    page = MODULAR_PAGES["multi_rack"]
    return serve_protected_web_page(
        filename=page["filename"],
        title=page["title"],
        fallback_filename=page["fallback"],
    )


@app.route("/connectivity-map", methods=["GET"])
@login_required
def connectivity_map():
    """
    Serve the dedicated Connectivity Map module.
    """
    page = MODULAR_PAGES["connectivity_map"]
    return serve_protected_web_page(
        filename=page["filename"],
        title=page["title"],
        fallback_filename=page["fallback"],
    )


@app.route("/connection-details", methods=["GET"])
@login_required
def connection_details():
    """
    Serve the dedicated Connection Details module.
    """
    page = MODULAR_PAGES["connection_details"]
    return serve_protected_web_page(
        filename=page["filename"],
        title=page["title"],
        fallback_filename=page["fallback"],
    )


@app.route("/smart-hands", methods=["GET"])
@login_required
def smart_hands():
    """
    Serve the dedicated Smart Hands Workflow module.
    """
    page = MODULAR_PAGES["smart_hands"]
    return serve_protected_web_page(
        filename=page["filename"],
        title=page["title"],
        fallback_filename=page["fallback"],
    )


@app.route("/tools", methods=["GET"])
@login_required
def tools():
    """
    Serve the dedicated Current Tools module.
    """
    page = MODULAR_PAGES["tools"]
    return serve_protected_web_page(
        filename=page["filename"],
        title=page["title"],
        fallback_filename=page["fallback"],
    )


@app.route("/styles.css", methods=["GET"])
@login_required
def styles():
    """
    Serve the RIV frontend stylesheet only for authenticated users.
    """
    return send_from_directory(WEB_DIR, "styles.css")


@app.route("/app.js", methods=["GET"])
@login_required
def app_js():
    """
    Serve the RIV frontend JavaScript only for authenticated users.
    """
    return send_from_directory(WEB_DIR, "app.js")


@app.route("/api/session", methods=["GET"])
@login_required
def session_info():
    """
    Return authenticated session metadata for the frontend.

    This lets app.js show the real authenticated user, role and
    timeout value without hardcoding it in the frontend.
    """
    return jsonify({
        "authenticated": True,
        "username": session.get("riv_username"),
        "display_name": session.get("riv_display_name", RIV_DISPLAY_NAME),
        "display_role": session.get("riv_display_role", RIV_DISPLAY_ROLE),
        "company": session.get("riv_company", RIV_COMPANY),
        "timeout_minutes": SESSION_TIMEOUT_MINUTES,
    })


@app.route("/api/navigation", methods=["GET"])
@login_required
def navigation_info():
    """
    Return modular navigation metadata.

    This will be useful for frontend pages that want to build the sidebar
    dynamically later.
    """
    return jsonify({
        "modules": [
            {
                "key": "dashboard",
                "label": "Operations Hub",
                "url": "/dashboard",
                "status": "active",
            },
            {
                "key": "rack_view",
                "label": "Rack View",
                "url": "/rack-view",
                "status": "ready",
            },
            {
                "key": "multi_rack",
                "label": "Multi-Rack View",
                "url": "/multi-rack",
                "status": "planned",
            },
            {
                "key": "connectivity_map",
                "label": "Connectivity Map",
                "url": "/connectivity-map",
                "status": "ready",
            },
            {
                "key": "connection_details",
                "label": "Connection Details",
                "url": "/connection-details",
                "status": "planned",
            },
            {
                "key": "smart_hands",
                "label": "Smart Hands",
                "url": "/smart-hands",
                "status": "planned",
            },
            {
                "key": "tools",
                "label": "Current Tools",
                "url": "/tools",
                "status": "ready",
            },
        ]
    })


@app.route("/favicon.ico", methods=["GET"])
def favicon():
    """
    Optional favicon route.
    If the file does not exist in src/web, Flask will return 404.
    """
    return send_from_directory(WEB_DIR, "favicon.ico")


# ============================================================
# PROTECTED API ROUTES
# ============================================================

@app.route("/run-demo", methods=["POST"])
@login_required
def run_demo():
    """
    Run the existing RIV demo verification workflow.

    This endpoint is protected, so unauthenticated users cannot call
    the RIV API directly.
    """
    data = request.get_json() or {}

    ticket_number = data.get("ticket_number", "")
    short_description = data.get("short_description", "")
    description = data.get("description", "")

    parser = TicketParser()
    parsed = parser.parse(ticket_number, short_description, description)

    service_type = parsed["service_type"]
    device = parsed["device_source"]
    rack = parsed["rack"]

    riv = VerificationEngine()
    closure = ClosureGenerator()
    runbook_generator = RunbookGenerator()

    runbook = runbook_generator.generate(service_type, device, rack)

    if service_type == "patch_verification":
        riv.add_check(
            name="Patch Verification",
            result=True,
            details=f"Patch connection verified successfully for {device}"
        )
        riv.add_check(
            name="Link Status",
            result=True,
            details="Link/activity lights are active"
        )
        riv.add_check(
            name="Connectivity Validation",
            result=True,
            details="Remote team confirmed connectivity"
        )

        report = riv.generate_report()

        closure_text = (
            f"Patch verification was completed successfully for device {device} in rack {rack}. "
            f"Link/activity indicators were confirmed and connectivity validation was successful. "
            f"Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "rack_validation":
        riv.add_check(
            name="Rack Identification",
            result=True,
            details=f"Rack {rack} identified correctly"
        )
        riv.add_check(
            name="Device Validation",
            result=True,
            details=f"Device {device} verified in expected position"
        )
        riv.add_check(
            name="Power Connection Check",
            result=True,
            details="Power connections verified successfully"
        )

        report = riv.generate_report()

        closure_text = (
            f"Rack and device validation was completed successfully for device {device} in rack {rack}. "
            f"Equipment identification, mounting position, and power connections were verified. "
            f"Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "rack_mount_verification":
        riv.add_check(
            name="Rack Unit Placement",
            result=True,
            details=f"Device {device} is installed in the expected rack position"
        )
        riv.add_check(
            name="Mounting Hardware",
            result=True,
            details="Mounting ears and screws are secure"
        )
        riv.add_check(
            name="Physical Stability",
            result=True,
            details="Device is stable and properly aligned"
        )

        report = riv.generate_report()

        closure_text = (
            f"Device rack mount verification was completed successfully for device {device} in rack {rack}. "
            f"Rack unit placement, mounting hardware, and physical stability were verified. "
            f"Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "device_connectivity_test":
        riv.add_check(
            name="Physical Link Check",
            result=True,
            details="Link/activity indicators verified"
        )
        riv.add_check(
            name="Port Verification",
            result=True,
            details="Required ports and cable seating verified"
        )
        riv.add_check(
            name="Connectivity Confirmation",
            result=True,
            details="Connectivity confirmed with remote engineer"
        )

        report = riv.generate_report()

        closure_text = (
            f"Device connectivity test was completed successfully for device {device} in rack {rack}. "
            f"Physical link status, port verification, and connectivity confirmation were completed. "
            f"Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "power_cycle":
        riv.add_check(
            name="Device Power Cycle",
            result=True,
            details=f"Power cycle executed successfully on device {device}"
        )
        riv.add_check(
            name="Link Status",
            result=True,
            details="Link/activity lights are active"
        )
        riv.add_check(
            name="Service Access",
            result=True,
            details="User confirmed login and access"
        )

        report = riv.generate_report()

        closure_text = closure.generate_power_cycle_closure(
            rack=rack,
            device=device,
            notified_person="Relevant stakeholder",
            service_restored=True
        )

    else:
        riv.add_check(
            name="Task Execution",
            result=True,
            details=f"Task completed for device {device}"
        )
        riv.add_check(
            name="Validation",
            result=True,
            details="Requested validation completed"
        )
        riv.add_check(
            name="Stakeholder Notification",
            result=True,
            details="Relevant stakeholder informed"
        )

        report = riv.generate_report()

        closure_text = (
            f"Requested task was completed successfully for device {device} in rack {rack}. "
            f"Validation was performed and the relevant stakeholder was informed. Issue resolved."
        )

    return jsonify({
        "parsed_ticket": parsed,
        "runbook": runbook,
        "report": report,
        "closure": closure_text
    })


# ============================================================
# LOCAL DEVELOPMENT ENTRYPOINT
# ============================================================

if __name__ == "__main__":
    app.run(debug=True)