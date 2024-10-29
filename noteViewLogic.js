document.addEventListener('DOMContentLoaded', function () {
    const noteContentElement = document.getElementById('noteContent');
    const noteContent = localStorage.getItem('selectedNoteContent');

    if (noteContent) {
        const parsedNote = JSON.parse(noteContent);

        // Convert ai_updated_note and human_note to markdown, with spacing in between
        const aiUpdatedNoteMarkdown = parsedNote.ai_updated_note || "";
        const humanNoteMarkdown = parsedNote.human_note || "";

        // Use marked to parse markdown to HTML, with spacing between sections
        noteContentElement.innerHTML = marked.parse(`${aiUpdatedNoteMarkdown}\n\n\n\n\n\n\n${humanNoteMarkdown}`);
    } else {
        noteContentElement.textContent = "No content found.";
    }
});
