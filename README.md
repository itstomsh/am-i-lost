# Am I Lost?

A privacy-friendly QR card and tag generator for lost items.

Create printable cards, keychain tags, or compact QR labels that help someone
contact you when they find your item. Everything runs in the browser.

Use the app: https://itstomsh.github.io/am-i-lost/

## Features

- Wallet Card, Keychain, and Compact formats
- Custom title, label, message, and thank-you text
- Resizable card dimensions in millimeters
- Solid or transparent background
- Palettes for light, dark, colored, or high-contrast materials
- QR codes for email, phone, WhatsApp, or a website
- Optional contact text below the QR code
- Exact QR target preview
- Multiple copies on an A4 sheet
- Optional cut lines and spacing between copies
- PNG and SVG export
- Browser print / save as PDF support
- Multilingual interface
- Local-only data handling with no backend
- Settings saved locally in the browser

## Privacy

The contact value is encoded directly into the QR code. Anyone who scans the QR
can see or open that contact target. The app does not send contact data to a
server and does not use a database.

## Using With Custom Items

The generated PNG or SVG can be used beyond ordinary paper printing. You can
upload the exported artwork to custom print services, sticker makers, or product
marketplaces that offer blank/custom keychains, wallet cards, luggage tags, or
similar items.

Useful search terms:

- `custom QR keychain`
- `custom engraved keychain`
- `custom wallet card`
- `custom NFC QR card`
- `blank plastic wallet cards`
- `custom luggage tag`
- `custom pet tag`

For dark or metal materials, choose a palette with light text and a strong QR
frame. For white cards or stickers, use the light palette. Use transparent
background when the service already provides the material color and you only
want to place the text and QR artwork on top.

Always test the QR code with a phone before ordering custom items.

## Development

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Vite will print a local development URL, usually:

```text
http://localhost:5173
```

## Build

```bash
npm run build
npm run preview
```

The production build is generated in `dist/`.

## GitHub Pages

This project includes a GitHub Actions workflow for GitHub Pages:

```text
.github/workflows/deploy.yml
```

To deploy from GitHub:

1. Push the project to a GitHub repository.
2. Open the repository settings.
3. Go to **Pages**.
4. Set **Build and deployment** to **GitHub Actions**.
5. Run or wait for the **Deploy GitHub Pages** workflow.

For a repository named `am-i-lost`, the deployed project URL usually looks like:

```text
https://YOUR_USERNAME.github.io/am-i-lost/
```

The GitHub link in `index.html` points to:

```html
href="https://github.com/YOUR_USERNAME/am-i-lost"
```

This repository is currently configured for:

```text
https://itstomsh.github.io/am-i-lost/
https://github.com/itstomsh/am-i-lost
```

## License

MIT. See `LICENSE`.
