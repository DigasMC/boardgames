---
name: Tabletop Haven
colors:
  surface: '#f2f0ea'
  surface-dim: '#dbdad5'
  surface-bright: '#f2f0ea'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#414844'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3f6653'
  primary: '#012d1d'
  on-primary: '#ffffff'
  primary-container: '#1b4332'
  on-primary-container: '#86af99'
  inverse-primary: '#a5d0b9'
  secondary: '#7e562e'
  on-secondary: '#ffffff'
  secondary-container: '#fdc796'
  on-secondary-container: '#79512a'
  tertiary: '#421b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#632c00'
  on-tertiary-container: '#ff8529'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecd4'
  primary-fixed-dim: '#a5d0b9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#274e3d'
  secondary-fixed: '#ffdcbf'
  secondary-fixed-dim: '#f1bc8c'
  on-secondary-fixed: '#2d1600'
  on-secondary-fixed-variant: '#633f19'
  tertiary-fixed: '#ffdbc8'
  tertiary-fixed-dim: '#ffb68a'
  on-tertiary-fixed: '#321300'
  on-tertiary-fixed-variant: '#743500'
  background: '#f2f0ea'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
typography:
  headline-xl:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system is centered on a **Modern Tactile** aesthetic, bridging the gap between physical board game components and a high-performance digital interface. It evokes the cozy, focused atmosphere of a "game night" through rich textures and organic tones while maintaining the speed and clarity of a modern SaaS platform.

The style leverages **subtle depth and layering** to mimic the stacking of cardboard tokens and wooden boards. It avoids excessive skeuomorphism in favor of "Tactile Minimalism"—where the physical inspiration is felt through color, weight, and shadow rather than literal textures. The goal is to make the user feel like they are organized, prepared, and ready to play.

## Colors
This design system utilizes a palette grounded in the natural materials of classic board games.

*   **Primary (Forest Green):** Used for primary navigation, headers, and structural elements to provide a sense of stability and depth.
*   **Secondary (Walnut Brown):** Used for borders, subtle accents, and "wooden" UI elements like dividers or secondary buttons.
*   **Tertiary (Play Orange):** Reserved exclusively for high-priority Call to Actions (CTAs) and "Active" states, providing a high-contrast pop against the green and cream.
*   **Neutral (Parchment):** The background color for the entire application, providing a warm, low-strain reading surface compared to pure white.
*   **Success/Error:** Use a desaturated sap green for success and a burnt sienna for errors to stay within the organic theme.

## Typography
The typography strategy employs a **High-Contrast Pair**:
1.  **Source Serif 4** for headlines provides a literary, authoritative, and classic feel, reminiscent of rulebooks and legacy game boxes.
2.  **Hanken Grotesk** for body and UI elements ensures maximum legibility for data-heavy stats and long lists.

Titles should use tighter letter spacing to feel "locked in," while labels and metadata should use slightly increased tracking for clarity at small sizes.

## Layout & Spacing
The layout follows a **Fluid Grid** system based on an 8px rhythm. 

*   **Desktop:** 12-column grid with 24px gutters. Use wide margins (48px) to create a centered, focused "tabletop" feel.
*   **Tablet:** 8-column grid with 24px gutters.
*   **Mobile:** 4-column grid with 16px gutters.

Card layouts should prioritize "Game Box" proportions (roughly 1:1 or 4:5 aspect ratios) for collection views. Spacing between sections should be generous to maintain a calm, premium aesthetic.

## Elevation & Depth
Elevation in this design system is communicated through **Stacked Tonal Layers** and **Soft Ambient Shadows**. 

1.  **Level 0 (Floor):** The Parchment (`#F9F7F2`) background.
2.  **Level 1 (Card):** White surfaces with a very soft, diffused shadow (Blur: 8px, Y: 2px, Opacity: 4%) and a thin 1px border in a lightened Walnut Brown.
3.  **Level 2 (Interaction/Hover):** When a user interacts with a game card, the shadow expands (Blur: 16px, Y: 8px, Opacity: 8%) to simulate the card being "lifted" from the table.
4.  **Level 3 (Modal/Overlays):** High-elevation surfaces that use a "Scrim" of semi-transparent Forest Green to dim the background.

## Shapes
The shape language is **Rounded**, reflecting the soft edges of die-cut cardboard and wooden meeples. 

*   **Standard (0.5rem):** Used for cards, input fields, and small buttons.
*   **Large (1rem):** Used for featured banners and modal containers.
*   **Pill (Full):** Reserved for status tags (e.g., "In Progress," "Owned") and secondary action chips.

Avoid sharp 0px corners, as they feel too industrial and "digital" for the cozy brand personality.

## Components

### Buttons
*   **Primary:** Solid Forest Green with White text. Bold, slightly rounded corners.
*   **CTA (Play):** Solid Play Orange. This is the only component that uses this color to signify the start of a session.
*   **Secondary:** Outlined in Walnut Brown with Walnut Brown text.

### Cards
Cards are the primary vehicle for game data. Each card should feature a 1px Walnut Brown border (10% opacity). Stats (players, time) should be displayed in a horizontal footer using minimalist icons:
*   **Players:** A meeple icon.
*   **Time:** A stylized hourglass.
*   **Difficulty:** A set of 1-5 small wooden pips/circles.

### Input Fields
Inputs use the Parchment color but darkened by 3% for the fill, with a subtle internal shadow to create an "inset" look, as if the field is carved into the UI.

### Chips & Tags
Used for categories (e.g., "Worker Placement," "Deck Builder"). These should have a light secondary brown background and dark brown text, resembling wooden tiles.

### Navigation
Top navigation should be clean with Forest Green links. The active state is indicated by a small "pawn" or dot icon underneath the text rather than a standard underline.