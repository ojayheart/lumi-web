# Aro-Ha AI Assistant Widget - Embed Instructions

## Quick Setup

Add this single line to your website's HTML (in the `<head>` or before closing `</body>` tag):

```html
<script src="https://arohaunifiedchat.replit.app/embed.js"></script>
```

That's it! The widget will automatically appear on your site.

## What You Get

- **Auto-updating widget** - Always get the latest features without manual updates
- **Voice & text chat** - Dual-mode AI assistant with microphone permission handling
- **Mobile optimized** - Fullscreen experience on mobile devices
- **Safe area support** - Works perfectly on devices with notches
- **Zero maintenance** - Set it once and it works forever

## Implementation Examples

### Basic HTML Website
```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Website</title>
    <!-- Add the widget script -->
    <script src="https://arohaunifiedchat.replit.app/embed.js"></script>
</head>
<body>
    <!-- Your website content -->
</body>
</html>
```

### WordPress (in footer.php or via Custom HTML widget)
```html
<script src="https://arohaunifiedchat.replit.app/embed.js"></script>
```

### Webflow (in Site Settings > Custom Code > Footer Code)
```html
<script src="https://arohaunifiedchat.replit.app/embed.js"></script>
```

### Shopify (in theme.liquid before closing </body> tag)
```html
<script src="https://arohaunifiedchat.replit.app/embed.js"></script>
```

## Customization

The widget uses CSS custom properties that you can override:

```css
:root {
  --aro-primary: #8E8F70;      /* Button color */
  --aro-button-size: 60px;     /* Button size */
}
```

## Technical Details

- **Endpoints:**
  - `/embed.js` - Lightweight loader (cached 24 hours)
  - `/widget-script.js` - Full implementation (cached 5 minutes)
- **Performance:** Minimal impact, loads asynchronously
- **Security:** CORS-enabled, runs in isolated context
- **Compatibility:** Works on all modern browsers

## Support

For technical support or customization requests, contact the Aro-Ha development team.