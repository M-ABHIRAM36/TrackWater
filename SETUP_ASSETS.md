# Asset Setup Instructions

## Audio Files Required

### Alert Sound (`frontend/public/sounds/alert.mp3`)
You need to add a 10-second water alert sound. Here are some options:

1. **Free Sound Sources:**
   - [Freesound.org](https://freesound.org) - Search for "water drop", "bell", or "notification"
   - [Zapsplat](https://zapsplat.com) - High-quality sound effects
   - [BBC Sound Effects](https://github.com/bbcsfx/bbcsfx) - Free BBC sound library

2. **Recommended Sound Types:**
   - Gentle water droplet sounds
   - Soft bell chimes
   - Pleasant notification tones
   - Nature sounds (rain, stream)

3. **Audio Specifications:**
   - Format: MP3
   - Duration: ~10 seconds (will auto-stop)
   - Quality: 128kbps is sufficient
   - Volume: Medium level (app will set to 50%)

## Icon Files Required

Create the following icon files in `frontend/public/`:

### Required Icons:
- `icon-72x72.png` (72x72px)
- `icon-96x96.png` (96x96px)
- `icon-128x128.png` (128x128px)
- `icon-144x144.png` (144x144px)
- `icon-152x152.png` (152x152px)
- `icon-192x192.png` (192x192px)
- `icon-384x384.png` (384x384px)
- `icon-512x512.png` (512x512px)
- `badge-72x72.png` (72x72px notification badge)
- `droplet.svg` (favicon)

### Icon Design Guidelines:
- **Theme**: Water droplet or glass of water
- **Colors**: Blue/cyan theme (#0ea5e9)
- **Style**: Modern, clean, simple
- **Background**: Transparent or solid color
- **Format**: PNG for raster, SVG for vector

### Quick Icon Generation:
1. **Online Tools:**
   - [Favicon.io](https://favicon.io/favicon-generator/)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)
   - [PWA Builder](https://www.pwabuilder.com/imageGenerator)

2. **Icon Libraries:**
   - [Heroicons](https://heroicons.com/) - Search "beaker" or custom water icons
   - [Feather Icons](https://feathericons.com/)
   - [Tabler Icons](https://tabler-icons.io/)

3. **Custom Design:**
   - Use Figma, Adobe Illustrator, or Canva
   - Water droplet emoji: 💧 (can convert to icon)
   - Simple glass or bottle silhouette

## Quick Setup Commands

```bash
# Create directories
mkdir -p frontend/public/sounds
mkdir -p frontend/public/icons

# Download a free water sound (example using curl)
# Replace with actual URL from freesound.org or similar
curl -o frontend/public/sounds/alert.mp3 "YOUR_SOUND_URL_HERE"

# Create a simple SVG favicon (if you don't have one)
echo '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#0ea5e9"/><text x="50" y="55" text-anchor="middle" fill="white" font-size="30">💧</text></svg>' > frontend/public/droplet.svg
```

## Alternative: Skip Assets for Testing

If you want to test the app without assets:

1. Comment out audio-related code in `AudioAlert.jsx`
2. Use emoji as temporary icons in the manifest
3. The app will work without sounds/icons but notifications won't be optimal

## Verification

After adding assets, verify:
- Audio plays when you click a test notification
- PWA install prompt works
- App icons appear correctly in browser tabs
- Notifications show proper icons

The app will function without these assets, but the full experience requires them.
