from flask import Blueprint, jsonify

traffic_bp = Blueprint("traffic", __name__)


@traffic_bp.get("")
@traffic_bp.get("/")
def get_traffic_status():
    """Return current traffic data placeholder."""
    return jsonify({"status": "ok", "message": "Traffic data endpoint"})