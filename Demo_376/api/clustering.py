import sys
import json
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

def cluster_documents(docs):
    if len(docs) < 2:
        return [{"title": d["title"], "x": 0.0, "y": 0.0, "cluster": 0} for d in docs]
    
    df = pd.DataFrame(docs)
    
    # Vectorize content
    vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
    X = vectorizer.fit_transform(df['content'])
    
    # Clustering (dynamic k based on number of docs, max 5)
    n_clusters = min(len(docs), 5)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    clusters = kmeans.fit_predict(X)
    
    # Dimensionality reduction for 2D plot
    pca = PCA(n_components=2)
    coords = pca.fit_transform(X.toarray())
    
    result = []
    for i, row in df.iterrows():
        result.append({
            "title": row["title"],
            "x": float(coords[i, 0]),
            "y": float(coords[i, 1]),
            "cluster": int(clusters[i])
        })
    
    return result

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps([]))
            sys.exit(0)
            
        docs = json.loads(input_data)
        if not docs:
            print(json.dumps([]))
            sys.exit(0)
            
        clustered = cluster_documents(docs)
        print(json.dumps(clustered))
    except Exception as e:
        # Fallback or error
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
