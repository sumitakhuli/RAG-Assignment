async function uploadPDF() {

    const fileInput =
        document.getElementById("file");

    const uploadStatus =
        document.getElementById(
            "uploadStatus"
        );

    if (!fileInput.files[0]) {

        alert("Please select a PDF");

        return;
    }

    uploadStatus.innerText =
        "Uploading and processing PDF...";

    const formData =
        new FormData();

    formData.append(
        "file",
        fileInput.files[0]
    );

    const response =
        await fetch("/upload", {

            method: "POST",

            body: formData,
        });

    const data =
        await response.json();

    uploadStatus.innerText =
        data.message;
}


async function askQuestion() {

    const questionInput =
        document.getElementById(
            "question"
        );

    const question =
        questionInput.value;

    if (!question) return;

    const chatBox =
        document.getElementById(
            "chatBox"
        );

    // Add user message
    chatBox.innerHTML += `
        <div class="user-message">
            ${question}
        </div>
    `;

    questionInput.value = "";

    // Loading message
    chatBox.innerHTML += `
        <div class="bot-message" id="loading">
            Thinking...
        </div>
    `;

    chatBox.scrollTop =
        chatBox.scrollHeight;

    // API call
    const response =
        await fetch("/chat", {

            method: "POST",

            headers: {
                "Content-Type":
                  "application/json",
            },

            body: JSON.stringify({
                question,
            }),
        });

    const data =
        await response.json();

    // Remove loading
    document
        .getElementById("loading")
        .remove();

    // Add bot response
    chatBox.innerHTML += `
        <div class="bot-message">
            ${data.answer}
        </div>
    `;

    chatBox.scrollTop =
        chatBox.scrollHeight;
}