# Narrator

An Obsidian plugin for narrating your notes with AI-powered voice generation.

## Features

- **Narrate Full Notes**: Right-click any markdown file to narrate its entire contents
- **Narrate Selected Text**: Highlight text in the editor and narrate just that selection
- **Create Character Scripts**: Automatically generate script files with character breakdowns for multi-voice narration
- **Embedded UI**: Seamlessly integrated into Obsidian with context menus - no additional views needed

## Installation

### For Development

1. Clone this repository into your Obsidian plugins folder:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone https://github.com/yourusername/narrator.git
   cd narrator
   ```

2. Install dependencies using pnpm:
   ```bash
   pnpm install
   ```

3. Build the plugin:
   ```bash
   pnpm run dev
   ```

4. Enable the plugin in Obsidian:
   - Open Settings → Community plugins
   - Reload plugins
   - Enable "Narrator"

### From Obsidian Community Plugins

Coming soon!

## Usage

### Narrating a Full Note

1. Right-click on any markdown file in the file explorer
2. Select "Narrate" from the context menu
3. The audio will be generated and saved to your narration folder

### Narrating Selected Text

1. Open any note in the editor
2. Highlight the text you want to narrate
3. Right-click the selection
4. Select "Narrate Selection" from the context menu

### Creating a Script

1. Right-click on any markdown file
2. Select "Create Script" from the context menu
3. A new file will be created with the suffix "-script.md"
4. Edit the script to assign dialogue to different characters using tags:
   - `[NARRATOR]`
   - `[CHARACTER 1]`
   - `[CHARACTER 2]`
   - etc.

### Command Palette

You can also access these features via the Command Palette (Cmd/Ctrl + P):
- "Narrate active note"
- "Create script from active note"

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Run in development mode (watches for changes)
pnpm run dev

# Build for production
pnpm run build

# Lint code
pnpm run lint
```

### Project Structure

```
narrator/
├── main.ts              # Plugin entry point
├── manifest.json        # Plugin metadata
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── esbuild.config.mjs   # Build configuration
├── styles.css           # Custom styles
└── versions.json        # Version compatibility
```

### Key Files

- **main.ts**: Contains the main plugin class with context menu registration and placeholder service methods
- **manifest.json**: Plugin metadata (id, name, version, etc.)
- **esbuild.config.mjs**: Handles TypeScript compilation and bundling

## Roadmap

- [ ] Implement narration service integration
- [ ] Add audio file storage to designated folder
- [ ] Support for multiple voice characters
- [ ] Customizable voice settings
- [ ] Audio playback controls
- [ ] Script parsing and character detection

## Technical Details

### Architecture

The plugin follows Obsidian's plugin API best practices:
- Context menus for embedded UI (`file-menu` and `editor-menu`)
- Command palette integration
- Persistent settings storage
- TypeScript with strict mode
- esbuild for fast bundling

### Implementation Notes

**Context Menus:**
- File menu: Shows "Narrate" and "Create Script" options on markdown files
- Editor menu: Shows "Narrate Selection" when text is selected

**Placeholder Services:**
The current implementation includes placeholder methods for:
- `narrateFile()`: Will integrate with narration API
- `narrateText()`: Will handle selected text narration
- `createScript()`: Generates basic script template (working)
- `generateScriptContent()`: Will implement character detection

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

If you encounter any issues or have feature requests, please open an issue on GitHub.

## Credits

Created by Joe
