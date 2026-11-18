// The Cloudie app for Android and iOS. One Flutter project; platform folders are android/ and ios/.
import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import 'features/home/home_page.dart';

void main() => runApp(const CloudieApp());

/// Screens live in `lib/features/<name>/`; add a GoRoute per screen.
final router = GoRouter(
  routes: [GoRoute(path: '/', builder: (context, state) => const HomePage())],
);

class CloudieApp extends StatelessWidget {
  const CloudieApp({super.key});

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFFE8762D); // the web app's --color-brand
    return MaterialApp.router(
      title: 'Cloudie',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: seed),
      darkTheme: ThemeData(colorSchemeSeed: seed, brightness: Brightness.dark),
      routerConfig: router,
    );
  }
}
