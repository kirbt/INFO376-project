from flask import Blueprint, jsonify

search_bp = Blueprint('search', __name__)

@search_bp.route('/search')
def search():
    # placeholder

    return jsonify({'results': []})


