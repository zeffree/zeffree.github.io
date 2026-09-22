---
name: Project Control Room
description: A working screen wall with source-backed project material and clear native controls.
colors:
  cp-accent: "#b11f4b"
  cp-accent-dark: "#fd8ea1"
  cp-accent-hover: "#9a1a41"
  cp-accent-hover-dark: "#fb7b91"
  cp-accent-soft: "rgba(177, 31, 75, 0.08)"
  cp-accent-soft-dark: "rgba(253, 142, 161, 0.14)"
  cp-accent-fg: "#ffffff"
  cp-accent-fg-dark: "#1a1a1a"
  cp-link: "#0078d4"
  cp-link-dark: "#4da6ff"
  cp-warning: "#f59e0b"
  cp-warning-dark: "#fbbf24"
  cp-bg: "#f7f4ef"
  cp-bg-dark: "#3d3b3a"
  cp-bg-elevated: "#fcfbf8"
  cp-bg-elevated-dark: "#343231"
  cp-surface: "#ffffff"
  cp-surface-dark: "#292929"
  cp-surface-soft: "#f5f5f5"
  cp-surface-soft-dark: "#2e2e2e"
  cp-border: "#dedede"
  cp-border-dark: "#474747"
  cp-border-strong: "#919191"
  cp-border-strong-dark: "#5f5f5f"
  cp-text: "#242424"
  cp-text-dark: "#dedede"
  cp-readable-muted: "#5c5c5c"
  cp-readable-muted-dark: "#b0b0b0"
  cp-overlay: "rgba(255, 255, 255, 0.8)"
  cp-overlay-dark: "rgba(41, 41, 41, 0.88)"
