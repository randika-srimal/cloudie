# The Flutter toolbox for mobile/ (Android now, iOS needs a Mac): Flutter SDK, Android SDK and a JDK.
# ./cli.sh app <command> runs docker/app.sh in it and throws the container away afterwards, so your
# computer only needs Docker. Built once (a few minutes, ~3 GB); rebuild with ./cli.sh app image.
FROM eclipse-temurin:21-jdk-noble

ARG FLUTTER_VERSION=3.50.0
ARG FLUTTER_SHA256=6ea2d806fd57269ae783e6788e2a81fc26eaad782f1e0d0ff38623bb765ff9f5
ARG ANDROID_CMDLINE_TOOLS=16111833

# git, unzip, xz: Flutter itself. qrencode: the QR code `app share` prints. iproute2: finds the LAN address.
RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl unzip xz-utils zip ca-certificates qrencode iproute2 \
 && rm -rf /var/lib/apt/lists/*

ENV ANDROID_HOME=/opt/android-sdk \
    FLUTTER_HOME=/opt/flutter \
    PUB_CACHE=/root/.pub-cache \
    GRADLE_USER_HOME=/root/.gradle \
    FLUTTER_SUPPRESS_ANALYTICS=true
ENV PATH="$FLUTTER_HOME/bin:$FLUTTER_HOME/bin/cache/dart-sdk/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# Android command-line tools (sdkmanager), then the packages every build needs. Anything else a build asks
# for (a newer platform, NDK, CMake) Gradle downloads by itself into $ANDROID_HOME, which docker-compose.yml
# keeps in a volume, so it is fetched once.
RUN mkdir -p "$ANDROID_HOME/cmdline-tools" \
 && curl -fsSLo /tmp/tools.zip "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS}_latest.zip" \
 && unzip -q /tmp/tools.zip -d "$ANDROID_HOME/cmdline-tools" \
 && mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest" \
 && rm /tmp/tools.zip \
 && yes | sdkmanager --licenses >/dev/null \
 && sdkmanager --install "platform-tools" "platforms;android-36" "build-tools;36.0.0" "build-tools;36.1.0" "ndk;28.2.13676358" >/dev/null

# Flutter SDK from the official release archive, checked against its published SHA-256.
RUN curl -fsSLo /tmp/flutter.tar.xz \
      "https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz" \
 && echo "${FLUTTER_SHA256}  /tmp/flutter.tar.xz" | sha256sum -c - \
 && tar -xJf /tmp/flutter.tar.xz -C /opt \
 && rm /tmp/flutter.tar.xz \
 && git config --global --add safe.directory '*' \
 && flutter config --no-analytics --no-cli-animations >/dev/null \
 && dart --disable-analytics >/dev/null \
 && flutter precache --android \
 && flutter --version

WORKDIR /app/mobile
