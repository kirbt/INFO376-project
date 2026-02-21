import json
import requests
from functools import wraps
from flask import request, jsonify
from jose import jwt
from dotenv import load_dotenv
import os


# load env variables
load_dotenv()

AZURE_TENANT_ID = os.getenv('AZURE_TENANT_ID')
AZURE_CLIENT_ID = os.getenv('AZURE_CLIENT_ID')
AZURE_AUTHORITY = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}"

TOKEN_ISSUER = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/v2.0"
JWKS_URL = f"{TOKEN_ISSUER}/discovery/v2.0/keys"

JWKS = requests.get(JWKS_URL).json()

def validate_token(token):
  try:
    decoded_token = jwt.decode(
      token,
      JWKS,
      algorithms=['RS256'],
      audience=AZURE_CLIENT_ID,
      issuer=TOKEN_ISSUER
    )
    return decoded_token
  except Exception as e:
    print("Token validation error:", e)
    return None

def require_auth(f):
  @wraps(f)
  def wrapper(*args, **kwargs):
    auth_header = request.headers.get('Authorization', None)

    if not auth_header:
      return jsonify({'error': 'Authorization header missing'}), 401

    token = auth_header.replace('Bearer ', '')
    decoded_token = validate_token(token)

    if not decoded_token:
      return jsonify({'error': 'Invalid token'}), 401

    return f(*args, **kwargs)

  return wrapper
