import { describe, expect, it, vi } from "vitest";
import { LiveTranscriptInsert, joinTranscriptWords } from "../../../src/utils/sttInsert";

function makeEditor(initialSelection = { from: { line: 0, ch: 5 }, to: { line: 0, ch: 5 } }) {
	let content = "Hello world";
	const from = { ...initialSelection.from };
	const to = { ...initialSelection.to };

	return {
		content: () => content,
		getCursor: (mode?: string) => {
			if (mode === "from") return { ...from };
			if (mode === "to") return { ...to };
			return { ...to };
		},
		posToOffset: (pos: { line: number; ch: number }) => pos.ch,
		offsetToPos: (offset: number) => ({ line: 0, ch: offset }),
		replaceRange: vi.fn((text: string, rangeFrom: { ch: number }, rangeTo: { ch: number }) => {
			const before = content.slice(0, rangeFrom.ch);
			const after = content.slice(rangeTo.ch);
			content = before + text + after;
			to.ch = rangeFrom.ch + text.length;
			from.ch = rangeFrom.ch;
		}),
	};
}

describe("LiveTranscriptInsert", () => {
	it("inserts at cursor and appends subsequent words", () => {
		const editor = makeEditor();
		const insert = new LiveTranscriptInsert(editor as never);
		insert.appendWord("foo");
		insert.appendWord("bar");
		expect(editor.content()).toBe("Hellofoo bar world");
		expect(insert.transcript).toBe("foo bar");
		expect(joinTranscriptWords("a", "b")).toBe("a b");
	});

	it("replaces selection on first word", () => {
		const editor = makeEditor({
			from: { line: 0, ch: 0 },
			to: { line: 0, ch: 5 },
		});
		const insert = new LiveTranscriptInsert(editor as never);
		insert.appendWord("Hi");
		expect(editor.content()).toBe("Hi world");
		insert.appendWord("there");
		expect(editor.content()).toBe("Hi there world");
	});
});
