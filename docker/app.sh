#!/usr/bin/env bash
# The mobile app's commands, run inside the Flutter container by ./cli.sh app <command>. See docs/guide/mobile.md.
#
# Debug builds talk to:
#   (default)  the deployed site (APP_URL, or https://cloudie.pages.dev)
#   --local    the dev stack on this computer, over Wi-Fi: http://<LAN address>:8788 (docker compose up -d)
#   --usb      the dev stack through the USB cable: http://localhost:8788 with `adb reverse`
#
# iOS builds need macOS with Xcode, so there is no iOS command here: see docs/guide/mobile.md.
set -euo pipefail
cd /app/mobile

OUT=/app/mobile/out
APK="$OUT/cloudie-debug.apk"
APP_ID=com.area51projects.cloudie
SHARE_PORT="${SHARE_PORT:-8790}"
DEV_PORT="${DEV_PORT:-8788}"

say()  { printf '\033[1;32m==> %s\033[0m\n' "$*"; }
info() { printf '%s\n' "$*"; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# Files written here belong to root; hand mobile/ back to the person who ran ./cli.sh.
give_back() { chown -R "${HOST_UID:-1000}:${HOST_GID:-1000}" /app/mobile 2>/dev/null || true; }
trap give_back EXIT

# This computer's address on the Wi-Fi. ./cli.sh works it out on the computer itself and passes LAN_IP: inside Docker
# Desktop's VM, the container would only see the VM's own address, which phones cannot reach.
lan_ip() { [ -n "${LAN_IP:-}" ] && { printf '%s' "$LAN_IP"; return; }; ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}'; }

deployed_origin() { printf '%s' "${APP_URL:-https://cloudie.pages.dev}" | sed 's#/*$##'; }

# --local | --usb | (nothing) -> the API origin for this build. --usb also sets up adb reverse.
api_origin() {
  case "${1:-}" in
    --local)
      local ip; ip="$(lan_ip)"; [ -n "$ip" ] || die "Could not find this computer's LAN address."
      printf 'http://%s:%s' "$ip" "$DEV_PORT" ;;
    --usb)
      adb reverse "tcp:$DEV_PORT" "tcp:$DEV_PORT" >/dev/null || die "adb reverse failed: is the phone connected (adb devices on this computer)?"
      printf 'http://localhost:%s' "$DEV_PORT" ;;
    "") deployed_origin ;;
    *) die "Unknown option $1 (use --local or --usb)" ;;
  esac
}

need_project() { [ -f pubspec.yaml ] || die "No Flutter project in mobile/ yet: run ./cli.sh app create."; }
need_adb() {
  adb start-server >/dev/null 2>&1 || true
  if ! adb devices 2>/dev/null | awk 'NR > 1 && $2 == "device"' | grep -q .; then
    die "No phone found over adb. Plug it in with USB debugging on, then on this computer run 'adb kill-server; adb -a start-server' (the container uses this computer's adb server, so it must listen beyond localhost) and check 'adb devices'. Or use './cli.sh app share' to install from a QR code instead."
  fi
}
version_info() { grep -E '^version:' pubspec.yaml | awk '{print $2}'; }

cmd="${1:-help}"; shift || true
case "$cmd" in
  apk)
    need_project
    origin="$(api_origin "${1:-}")"
    say "Building the debug APK (API: $origin)"
    flutter pub get >/dev/null
    flutter build apk --debug --dart-define=API_ORIGIN="$origin" --dart-define=BUILD_LABEL="debug $(date +%Y-%m-%d\ %H:%M)"
    mkdir -p "$OUT"
    cp build/app/outputs/flutter-apk/app-debug.apk "$APK"
    printf '%s\n' "$origin" > "$OUT/api-origin.txt"
    say "Ready: mobile/out/cloudie-debug.apk ($(du -h "$APK" | cut -f1)), version $(version_info)"
    info "Next: ./cli.sh app share (QR code for the phone) or ./cli.sh app install (USB)."
    [ "${1:-}" = "--local" ] && info "The phone must be on the same Wi-Fi as this computer, and the dev stack must be running." || true ;;

  share)  # prints the QR code; ./cli.sh then serves mobile/out/ from the share service (a published port)
    [ -f "$APK" ] || die "No debug APK yet. Run ./cli.sh app apk first."
    ip="$(lan_ip)"; [ -n "$ip" ] || die "Could not find this computer's LAN address."
    url="http://$ip:$SHARE_PORT/cloudie-debug.apk"
    say "Scan this on the phone (same Wi-Fi) to download the debug APK, then open it to install"
    qrencode -t ANSIUTF8 -m 2 "$url"
    info "$url"
    info "Built for API: $(cat "$OUT/api-origin.txt" 2>/dev/null || echo unknown)"
    info "The first time, Android asks to allow installing apps from your browser. Press Ctrl+C here when done." ;;

  install)
    [ -f "$APK" ] || die "No debug APK yet. Run ./cli.sh app apk first."
    need_adb
    say "Installing on $(adb devices | awk 'NR > 1 && $2 == "device" {print $1}' | head -1)"
    adb install -r "$APK"
    adb shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true ;;

  run)
    need_project; need_adb
    origin="$(api_origin "${1:-}")"
    say "flutter run (API: $origin). r = hot reload, R = restart, q = quit"
    flutter run --dart-define=API_ORIGIN="$origin" --dart-define=BUILD_LABEL="flutter run" ;;

  test)
    need_project
    flutter pub get >/dev/null
    flutter test "$@" ;;

  analyze)
    need_project
    flutter pub get >/dev/null
    flutter analyze "$@" ;;

  build)
    need_project
    [ -f android/key.properties ] || die "No signing key set up: see 'Releasing to Google Play' in docs/guide/mobile.md (mobile/android/key.properties)."
    origin="$(deployed_origin)"
    say "Building the release bundle and APK (API: $origin)"
    flutter pub get >/dev/null
    flutter build appbundle --release --dart-define=API_ORIGIN="$origin"
    flutter build apk --release --dart-define=API_ORIGIN="$origin"
    mkdir -p "$OUT"
    cp build/app/outputs/bundle/release/app-release.aab "$OUT/cloudie-$(version_info).aab"
    cp build/app/outputs/flutter-apk/app-release.apk "$OUT/cloudie-$(version_info).apk"
    say "Ready in mobile/out/: cloudie-$(version_info).aab (upload this to Google Play) and .apk" ;;

  icons)
    need_project
    flutter pub get >/dev/null
    dart run flutter_launcher_icons
    dart run flutter_native_splash:create ;;

  create)  # once: generates the platform folders; lib/, test/ and pubspec.yaml are already in the repo
    [ -d android ] && die "mobile/android already exists."
    flutter create --org com.area51projects --project-name cloudie --platforms=android,ios --no-pub . ;;

  shell) exec bash ;;

  *) die "app apk [--local|--usb] | share | install | run [--local|--usb] | test | analyze | build | icons | create | shell | image" ;;
esac
