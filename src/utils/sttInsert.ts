import type { Editor, EditorPosition } from "obsidian";

/** Join Moshi word stream with spaces (matches runpod client). */
export function joinTranscriptWords(existing: string, word: string): string {
	const next = word.trim();
	if (!next) return existing;
	if (!existing) return next;
	return `${existing} ${next}`;
}

/**
 * Live insert helper: first update replaces selection (or inserts at cursor);
 * further words expand the same range so unrelated edits aren't scrambled.
 */
export class LiveTranscriptInsert {
	private readonly editor: Editor;
	private from: EditorPosition;
	private to: EditorPosition;
	private text = "";

	constructor(editor: Editor) {
		this.editor = editor;
		this.from = editor.getCursor("from");
		this.to = editor.getCursor("to");
	}

	get transcript(): string {
		return this.text;
	}

	appendWord(word: string): void {
		const next = joinTranscriptWords(this.text, word);
		if (next === this.text) return;
		this.editor.replaceRange(next, this.from, this.to);
		this.text = next;
		const start = this.editor.posToOffset(this.from);
		this.to = this.editor.offsetToPos(start + next.length);
	}
}
