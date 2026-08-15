# UI Style Guide

## 1. Direction and design language

This application uses a modern Islamic reading interface with a warm, premium, and calm atmosphere. The overall feel is:

- elegant and quiet
- premium mobile-first
- reading-focused
- rooted in Islamic visual cues without being too ornate
- dark mode as the default, with a soft light alternative

The layout is designed for long reading sessions, with spacious cards, limited visual noise, and strong contrast for Arabic text and important actions.

## 2. Visual system

### Layout style

- Mobile-first layout
- Rounded cards and panels
- Soft shadows and subtle glow accents
- Use of geometric pattern overlay to suggest Islamic aesthetics
- Dense content blocks separated by subtle borders
- Primary actions are elevated through contrast, not aggression

### General spacing and structure

- Large top padding for hero/header sections
- Content blocks grouped into cards with clear section titles
- Generous spacing between reading blocks and menu areas
- Buttons and interactive elements remain comfortable for thumb reach on mobile

## 3. Typography

### Primary Latin font

- Font family: Inter
- Usage: body text, labels, UI text, navigation, small metadata
- Tone: clean, modern, highly readable

### Serif heading font

- Font family: Lora
- Usage: headings, section titles, premium text accents
- Tone: elegant and classic

### Arabic font

- Font family: Scheherazade New, Amiri, Traditional Arabic
- Usage: Quran verses, Arabic headings, important script emphasis
- Tone: classic, readable, and respectful for sacred text

### CSS configuration

The project defines these fonts in `src/index.css`:

- `--font-sans: 'Inter', sans-serif`
- `--font-serif: 'Lora', serif`
- `--font-arabic: 'Scheherazade New', 'Amiri', 'Traditional Arabic', serif`

Arabic text uses:

- `font-family: var(--font-arabic)`
- `direction: rtl`
- `text-align: right`

## 4. Color palette

### Dark theme (default)

- Background: `#0d1f1a`
- Foreground / primary text: `#f2ead8`
- Card background: `#122b24`
- Secondary background: `#1a3d32`
- Primary accent: `#c9a84c`
- Accent highlight: `#e8c96a`
- Muted text: `#8fa897`
- Border: `#243d32`

### Light theme

- Background: `#faf7f0`
- Foreground / primary text: `#1a2e26`
- Card background: `#ffffff`
- Secondary background: `#eef5f0`
- Primary accent: `#a8823a`
- Accent highlight: `#c9a84c`
- Muted text: `#6b8f7c`
- Border: `#ddd8c4`

### Color philosophy

The palette combines:

- deep green/teal as the main foundation
- warm gold as the spiritual and premium accent
- cream/ivory for surfaces and contrast on light mode

This creates a calming, authentic, spiritual aesthetic while keeping the UI readable and modern.

## 5. Theme behavior

The app supports a light/dark switch through a theme context. The design uses CSS variables instead of hardcoded colors so the UI remains consistent across both themes.

Core tokens used throughout the app include:

- `--bg`
- `--fg`
- `--card-bg`
- `--primary`
- `--accent`
- `--border`
- `--muted-fg`

## 6. Component visual behavior

### Cards

- Rounded corners with large inner padding
- Subtle border and background color separation
- Designed for information, verse previews, quick actions, and navigation

### Buttons

- Soft rectangular shapes
- Premium gold accents for primary or highlighted interaction
- Minimal hover/focus variation, mostly through color and border emphasis

### Reading surfaces

- Clean, low-noise surfaces
- Arabic verses get larger scale and stronger hierarchy
- Translation text is smaller and less dominant than the Arabic text

### Navigation

- Bottom navigation style for mobile app feel
- Active item uses stronger color and contrast
- Minimal icon + label composition

## 7. Decorative cues

The interface uses subtle Islamic-inspired geometric patterns as a background overlay. These patterns are intentionally soft and low-opacity so they support the spiritual theme without overwhelming the reading experience.

## 8. UI tone summary

This design language is best described as:

- premium Islamic mobile app
- warm and respectful
- reading-first and minimal
- balanced between modern UI and spiritual identity

## 9. File references

Main styling sources:

- `src/index.css`
- `src/App.tsx`

These files define the color system, theme variables, fonts, spacing, and major UI styling patterns.
