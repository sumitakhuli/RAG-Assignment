import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
    url: "http://localhost:6333",
});

async function test() {

    // Create collection
    try {
        await client.createCollection("test_collection", {
            vectors: {
                size: 4,
                distance: "Cosine",
            },
        });

        console.log("Collection created");

    } catch (err) {
        console.log("Collection already exists");
    }

    // Insert vector
    await client.upsert("test_collection", {
        wait: true,
        points: [
            {
                id: 1,
                vector: [0.1, 0.2, 0.3, 0.4],
                payload: {
                    text: "Node.js debugging guide",
                },
            },
        ],
    });

    console.log("Vector inserted");

    // Search vector
    const result = await client.search("test_collection", {
        vector: [0.1, 0.2, 0.3, 0.4],
        limit: 3,
    });

    console.log(JSON.stringify(result, null, 2));
}

test();