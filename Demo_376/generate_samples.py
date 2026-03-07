import os

# Categories and their base content for variation
topics = {
    "Technology": [
        "Artificial Intelligence is revolutionizing how we process data.",
        "Blockchain technology provides a decentralized way to record transactions.",
        "Cloud computing allows businesses to scale their infrastructure rapidly.",
        "Cybersecurity is becoming a top priority for modern enterprises.",
        "The Internet of Things connects billions of devices worldwide.",
        "Quantum computing promises to solve problems currently unsolvable by classical computers.",
        "Virtual Reality is creating new immersive experiences in gaming and education.",
        "Edge computing brings processing power closer to the data source.",
        "5G networks are enabling faster mobile communication than ever before.",
        "Software development methodologies like Agile improve team efficiency."
    ],
    "Nature": [
        "The Amazon Rainforest is home to millions of unique species.",
        "Ocean currents play a vital role in regulating the Earth's climate.",
        "Glaciers are melting at an alarming rate due to global warming.",
        "The diversity of coral reefs is essential for marine life survival.",
        "Desert ecosystems have adapted to extreme temperatures and lack of water.",
        "National parks preserve the natural beauty and wildlife of the country.",
        "Pollination by bees is critical for the growth of many crops.",
        "Photosynthesis is the process by which plants convert sunlight into energy.",
        "The migration of birds is a fascinating natural phenomenon.",
        "Volcanic eruptions can create new landforms and enrich the soil."
    ],
    "History": [
        "The Roman Empire was one of the most powerful civilizations in history.",
        "The Industrial Revolution transformed societies from agrarian to industrial.",
        "Ancient Egyptian pyramids remain a marvel of engineering and architecture.",
        "The Renaissance was a period of great artistic and cultural revival.",
        "The Magna Carta laid the foundation for modern constitutional law.",
        "The Silk Road connected the East and West through trade and culture.",
        "The French Revolution changed the political landscape of Europe.",
        "The Apollo 11 mission was the first to land humans on the Moon.",
        "The Great Wall of China was built to protect against invasions.",
        "Medieval castles served as both fortresses and residences for nobility."
    ],
    "Health": [
        "A balanced diet is essential for maintaining a healthy lifestyle.",
        "Regular physical exercise reduces the risk of chronic diseases.",
        "Mental health awareness is growing in importance globally.",
        "Sleep deprivation can have serious effects on cognitive function.",
        "Vaccines have eradicated or controlled many infectious diseases.",
        "The human brain is the most complex organ in the body.",
        "Genetics plays a significant role in determining individual traits.",
        "Hydration is key to the proper functioning of all bodily systems.",
        "Meditation and mindfulness can help reduce stress and anxiety.",
        "Advances in medical technology are improving patient outcomes."
    ],
    "Business": [
        "Effective marketing strategies are crucial for brand growth.",
        "The stock market reflects the economic health of a nation.",
        "Entrepreneurship involves taking risks to create new value.",
        "Financial management is the key to a company's long-term success.",
        "Supply chain logistics ensure products reach customers efficiently.",
        "Leadership styles vary depending on the organizational culture.",
        "E-commerce has transformed how consumers shop for goods.",
        "Venture capital provides funding for high-growth startups.",
        "Business ethics promote trust and transparency in the workplace.",
        "Global trade agreements impact the flow of goods and services."
    ]
}

os.makedirs('samples', exist_ok=True)

count = 0
for category, sentences in topics.items():
    for i, sentence in enumerate(sentences):
        filename = f"samples/{category.lower()}_{i+1}.txt"
        with open(filename, 'w') as f:
            # Create a bit more content by repeating and varying
            f.write(f"Topic: {category}\n\n")
            f.write(sentence + "\n")
            f.write(f"This document discusses various aspects of {category.lower()}.\n")
            f.write(f"It is important to understand how {category.lower()} affects our world today.\n")
            f.write(f"Further research into {category.lower()} will likely yield more insights.\n")
        count += 1

print(f"Generated {count} sample files in 'samples/' directory.")
