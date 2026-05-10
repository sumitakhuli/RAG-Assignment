import "dotenv/config";

import express from "express";
import cors from "cors";
import multer from "multer";

import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";

import { GoogleGenerativeAI }
from "@google/generative-ai";

import { QdrantClient }
from "@qdrant/js-client-rest";

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static("."));


// ==========================
// GEMINI SETUP
// ==========================

const genAI =
    new GoogleGenerativeAI(
        process.env.GEMINI_API_KEY
    );

const embeddingModel =
    genAI.getGenerativeModel({
        model: "text-embedding-004",
    });

const chatModel =
    genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
    });


// ==========================
// QDRANT SETUP
// ==========================

const qdrant =
    new QdrantClient({
        url: "http://localhost:6333",
    });


// ==========================
// MULTER SETUP
// ==========================

const upload = multer({
    dest: "uploads/",
});


// ==========================
// CHUNKING FUNCTION
// ==========================

function chunkText(
    text,
    chunkSize = 1000
) {

    const chunks = [];

    for (
        let i = 0;
        i < text.length;
        i += chunkSize
    ) {

        chunks.push(
            text.slice(
                i,
                i + chunkSize
            )
        );
    }

    return chunks;
}


// ==========================
// PDF UPLOAD ROUTE
// ==========================

app.post(
    "/upload",
    upload.single("file"),

    async (req, res) => {

        try {

            // Read PDF
            const dataBuffer =
                fs.readFileSync(
                    req.file.path
                );

            // Parse PDF
            const pdfData =
                await pdf(dataBuffer);

            // Extract text
            const text =
                pdfData.text;

            // Chunk text
            const chunks =
                chunkText(text);

            // Delete old collection
            try {

                await qdrant.deleteCollection(
                    "rag-docs"
                );

                console.log(
                    "Old collection deleted"
                );

            } catch (err) {

                console.log(
                    "No old collection found"
                );
            }

            // Create collection
            await qdrant.createCollection(
                "rag-docs",
                {
                    vectors: {
                        size: 768,
                        distance: "Cosine",
                    },
                }
            );

            console.log(
                "Collection created"
            );


            // Store chunks
            for (const chunk of chunks) {

                // Generate embedding
                const embeddingResult =
                    await embeddingModel
                    .embedContent(chunk);

                const embedding =
                    embeddingResult
                    .embedding
                    .values;

                // Insert into Qdrant
                await qdrant.upsert(
                    "rag-docs",
                    {
                        wait: true,

                        points: [
                            {
                                id:
                                  crypto.randomUUID(),

                                vector:
                                  embedding,

                                payload: {
                                    text:
                                      chunk,
                                },
                            },
                        ],
                    }
                );
            }

            console.log(
                "PDF uploaded successfully"
            );

            res.json({
                message:
                  "PDF uploaded successfully",
            });

        } catch (err) {

            console.log(err);

            res.status(500).json({
                error:
                  "Upload failed",
            });
        }
    }
);


// ==========================
// CHAT ROUTE
// ==========================

app.post(
    "/chat",

    async (req, res) => {

        try {

            const { question } =
                req.body;

            // Embed question
            const queryEmbeddingResult =
                await embeddingModel
                .embedContent(question);

            const queryEmbedding =
                queryEmbeddingResult
                .embedding
                .values;


            // Search Qdrant
            const searchResults =
                await qdrant.search(
                    "rag-docs",
                    {
                        vector:
                          queryEmbedding,

                        limit: 5,
                    }
                );

            // Build context
            const context =
                searchResults
                .map(r =>
                    r.payload.text
                )
                .join("\n\n");


            // Generate answer
            const response =
                await chatModel
                .generateContent(`

Answer ONLY from the context below.

If answer is not present say:
"I could not find this in the document."

Context:
${context}

Question:
${question}
`);

            const answer =
                response.response.text();

            res.json({
                answer,
            });

        } catch (err) {

            console.log(err);

            res.status(500).json({
                error:
                  "Chat failed",
            });
        }
    }
);


// ==========================
// START SERVER
// ==========================

app.listen(8000, () => {

    console.log(
        "Server running on http://localhost:8000"
    );
});