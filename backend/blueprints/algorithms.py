from flask import Blueprint, jsonify

algorithmie_bp = Blueprint("algorithmie", __name__)


@algorithmie_bp.get("")
@algorithmie_bp.get("/")
def execute_algorithmie():
    """Return algorithmie processing placeholder."""
    return jsonify({"status": "ok", "message": "Algorithmie endpoint"})