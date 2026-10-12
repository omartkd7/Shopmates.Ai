---
name: ShopMate AI
colors:
  surface: '#fff8f6'
  surface-dim: '#e9d6d1'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ed'
  surface-container: '#feeae5'
  surface-container-high: '#f8e4df'
  surface-container-highest: '#f2ded9'
  on-surface: '#231917'
  on-surface-variant: '#56423d'
  inverse-surface: '#392e2b'
  inverse-on-surface: '#ffede8'
  outline: '#8a726c'
  outline-variant: '#ddc0b9'
  surface-tint: '#a04025'
  primary: '#9c3e23'
  on-primary: '#ffffff'
  primary-container: '#bc5539'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb5a1'
  secondary: '#496640'
  on-secondary: '#ffffff'
  secondary-container: '#caecbc'
  on-secondary-container: '#4f6c45'
  tertiary: '#006768'
  on-tertiary: '#ffffff'
  tertiary-container: '#008283'
  on-tertiary-container: '#f3fffe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd1'
  primary-fixed-dim: '#ffb5a1'
  on-primary-fixed: '#3b0900'
  on-primary-fixed-variant: '#802910'
  secondary-fixed: '#caecbc'
  secondary-fixed-dim: '#afd0a1'
  on-secondary-fixed: '#062104'
  on-secondary-fixed-variant: '#324e2a'
  tertiary-fixed: '#8ff3f3'
  tertiary-fixed-dim: '#72d6d7'
  on-tertiary-fixed: '#002020'
  on-tertiary-fixed-variant: '#004f50'
  background: '#fff8f6'
  on-background: '#231917'
  surface-variant: '#f2ded9'
typography:
  display-lg:
    fontFamily: Lexend
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Lexend
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Lexend
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Lexend
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Lexend
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Lexend
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: Lexend
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  bubble-padding: 12px 16px
  card-padding: 20px
---

## Brand & Style
The design system is built on the principle of **"Trust through conversational clarity."** It rejects the generic high-tech "AI" aesthetic in favor of a warm, human-centric interface tailored for the Moroccan market. 

The visual style is **Modern Tactile**, utilizing high-contrast neutrals for sunlight readability and soft, organic shapes that mirror the warmth of local architecture and landscapes. This design system prioritizes legibility, explicit confirmation states, and radical transparency in AI decision-making. 
- **Human & Local:** Warm earth tones and geometric clarity.
- **Radical Transparency:** Clear visual separation between AI "thinking" and "output."
- **Actionable Trust:** Tactile, high-contrast cards for transactional finality.

## Colors
This design system uses a palette inspired by the Moroccan landscape—Terracotta, Sage, and Saffron—to create a sense of reliability and local familiarity. 

- **Primary (Terracotta):** Used for user chat bubbles and primary "Call to Action" buttons.
- **Secondary (Sage):** Used for assistant-related elements and subtle highlights.
- **Accent (Saffron):** Reserved exclusively for Cash-on-Delivery (COD) badges and attention-critical status indicators.
- **Neutrals:** A high-contrast ramp starting from **Sand (#F9F7F2)** to ensure the screen remains readable under direct Moroccan sunlight.

## Typography
**Lexend** is the sole typeface for this design system. Its geometric construction ensures high legibility for both French and Arabic scripts, which is vital for a conversational commerce app.

- **Headlines:** Use Bold or Semi-Bold weights for clear hierarchy during product discovery.
- **Body:** Use the Regular weight (400) for chat messages to ensure the text doesn't feel cramped in narrow bubbles.
- **Labels:** Use Medium or Semi-Bold for buttons and tags to distinguish them clearly from conversational text.

## Layout & Spacing
This design system is optimized for **one-handed mobile use** on mid-range Android devices. 

- **Grid:** A standard 4-column fluid mobile grid with 16px side margins.
- **Safe Zones:** 24px vertical spacing between distinct chat clusters; 8px spacing between consecutive bubbles from the same sender.
- **Interactions:** Touch targets (buttons, icons) must be at least 48x48dp.
- **Chat Input:** Fixed to the bottom, floating slightly above the navigation bar to stay within the "Natural Thumb Zone."

## Elevation & Depth
Depth is created through **Tonal Layering** rather than heavy shadows to maintain clarity in high-glare environments.

- **Level 0 (Base):** Sand (#F9F7F2) background.
- **Level 1 (Chat/Cards):** Subtle contrast backgrounds (Sage-tinted Bone) with 1px low-opacity borders (#2D2926 at 5%).
- **Level 2 (Modals/Overlays):** Used for Order Confirmation, featuring a soft 15% opacity Charcoal shadow with a 20px blur to draw focus.
- **Active States:** Elements physically depress (scale 0.98) when tapped to provide tactile feedback.

## Shapes
The shape language is approachable and soft, avoiding sharp corners that feel clinical.

- **Chat Bubbles:** 12px radius. User bubbles are anchored to the right with the bottom-right corner slightly more acute (4px) to indicate direction. Assistant bubbles are anchored left with a similar treatment on the bottom-left.
- **Cards & Confirmation Blocks:** 16px radius.
- **Interactive Elements:** Buttons utilize the 12px "Soft" radius to match input fields, creating a unified look within the chat container.

## Components
### AI Chat Interface
- **User Bubbles:** Terracotta background, White text. High contrast for clear ownership.
- **Assistant Bubbles:** Surface-Sage background, Charcoal text.
- **Thinking State:** Three pulsating dots in Sage.

### Order Confirmation Card
- **Structure:** Inside the chat thread. Contains product thumbnail (left), Price and Name (right), and a "Paiement à la livraison" (COD) badge.
- **Actions:** Two full-width stacked buttons. 'Confirmer' (Terracotta, Solid) and 'Annuler' (Ghost style, Charcoal outline).

### COD Badge
- **Style:** Saffron background with Charcoal text. Uses a small "check" icon to signify the security of paying upon receipt.

### Navigation
- **Bottom Tab Bar:** 64dp height. Active icons use Terracotta; inactive icons use a 40% Charcoal tint. Labels are mandatory for accessibility.

### Input Fields
- **Chat Input:** 12px rounded, white background, with a prominent "Send" icon in Terracotta.