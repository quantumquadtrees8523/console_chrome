// Shape of notes: 
// date_time: 'Sun, 17 Nov 2024 02:04:04 GMT', google_user_id: '102049077090928333881', human_note: '<p>test </p>', note_headline: 'This is a short test.\n'}
// date_time
// : 
// "Sun, 17 Nov 2024 02:04:04 GMT"
// google_user_id
// : 
// "102049077090928333881"
// human_note
// : 
// "<p>test </p>"
// note_headline
// : 
// "This is a short test.\n"

document.addEventListener('DOMContentLoaded', function () {
    const noteContentElement = document.getElementById('noteContent');
    const noteContent = localStorage.getItem('selectedNoteContent');
    console.log(noteContent);
    if (noteContent) {
        noteContentElement.innerHTML = `
            <div class="note-section">${noteContent}</div>`;
    } else {
        noteContentElement.textContent = "No content found.";
    }
});