typography:
  display:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(38px, 5.2vw, 72px)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(32px, 3.3vw, 48px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-.04em"
  selected-title:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(25px, 2.45vw, 36px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-.035em"
  title:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.025em"
  body:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.55
  button:
    fontFamily: "Segoe UI, Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.35
rounded:
  small: "4px"
  compact: "8px"
  control: "10px"
  panel: "12px"
  large: "16px"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "40": "40px"
components:
  button-primary:
    backgroundColor: "{colors.cp-accent}"
    textColor: "{colors.cp-accent-fg}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.cp-accent-hover}"
    textColor: "{colors.cp-accent-fg}"
  button-light:
    backgroundColor: "{colors.cp-surface}"
    textColor: "{colors.cp-text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-light-hover:
    backgroundColor: "{colors.cp-bg}"
    textColor: "{colors.cp-text}"
  button-outline:
    textColor: "{colors.cp-text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-outline-hover:
    backgroundColor: "{colors.cp-accent-soft}"
    textColor: "{colors.cp-accent}"
  search-input:
    textColor: "{colors.cp-text}"
    rounded: "{rounded.small}"
  channel:
    textColor: "{colors.cp-text}"
    rounded: "{rounded.compact}"
    padding: "12px"
  channel-selected:
    backgroundColor: "{colors.cp-accent}"
    textColor: "{colors.cp-accent-fg}"
  category-filter:
    textColor: "{colors.cp-text}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  category-filter-selected:
    backgroundColor: "{colors.cp-text}"
    textColor: "{colors.cp-bg}"
  topic-tag:
    textColor: "{colors.cp-readable-muted}"
    rounded: "{rounded.small}"
    padding: "2px 6px"
  monitor-frame:
    backgroundColor: "{colors.cp-surface}"
    textColor: "{colors.cp-text}"
    rounded: "{rounded.panel}"
    padding: "7px"
  project-row:
    textColor: "{colors.cp-text}"
    padding: "28px 0"
  project-dialog:
    backgroundColor: "{colors.cp-surface}"
    textColor: "{colors.cp-text}"
    rounded: "{rounded.large}"
    padding: "0"
---

# Design System: Project Control Room

## Overview

**Creative North Star: "The Working Screen Wall"**

A blue broadcast field, aluminum-like monitor frames, signal accents, and direct native controls give the work a physical setting. Depth belongs to the screens and their selection; surrounding text and controls stay clear, practical, and readily readable.

The material is actual project imagery, not decorative UI reconstructions. Heavy system sans supplies the display voice, while compact metadata and a flat, ruled index support closer inspection. Native semantic HTML, CSS, and small ES modules carry the implementation; no frontend framework or 3D engine is required.

**Key Characteristics:**
- Shared Clawpilot colors in light and dark themes.
- Heavy system-sans display with readable secondary copy.
- Structural monitor depth beside a flat, ruled index.
- Short, interruptible selection motion with a complete reduced-motion path.
- Source-backed previews and native, keyboard-accessible controls.

This records the implemented system in `styles.css`, `scripts\render.mjs`, and `assets\portfolio.js`. Homepage composition, visitor mode, and direction provenance remain in `.impeccable\surfaces\index-html.md`; they are not global tokens.

## Colors

Warm neutral surroundings, a clear broadcast blue, and Clawpilot's rose and amber signals create the palette; project screenshots retain their own colors.

Unsuffixed frontmatter colors record the light theme. Each `-dark` key records the same CSS property's value under `html[data-theme="dark"]`, not a second runtime variable. Component references describe the light theme; the implementation and sidecar specimens remain theme-aware through the original `--cp-*` properties in `scripts\render.mjs`.

### Primary
- **Rose signal** (`cp-accent`): selected channels, primary actions, links, and ordinary focus outlines. `cp-accent-hover` supplies the action hover state; `cp-accent-soft` supplies quiet hover fills.
- **Signal foreground** (`cp-accent-fg`): text against accent and broadcast fields. Use the matching theme counterpart, not a permanently white label.

### Secondary
- **Broadcast blue** (`cp-link`): the immersive screen field. This shared token is the field color even though its source name also describes a link role.

### Tertiary
- **Amber signal** (`cp-warning`): broadcast punctuation and the small signal indicator. Its implemented role here is a signal accent, not a new status taxonomy.

### Neutral
- **Warm canvas / raised canvas** (`cp-bg`, `cp-bg-elevated`): the surrounding page, channel housing, notices, and honest preview fallbacks.
- **Monitor metal / soft inset** (`cp-surface`, `cp-surface-soft`): light or dark neutral frames, dialog surfaces, and inset controls. The aluminum character comes from assembly, border, and depth rather than an additional metallic color.
- **Fine rule / strong rule** (`cp-border`, `cp-border-strong`): separation, frame edges, and small outlined markers.
- **Primary ink / readable secondary ink** (`cp-text`, `cp-readable-muted`): titles and controls versus descriptions, dates, and supporting metadata.
- **Modal veil** (`cp-overlay`): the native dialog backdrop; its source transparency is retained.

`--cp-readable-muted` resolves to `--cp-text-muted` in light mode and `--cp-text-soft` in dark mode. Its frontmatter entries record those effective values; the lower-contrast dark `--cp-text-muted` is not the secondary-copy standard. Sidecar tonal ramps are derived swatch aids only, not extra runtime palette values.

**The Shared Signal Rule.** Use the existing Clawpilot properties for interface color; let project imagery keep its source colors without promoting them into UI tokens.

## Typography

**Display and body font:** the system stack in the frontmatter, beginning with Segoe UI and retaining Aptos, Calibri, the Apple system fallbacks, and sans-serif. Display is heavy system sans, not a custom illustrative face. Buttons, inputs, and selects inherit the same family; there is no separate mono family.

**Character:** tightly tracked, balanced headings carry the broadcast voice. Sentence-case control labels and open body leading remain practical. This is a role-led ramp, not a fixed modular ratio.

### Hierarchy
- **Display:** the heaviest, fluid display role; below the mobile breakpoint its clamp becomes (36px, 7.5vw, 55px).
- **Headline:** a fluid section heading with the same compact tracking and less weight than the display.
- **Selected title:** fluid project emphasis, becoming a stable mobile size (27px); long titles wrap rather than overflow.
- **Title:** the project-row heading, adapting at the medium breakpoint (21px) and mobile breakpoint (24px).
- **Body:** project summaries use the frontmatter body role, with measure capped at (67ch) for selection copy and (72ch) for index and detail copy. The page's inherited line height is (1.55); summary leading is intentionally more open.
- **Label:** semibold field and status labels. Supporting metadata stays regular and generally (11–13px); channel numbers use tabular numerals. Small screen captions are chrome, not a replacement for the full project title or description.
- **Button:** compact semibold action text, kept legible within generous hit areas rather than made large to imply importance.

**The Readable Metadata Rule.** Use readable secondary ink for descriptions, dates, and field hints; preserve wrapping and text hierarchy instead of hiding essential information in tiny screen chrome.

## Layout

The shared masthead, index, and footer use a centered shell capped at (1376px), with desktop side gutters (48px). Gutters reduce at the medium viewport boundary (1100px) to (32px), at the mobile boundary (760px) to (20px), and at the narrow boundary (380px) to (16px). The broadcast region has its own inset and is capped on wide viewports; its exact staging remains surface-specific.

Spacing follows the reused four-pixel steps in the frontmatter. Small internal gaps distinguish labels and actions; larger gaps separate metadata groups, content blocks, and sections. The index is a direct grid of channel number, preview, flexible copy, and actions, divided by horizontal rules rather than repeated floating panels.

At the mobile boundary, depth is translated into one unrotated, full-width screen. Supporting angled screens and floor lines disappear; the channel strip stays horizontally scrollable with explicit previous/next controls. Selection copy stacks, search becomes full width, category controls scroll horizontally, and index copy moves below its preview/action row. At the narrow boundary, actions stack rather than compress their targets.

Use natural wrapping for descriptions, project names, and links, with explicit overflow handling for long values. Screen-bar titles may truncate because the full project title is separately visible. Native controls generally retain a minimum hit area (44px); the shared action buttons use a larger minimum height (48px) on desktop.

## Elevation & Depth

Depth is structural: neutral framed screens overlap in CSS perspective, and the main screen reads as a physical display. The shared `--cp-shadow` gives both monitors and the modal a consistent lift; its exact light/dark values live in the sidecar. Fine borders define the assembly. The index, metadata, and ordinary controls rely on rules and tonal contrast instead of floating-card shadows.

**The Structural Depth Rule.** Reserve physical depth for monitor selection and the modal layer; keep the direct index flat and readable rather than treating every content group as another floating screen.

## Shapes

Small corners belong to tags, key hints, and inset preview material; compact corners belong to channels and rail arrows; control corners belong to buttons, filters, and the dialog close control. Panel corners unite monitor frames and expanded details. The largest shared corners belong to the broadcast container and dialog, stepping down on mobile.

Borders are normally thin (1px), strengthened for key separators and forced-color affordances. Monitor content clips to its inset; previews use top-aligned cover cropping. General preview material uses an (8:5) ratio, with the wide monitor crop (2:1) returning to (8:5) on mobile. Circular signal indicators remain small accents within the rectilinear assembly.

## Components

### Buttons

Clear native actions, differentiated by role rather than ornamental effects. Primary actions use the rose signal and its paired foreground; light actions use a neutral surface against the blue field; outline actions use readable borders and acquire a soft signal fill on hover. Shared radius, padding, and type are in the frontmatter. Color feedback is short (160ms, ease-out). Disabled controls retain their native disabled behavior and reduce opacity.

Focus remains explicit: an accent outline (3px, offset 5px) on neutral surfaces, a contrasting signal-foreground outline on the broadcast field, and an inset accent outline in the channel housing. Never remove focus to preserve a material effect.

### Inputs and filters

Search has a persistent visible label, native search input, underline-style boundary, and a clear action with an accessible name. The boundary changes to accent on focus within; input focus is still visible. Search text uses a readable size (15px), with a minimum field height (48px). The slash shortcut is supplemental, not the only entry point.

Category filters are rounded native buttons. Their selected state uses primary ink over the page's inverse foreground pairing, plus a check mark and `aria-pressed`; unselected filters use a fine outline. Topic tags are quieter, small outlined labels, not simulated buttons. Sorting remains a labeled native select.

### Navigation

The named channel rail is an explicit control surface: numbered native buttons, a visible title, a selected check mark, and previous/next actions. Selection uses the signal fill and paired foreground. Enhancement adds a roving focus target, left/right and Home/End handling, and alignment within the scrollable track. It remains usable by click or touch; color and screen angle are not the only selection cues.

### Monitor frames and project rows

The monitor is the material component: a neutral frame, fine edge, compact title bar, clipped real preview, and small action caption. Its full project name, description, and launch action remain readable outside the tiny chrome. The corresponding index row is a flat article with a preview link, title, description, factual metadata, and direct launch/source links; expanded native details supply the deeper view.

**The Source Material Rule.** Show source-backed project snapshots with descriptive alternatives, capture context, and an honest unavailable-preview fallback; do not recolor screenshots to simulate the interface palette or imply that snapshots are live data.

### Detail dialog and native fallback

Details enhance existing `details`/`summary` content with a labeled native dialog, a sticky heading, an accessible close control, and the same project material. Escape, backdrop interaction, and history close the enhanced view; focus returns to its opener when available, otherwise to search. Without dialog support, inline details open and receive focus. Without successful JavaScript enhancement, useful static project content and links remain available.

### Selection motion

Physical-screen selection is brief and interruptible. Supporting screens respond with a short transform transition (320ms); selection combines a brief preview fade/reveal (120ms out, 360ms in) with optional desktop screen settling (420ms). The selection easing is the implemented spring-like cubic curve recorded in the sidecar. Dialog and small affordance feedback use a shorter response (180ms).

New selection cancels or skips an in-flight transition instead of queuing movement. The device's reduced-motion preference takes precedence; the visible motion control can reduce motion further. Reduced motion preserves every action, disables animated scrolling and transitions, and removes screen rotation. Mobile omits the depth-settling animation. Unsupported optional animation APIs fall back to direct updates.

**The Interruptible Selection Rule.** Motion acknowledges the current selection and yields immediately to the next action, reduced-motion settings, or a hidden document; it never becomes a prerequisite for reaching the work.

## Do's and Don'ts

### Do:
- Do bind interface colors to the existing Clawpilot properties and keep light/dark role pairings intact.
- Do use the system font stack, readable secondary ink, wrapping copy, and visible focus.
- Do keep monitor depth structural and the direct index flat.
- Do retain labeled native controls, generous targets, keyboard paths, and static details.
- Do use actual project snapshots with capture context and honest unavailable-preview fallbacks.
- Do keep selection motion short, interruptible, and optional.

### Don't:
- Don't turn screenshot colors, unused theme declarations, or sidecar swatch ramps into new interface tokens.
- Don't replace the heavy system display with an illustrative custom font.
- Don't use the dark theme's lower-contrast muted declaration for ordinary metadata.
- Don't make information or navigation depend on hover, depth, color alone, or animation.
- Don't present snapshot content as live telemetry or replace missing evidence with a fabricated interface.
