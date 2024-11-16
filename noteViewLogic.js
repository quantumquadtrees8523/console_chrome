document.addEventListener('DOMContentLoaded', function () {
    const noteContentElement = document.getElementById('noteContent');
    const noteContent = localStorage.getItem('selectedNoteContent');

    if (noteContent) {
        const parsedNote = JSON.parse(noteContent);

        // Separate and parse markdown for AI and Human notes
        // const aiUpdatedNoteMarkdown = parsedNote.ai_updated_note || "";
        const humanNoteMarkdown = parsedNote.human_note || "";

        // Use marked to parse markdown for each note section
        // const aiNoteHTML = marked.parse(`<h3>AI Updated Note</h3>
        //     <div>${aiUpdatedNoteMarkdown}</div>`);

        const humanNoteHTML = marked.parse(`<div>${humanNoteMarkdown}</div>`);

        // Combine both sections and set them as innerHTML
        noteContentElement.innerHTML = `
            <div class="note-section">${humanNoteHTML}</div>
        `;
    } else {
        noteContentElement.textContent = "No content found.";
    }
});
