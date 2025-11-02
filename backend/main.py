from flask import Flask

from blueprints.algorithmie import algorithmie_bp
from blueprints.ev_charger import ev_charger_bp
from blueprints.traffic import traffic_bp


def create_app() -> Flask:
    """Application factory configuring all blueprints."""
    app = Flask(__name__)

    # Register feature blueprints with dedicated URL prefixes.
    app.register_blueprint(traffic_bp, url_prefix="/traffic")
    app.register_blueprint(ev_charger_bp, url_prefix="/ev-charger-station")
    app.register_blueprint(algorithmie_bp, url_prefix="/algorithmie")

    return app


if __name__ == "__main__":
    application = create_app()
    application.run(debug=True)