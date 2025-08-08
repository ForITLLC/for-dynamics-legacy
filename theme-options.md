# ForIT Dynamics 365 Theme Options

## Option 1: Dark Professional
```yaml
colors:
  primary: "#1E1E1E"        # Near black
  secondary: "#00D4AA"      # Teal accent
  navbarBackground: "#2D2D30"
  surface: "#252526"
  background: "#1E1E1E"
  text:
    primary: "#FFFFFF"
    secondary: "#CCCCCC"
```

## Option 2: Modern Purple
```yaml
colors:
  primary: "#6B46C1"        # Purple
  secondary: "#EC4899"      # Pink accent  
  navbarBackground: "#7C3AED"
  surface: "#FFFFFF"
  background: "#F9FAFB"
  text:
    primary: "#111827"
    secondary: "#6B7280"
```

## Option 3: Ocean Blue
```yaml
colors:
  primary: "#0EA5E9"        # Sky blue
  secondary: "#06B6D4"      # Cyan
  navbarBackground: "#0284C7"
  surface: "#FFFFFF"
  background: "#F0F9FF"
  text:
    primary: "#0C4A6E"
    secondary: "#64748B"
```

## Option 4: Forest Green
```yaml
colors:
  primary: "#059669"        # Emerald
  secondary: "#34D399"      # Light green
  navbarBackground: "#047857"
  surface: "#FFFFFF"
  background: "#ECFDF5"
  text:
    primary: "#064E3B"
    secondary: "#6B7280"
```

## Option 5: Sunset Orange
```yaml
colors:
  primary: "#EA580C"        # Orange
  secondary: "#FB923C"      # Light orange
  navbarBackground: "#DC2626"
  surface: "#FFFFFF"
  background: "#FFF7ED"
  text:
    primary: "#7C2D12"
    secondary: "#92400E"
```

## Option 6: Monochrome Minimal
```yaml
colors:
  primary: "#000000"        # Black
  secondary: "#6B7280"      # Gray
  navbarBackground: "#111827"
  surface: "#FFFFFF"
  background: "#F9FAFB"
  text:
    primary: "#000000"
    secondary: "#4B5563"
```

## Custom Brand Colors

To use your specific brand colors, provide:
- Primary brand color (main theme color)
- Secondary/accent color (highlights, buttons)
- Success color (positive actions)
- Warning color (alerts)
- Error color (errors/required fields)

## Theme Elements We'll Customize

### 1. Navigation Bar
- Background color and gradient
- Menu item hover effects
- Active item indicators
- Logo placement and size

### 2. Forms & Fields
- Section headers styling
- Field borders and focus states
- Required field indicators
- Button styles (primary, secondary)

### 3. Grids & Lists
- Header row styling
- Alternating row colors
- Hover effects
- Selection highlighting

### 4. Dashboards
- Card backgrounds and shadows
- Chart color palettes
- Widget borders
- KPI indicators

### 5. Typography
- Font family (can use custom fonts)
- Font sizes and weights
- Line height and spacing
- Text colors for different states

### 6. Interactive Elements
- Button hover/active states
- Link colors and underlines
- Loading spinners
- Progress indicators
- Tooltips and popovers

## Advanced Customizations

### Gradients
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Shadows & Depth
```css
box-shadow: 0 10px 30px rgba(0,0,0,0.1);
```

### Animations
```css
transition: all 0.3s ease;
transform: translateY(-2px);
```

### Custom Fonts
Can import Google Fonts or use custom font files:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

## Quick Apply

To apply any theme option:
1. Choose your preferred option number (1-6)
2. I'll update both `customizations.yaml` and `custom.css`
3. Run `npm run validate` to check
4. Deploy with `npm run deploy-theme`

Which theme would you like to apply, or would you like a custom design?