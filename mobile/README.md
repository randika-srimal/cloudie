# Cloudie mobile app

One Flutter project for Android and iOS, talking to the same `/api` routes as the website.

Everything runs through the project CLI from the repo root, in the Flutter container (no Flutter install needed):

```bash
./cli.sh app apk --local   # debug APK against the dev stack on this computer
./cli.sh app share         # QR code to install it on a phone on the same Wi-Fi
./cli.sh app test          # tests
./cli.sh app analyze       # static analysis
```

Full guide, including releasing to Google Play and building for iOS on a Mac: [docs/guide/mobile.md](../docs/guide/mobile.md).
