from flask import Blueprint, jsonify

ev_charger_bp = Blueprint("ev_charger_station", __name__)


@ev_charger_bp.get("")
@ev_charger_bp.get("/")
def get_ev_charger_status():
    """Return EV charger station information placeholder."""
    return jsonify({"status": "ok", "message": "EV charger station endpoint"})