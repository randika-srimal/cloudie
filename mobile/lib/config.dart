// Build settings, set by ./cli.sh app apk|run|build with --dart-define (docker/app.sh).

/// The site the app talks to. Release builds use the deployed site.
const apiOrigin = String.fromEnvironment('API_ORIGIN', defaultValue: 'https://cloudie.pages.dev');

/// Shown on debug builds, so it is clear which build and backend a phone runs.
const buildLabel = String.fromEnvironment('BUILD_LABEL');

/// The Android applicationId and iOS bundle id. It can never change once the app is in a store.
const appId = 'com.area51projects.cloudie';

/// Sent with every API call as X-Client, so server logs can tell the app from the website.
const clientName = 'cloudie-app/0.1.0';

Uri apiUri(String path) => Uri.parse(apiOrigin + path);
