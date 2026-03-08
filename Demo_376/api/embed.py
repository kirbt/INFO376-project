from sentence_transformers import SentenceTransformer;
import sys, json;

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

text = sys.stdin.read().strip()

if not text:
    print(json.dumps([]))
    sys.exit(0)

vector_embedding = model.encode(text).tolist()

print(json.dumps(vector_embedding))