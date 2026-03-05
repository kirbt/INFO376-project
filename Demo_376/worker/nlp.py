import sys
import json
from textblob import TextBlob

def process_text(text):
    blob = TextBlob(text)
    
    result = {
        "noun_phrases": list(blob.noun_phrases),
        "sentiment": {
            "polarity": blob.sentiment.polarity,
            "subjectivity": blob.sentiment.subjectivity
        },
        "summary": " ".join([str(s) for s in blob.sentences[:3]])
    }
    return result

if __name__ == "__main__":
    input_text = sys.stdin.read()
    if not input_text:
        print(json.dumps({"error": "No input text provided"}))
        sys.exit(1)
        
    try:
        processed = process_text(input_text)
        print(json.dumps(processed))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
